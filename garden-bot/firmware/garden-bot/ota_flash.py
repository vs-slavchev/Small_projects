#!/usr/bin/env python3
"""OTA firmware updater for the garden-bot (NimBLEOta BLE protocol).

Replaces nimbleota.py from h2zero/NimBLEOta with built-in retry, timeouts,
and per-sector progress output.

Assumes the device is already bonded. Run read_logs.py once to pair first;
the bond persists in both BlueZ and the ESP32's NVS flash across deep-sleep
cycles, so you only need to do this once per laptop/device pair (or after
either side's bonding info gets reset).

Usage:
    python ota_flash.py firmware.bin [MAC_ADDRESS] [--name DEVICE_NAME]
    python ota_flash.py firmware.bin AA:BB:CC:DD:EE:FF   # skips scan, faster

Requires: pip install bleak
"""
import asyncio
import argparse
import os
import sys
import time

from bleak import BleakClient, BleakScanner

# NimBLEOta protocol UUIDs (16-bit 0x8018/0x8022/0x8020 in Bluetooth Base UUID form)
OTA_SERVICE_UUID  = "00008018-0000-1000-8000-00805f9b34fb"
OTA_COMMAND_UUID  = "00008022-0000-1000-8000-00805f9b34fb"
OTA_FIRMWARE_UUID = "00008020-0000-1000-8000-00805f9b34fb"

# Protocol constants
START_COMMAND       = 0x0001
ACK_ACCEPTED        = 0x0000
FW_ACK_SUCCESS      = 0x0000
FW_ACK_CRC_ERROR    = 0x0001
FW_ACK_SECTOR_ERROR = 0x0002
FW_ACK_LEN_ERROR    = 0x0003
RSP_CRC_ERROR       = 0xFFFF

SECTOR_SIZE         = 4096  # firmware bytes per sector; 2 CRC bytes appended on wire
SCAN_WINDOW_S       = 5     # scan duration per attempt when no MAC is given
RETRY_DELAY_S       = 2     # pause between failed attempts
# The device ACKs a START within milliseconds when it's actually processing
# it, so a long wait here only wastes a whole wake window when the write got
# lost (BLE starved by WiFi during connectWiFi/connectAWS, or the device
# slept). Keep it short so a failed attempt recycles fast into the next one.
START_ACK_TIMEOUT_S = 12
# Once firmware is flowing the device is dedicated to OTA (WiFi is off by
# then), so per-sector ACKs can afford a longer ceiling.
NOTIFY_TIMEOUT_S    = 30

DEFAULT_DEVICE_NAME = "cherry-2-pot"  # BOT_NAME in config.h


def ts():
    return time.strftime("%H:%M:%S")


def crc16_ccitt(buf):
    crc = 0
    for byte in buf:
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if crc & 0x8000 else (crc << 1)
            crc &= 0xFFFF
    return crc


def load_firmware(path):
    """Split firmware into sectors, each with its CRC16-CCITT appended."""
    file_size = os.path.getsize(path)
    sectors = []
    with open(path, "rb") as f:
        while chunk := f.read(SECTOR_SIZE):
            sectors.append(chunk + crc16_ccitt(chunk).to_bytes(2, "little"))
    return file_size & 0xFFFFFFFF, sectors


def _parse_cmd_notify(data):
    """Return the rsp field from a command notification, or RSP_CRC_ERROR."""
    if len(data) != 20:
        return RSP_CRC_ERROR
    if crc16_ccitt(data[0:18]) != int.from_bytes(data[18:20], "little"):
        print(f"[{ts()}] Command notification CRC mismatch")
        return RSP_CRC_ERROR
    return int.from_bytes(data[4:6], "little")


def _parse_fw_notify(data):
    """Return (status, rsp_sector) from a firmware notification, or (RSP_CRC_ERROR, 0)."""
    if len(data) != 20:
        return RSP_CRC_ERROR, 0
    if crc16_ccitt(data[0:18]) != int.from_bytes(data[18:20], "little"):
        print(f"[{ts()}] Firmware notification CRC mismatch")
        return RSP_CRC_ERROR, 0
    return int.from_bytes(data[2:4], "little"), int.from_bytes(data[4:6], "little")


async def _ensure_mtu(client):
    """Best-effort MTU negotiation on the BlueZ backend.

    bleak's BlueZ backend doesn't request an MTU exchange on its own, so
    client.mtu_size stays at the 23-byte ATT default and warns. The private
    _acquire_mtu() triggers the exchange; it doesn't exist on other backends
    (macOS/Windows negotiate automatically), so failure here is harmless.
    """
    if client.mtu_size > 23:
        return
    backend = getattr(client, "_backend", None)
    acquire = getattr(backend, "_acquire_mtu", None)
    if acquire is None:
        return
    try:
        await acquire()
    except Exception as e:
        print(f"[{ts()}] MTU negotiation skipped ({e}); continuing at MTU={client.mtu_size}")


async def _upload_sector(client, sector, wire_idx):
    """Send one sector's bytes in MTU-sized chunks."""
    max_data = min(512, client.mtu_size - 3) - 3  # -3 BLE overhead, -3 packet header
    chunks = [sector[i:i + max_data] for i in range(0, len(sector), max_data)]
    for seq, chunk in enumerate(chunks):
        seq_byte = 0xFF if seq == len(chunks) - 1 else seq  # 0xFF marks last chunk of sector
        pkt = wire_idx.to_bytes(2, "little") + bytes([seq_byte]) + chunk
        await client.write_gatt_char(OTA_FIRMWARE_UUID, pkt, response=False)


async def run_ota(client, file_size, sectors):
    """Execute the full OTA transfer on an already-connected client.

    Returns True on success, False if the transfer should be retried.
    """
    cmd_q = asyncio.Queue()
    fw_q  = asyncio.Queue()

    await client.start_notify(OTA_COMMAND_UUID,
                              lambda _s, d: cmd_q.put_nowait(_parse_cmd_notify(d)))

    # Send START with file size
    cmd = bytearray(20)
    cmd[0:2] = START_COMMAND.to_bytes(2, "little")
    cmd[2:6] = file_size.to_bytes(4, "little")
    cmd[18:20] = crc16_ccitt(cmd[0:18]).to_bytes(2, "little")
    print(f"[{ts()}] Sending start command ({file_size / 1024:.1f} KB, {len(sectors)} sectors)...")
    await client.write_gatt_char(OTA_COMMAND_UUID, cmd)

    try:
        ack = await asyncio.wait_for(cmd_q.get(), timeout=START_ACK_TIMEOUT_S)
    except asyncio.TimeoutError:
        if not client.is_connected:
            print(f"[{ts()}] No start ACK — link dropped (device slept / lost connection), will retry")
        else:
            print(f"[{ts()}] No start ACK in {START_ACK_TIMEOUT_S}s but still connected — the START "
                  f"likely got starved by WiFi/BLE contention (device busy in connectWiFi/AWS). Retrying")
        return False

    if ack != ACK_ACCEPTED:
        print(f"[{ts()}] Start rejected (ack={ack:#06x})")
        return False

    await client.start_notify(OTA_FIRMWARE_UUID,
                              lambda _s, d: fw_q.put_nowait(_parse_fw_notify(d)))

    sec_count = len(sectors)
    sec_idx   = 0
    t0        = time.time()

    while sec_idx < sec_count:
        sector   = sectors[sec_idx]
        is_last  = sec_idx == sec_count - 1
        wire_idx = 0xFFFF if is_last else sec_idx

        await _upload_sector(client, sector, wire_idx)

        try:
            status, rsp_sector = await asyncio.wait_for(fw_q.get(), timeout=NOTIFY_TIMEOUT_S)
        except asyncio.TimeoutError:
            print(f"[{ts()}] Timed out waiting for sector {sec_idx} ACK — will retry attempt")
            return False

        if status == FW_ACK_SUCCESS:
            bytes_done = min((sec_idx + 1) * SECTOR_SIZE, file_size)
            elapsed    = max(time.time() - t0, 0.001)
            pct        = (sec_idx + 1) / sec_count * 100
            speed      = bytes_done / elapsed / 1024
            print(f"[{ts()}]  {pct:5.1f}%  sector {sec_idx + 1}/{sec_count}"
                  f"  {bytes_done // 1024}/{file_size // 1024} KB"
                  f"  {speed:.1f} KB/s")
            sec_idx += 1

        elif status in (FW_ACK_CRC_ERROR, FW_ACK_LEN_ERROR, RSP_CRC_ERROR):
            label = {FW_ACK_CRC_ERROR: "CRC", FW_ACK_LEN_ERROR: "LEN",
                     RSP_CRC_ERROR: "RSP_CRC"}.get(status, "ERR")
            print(f"[{ts()}] Sector {sec_idx} {label} error — retrying sector")

        elif status == FW_ACK_SECTOR_ERROR:
            print(f"[{ts()}] Sector error, jumping to sector {rsp_sector}")
            sec_idx = rsp_sector

        else:
            print(f"[{ts()}] Unknown error {status:#06x} on sector {sec_idx}, aborting")
            return False

    elapsed = max(time.time() - t0, 0.001)
    print(f"[{ts()}] Transfer complete — {file_size // 1024} KB"
          f" in {elapsed:.1f}s ({file_size / elapsed / 1024:.1f} KB/s)")
    print(f"[{ts()}] Device is rebooting into new firmware.")
    return True


async def main(firmware_path, mac, name):
    file_size, sectors = load_firmware(firmware_path)
    print(f"[{ts()}] Firmware: {firmware_path} ({file_size // 1024} KB, {len(sectors)} sectors)")
    print(f"[{ts()}] Target: {mac or repr(name)}")
    print(f"[{ts()}] Tip: device must be bonded first — run read_logs.py --passkey XXXXXX once if pairing hasn't been done")
    print()

    attempt = 0
    while True:
        attempt += 1

        if mac:
            address = mac
            print(f"[{ts()}] === Attempt #{attempt}: connecting to {address} ===")
        else:
            print(f"[{ts()}] === Attempt #{attempt}: scanning for {name!r} ===")
            device = await BleakScanner.find_device_by_name(name, timeout=SCAN_WINDOW_S)
            if not device:
                print(f"[{ts()}] Not found (device may be sleeping), retrying in {RETRY_DELAY_S}s...")
                await asyncio.sleep(RETRY_DELAY_S)
                continue
            address = device.address
            print(f"[{ts()}] Found: {device.address}")

        def on_disconnect(_c):
            print(f"[{ts()}] Link dropped by device (deep sleep or supervision timeout)")

        try:
            async with BleakClient(address, disconnected_callback=on_disconnect) as client:
                print(f"[{ts()}] Connected")

                # The OTA characteristics require an encrypted link (the
                # firmware sets setSecurityAuth + READ_ENC), so establish
                # pairing before touching them - otherwise writes are
                # silently ignored and the START ACK never arrives. The
                # device is expected to be bonded already (via read_logs.py),
                # so this just re-establishes encryption from the stored bond.
                try:
                    await client.pair()
                except NotImplementedError:
                    pass  # macOS pairs at the OS level automatically

                # BlueZ leaves the MTU at the 23-byte default until it's
                # explicitly negotiated; without this every firmware packet
                # carries only ~17 data bytes and the transfer crawls.
                await _ensure_mtu(client)
                print(f"[{ts()}] Ready (MTU={client.mtu_size})")

                if await run_ota(client, file_size, sectors):
                    return
        except Exception as e:
            print(f"[{ts()}] Connection/transfer error: {e}")

        print(f"[{ts()}] Attempt #{attempt} failed, retrying in {RETRY_DELAY_S}s (ctrl-c to stop)...")
        await asyncio.sleep(RETRY_DELAY_S)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("firmware",
                        help="Path to compiled .bin firmware file")
    parser.add_argument("mac_address", nargs="?",
                        help="Device MAC address — skips scan, faster connect")
    parser.add_argument("--name", default=DEFAULT_DEVICE_NAME,
                        help=f"Device name to scan for when no MAC is given "
                             f"(default: {DEFAULT_DEVICE_NAME!r})")
    args = parser.parse_args()

    if not os.path.isfile(args.firmware):
        sys.exit(f"File not found: {args.firmware}")

    try:
        asyncio.run(main(args.firmware, args.mac_address, args.name))
    except KeyboardInterrupt:
        print(f"\n[{ts()}] Stopped by user")
