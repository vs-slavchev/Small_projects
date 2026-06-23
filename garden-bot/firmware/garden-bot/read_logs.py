#!/usr/bin/env python3
"""Read the current wake cycle's log buffer from a garden-bot over BLE.

The device only advertises while awake (a few seconds every
SECONDS_TO_SLEEP, ~30 min) and the log is reset on every boot, so this
scans continuously and reads as soon as it sees the device.

Usage:
    python read_logs.py [device-name]

device-name defaults to BOT_NAME from config.h ("cherry-2-pot").

Requires: pip install bleak

Pairing: the log characteristic requires the same passkey-protected
pairing as OTA (see ble_service.cpp / OTA_BLE_PASSKEY in secrets.h).
bleak/BlueZ on Linux doesn't prompt for the passkey itself - pair once
ahead of time with bluetoothctl:
    bluetoothctl
    scan on                  # note the device's MAC, then:
    pair <MAC>                # enter OTA_BLE_PASSKEY when prompted
    trust <MAC>
On macOS/Windows the OS-level pairing prompt will ask for it directly.
"""
import asyncio
import logging
import sys

from bleak import BleakClient, BleakScanner

DEFAULT_DEVICE_NAME = "cherry-2-pot"  # BOT_NAME in config.h
# 16-bit UUIDs (LOG_SERVICE_UUID/LOG_CHAR_UUID = "FFA0"/"FFA1" in config.h)
# expanded into the standard Bluetooth Base UUID form bleak expects.
LOG_CHAR_UUID = "0000ffa1-0000-1000-8000-00805f9b34fb"
SCAN_TIMEOUT_S = 10

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s.%(msecs)03d [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
# bleak/bluez DBus chatter at DEBUG is mostly noise for this use case;
# keep our own logger verbose but quiet the library down to INFO.
logging.getLogger("bleak").setLevel(logging.INFO)
log = logging.getLogger("read_logs")


def on_disconnect(client: BleakClient) -> None:
    log.warning("Disconnected from %s", client.address)


async def find_device(name: str):
    log.info("Scanning for '%s' (device wakes every ~30 min, ctrl-c to stop)...", name)
    attempt = 0
    while True:
        attempt += 1
        log.debug("Scan attempt #%d (timeout %ds)", attempt, SCAN_TIMEOUT_S)
        device = await BleakScanner.find_device_by_name(name, timeout=SCAN_TIMEOUT_S)
        if device:
            log.info("Found device: address=%s", device.address)
            return device
        log.debug("Not seen yet, still scanning...")


async def read_logs(name: str):
    device = await find_device(name)
    log.info("Connecting to %s...", device.address)

    async with BleakClient(device, disconnected_callback=on_disconnect) as client:
        log.info("Connected: %s", client.is_connected)

        log.debug("Attempting to pair...")
        try:
            paired = await client.pair()
            log.info("Pairing result: %s", paired)
        except NotImplementedError:
            # macOS pairs at the OS level automatically; nothing to do here.
            log.debug("client.pair() not implemented on this platform, skipping (macOS pairs at OS level)")
        except Exception:
            log.exception("Pairing failed")
            raise

        log.debug("Reading characteristic %s...", LOG_CHAR_UUID)
        try:
            value = await client.read_gatt_char(LOG_CHAR_UUID)
        except Exception:
            log.exception("Read failed")
            raise

        log.info("Read %d bytes", len(value))
        text = value.decode("utf-8", errors="replace")
        print(text)


if __name__ == "__main__":
    device_name = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DEVICE_NAME
    try:
        asyncio.run(read_logs(device_name))
    except KeyboardInterrupt:
        log.info("Stopped by user")
