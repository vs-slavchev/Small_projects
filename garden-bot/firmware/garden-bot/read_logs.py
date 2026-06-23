#!/usr/bin/env python3
"""Read the current wake cycle's log buffer from a garden-bot over BLE.

The device only advertises while awake (a few seconds every
SECONDS_TO_SLEEP, ~30 min) and the log is reset on every boot, so this
scans continuously and reads as soon as it sees the device.

Usage:
    python read_logs.py [device-name] --passkey 123456
    OTA_BLE_PASSKEY=123456 python read_logs.py [device-name]

device-name defaults to BOT_NAME from config.h ("cherry-2-pot"). The
passkey must match OTA_BLE_PASSKEY in secrets.h.

Requires: pip install bleak dbus-next   (or dbus-fast, either works)

Pairing: the log characteristic requires the same passkey-protected
pairing as OTA (see ble_service.cpp). The ESP32's IO capability is
DisplayOnly + MITM required, so BlueZ needs an agent on this end to
supply the passkey when asked - without one (e.g. running this script
with no bluetoothctl session open) the request has nobody to answer and
BlueZ cancels authentication after its pairing timeout. This script
registers its own throwaway BlueZ agent for the duration of the run that
auto-answers with the configured passkey, so no bluetoothctl/manual
pairing step is needed.
"""
import argparse
import asyncio
import logging
import os
import sys

from bleak import BleakClient, BleakScanner

try:
    from dbus_fast import BusType
    from dbus_fast.aio import MessageBus
    from dbus_fast.service import ServiceInterface, method
except ImportError:
    from dbus_next import BusType
    from dbus_next.aio import MessageBus
    from dbus_next.service import ServiceInterface, method

DEFAULT_DEVICE_NAME = "cherry-2-pot"  # BOT_NAME in config.h
# 16-bit UUIDs (LOG_SERVICE_UUID/LOG_CHAR_UUID = "FFA0"/"FFA1" in config.h)
# expanded into the standard Bluetooth Base UUID form bleak expects.
LOG_CHAR_UUID = "0000ffa1-0000-1000-8000-00805f9b34fb"
SCAN_TIMEOUT_S = 10
AGENT_PATH = "/garden_bot/agent"

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s.%(msecs)03d [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
# bleak/bluez DBus chatter at DEBUG is mostly noise for this use case;
# keep our own logger verbose but quiet the library down to INFO.
logging.getLogger("bleak").setLevel(logging.INFO)
log = logging.getLogger("read_logs")


class PasskeyAgent(ServiceInterface):
    """Auto-answers BlueZ's pairing requests with the device's fixed passkey.

    Stands in for a human typing OTA_BLE_PASSKEY into a prompt - the ESP32
    side has no input either, so both ends just need to agree on the same
    pre-shared value.
    """

    def __init__(self, passkey: int):
        super().__init__("org.bluez.Agent1")
        self.passkey = passkey

    @method()
    def RequestPasskey(self, device: "o") -> "u":  # noqa: F821 (dbus type annotations)
        log.info("BlueZ requested a passkey for %s, supplying configured key", device)
        return self.passkey

    @method()
    def RequestConfirmation(self, device: "o", passkey: "u"):  # noqa: F821
        log.info("BlueZ asked to confirm passkey %06d for %s, auto-confirming", passkey, device)

    @method()
    def AuthorizeService(self, device: "o", uuid: "s"):  # noqa: F821
        log.debug("Auto-authorizing service %s for %s", uuid, device)

    @method()
    def Cancel(self):
        log.warning("BlueZ cancelled the pairing request")

    @method()
    def Release(self):
        log.debug("Agent released")


async def register_agent(passkey: int):
    bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
    agent = PasskeyAgent(passkey)
    bus.export(AGENT_PATH, agent)

    introspection = await bus.introspect("org.bluez", "/org/bluez")
    manager_obj = bus.get_proxy_object("org.bluez", "/org/bluez", introspection)
    agent_manager = manager_obj.get_interface("org.bluez.AgentManager1")

    await agent_manager.call_register_agent(AGENT_PATH, "KeyboardOnly")
    await agent_manager.call_request_default_agent(AGENT_PATH)
    log.info("Registered BlueZ pairing agent (auto-answers with configured passkey)")
    return bus, agent_manager


async def unregister_agent(bus, agent_manager):
    try:
        await agent_manager.call_unregister_agent(AGENT_PATH)
    except Exception:
        log.exception("Failed to unregister BlueZ agent (non-fatal)")
    bus.disconnect()


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


async def read_logs(name: str, passkey: int):
    bus, agent_manager = await register_agent(passkey)
    try:
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
    finally:
        await unregister_agent(bus, agent_manager)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("device_name", nargs="?", default=DEFAULT_DEVICE_NAME)
    parser.add_argument(
        "--passkey",
        type=int,
        default=os.environ.get("OTA_BLE_PASSKEY"),
        help="Must match OTA_BLE_PASSKEY in secrets.h (or set the OTA_BLE_PASSKEY env var)",
    )
    args = parser.parse_args()

    if args.passkey is None:
        parser.error("--passkey is required (or set the OTA_BLE_PASSKEY env var)")

    try:
        asyncio.run(read_logs(args.device_name, args.passkey))
    except KeyboardInterrupt:
        log.info("Stopped by user")
