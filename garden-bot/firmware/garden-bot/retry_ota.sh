#!/usr/bin/env bash
# Repeatedly runs nimbleota.py until it succeeds.
#
# nimbleota.py (from h2zero/NimBLEOta's scripts/) only scans for 5 seconds
# and gives up if the device isn't already advertising - it has no retry
# of its own. The device only advertises for a brief window each wake
# (~30 min apart), so this just re-launches it every couple of seconds
# until one attempt happens to land inside that window and the transfer
# completes (the script's own output will show progress/completion).
#
# Usage:
#   ./retry_ota.sh /path/to/nimbleota.py garden-bot.ino.bin [MAC_ADDRESS]
#
# Stop it (ctrl-c) once you see the transfer complete and the device
# reboot - it'll otherwise keep looping forever, including re-attempting
# after a successful flash.
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 /path/to/nimbleota.py firmware.bin [MAC_ADDRESS]" >&2
  exit 1
fi

NIMBLEOTA_PY="$1"
FIRMWARE_BIN="$2"
MAC_ADDRESS="${3:-}"

attempt=0
while true; do
  attempt=$((attempt + 1))
  echo "=== Attempt #${attempt} ==="
  if [ -n "$MAC_ADDRESS" ]; then
    python3 "$NIMBLEOTA_PY" "$FIRMWARE_BIN" "$MAC_ADDRESS"
  else
    python3 "$NIMBLEOTA_PY" "$FIRMWARE_BIN"
  fi
  echo "--- attempt #${attempt} ended, retrying in 2s (ctrl-c to stop) ---"
  sleep 2
done
