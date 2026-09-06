# Garden bot

## Read logs wirelessly
Run `python3 read_logs.py --passkey 123456 device-name`. It will retry
connecting until the device wakes up and emits logs.
This pairs and gives you the MAC address of the device.

## Program wirelessly
After having paired with a device and knowing its MAC address:
- run `retry-ota.sh` and pass in the MAC address. It will retry connecting
until the device wakes up.
