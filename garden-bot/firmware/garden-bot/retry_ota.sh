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
# Each attempt is killed automatically after OTA_TIMEOUT_S (default 120s).
# That catches the case where the device goes to sleep mid-handshake and
# nimbleota.py hangs waiting for an ACK that will never arrive.
#
# Usage:
#   ./retry_ota.sh /path/to/nimbleota.py garden-bot.ino.bin [MAC_ADDRESS]
#   OTA_TIMEOUT_S=180 ./retry_ota.sh ...   # override per-attempt timeout
#
# Stop it (ctrl-c) once you see the transfer complete and the device
# reboot - it'll otherwise keep looping forever, including re-attempting
# after a successful flash.
set -uo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 /path/to/nimbleota.py firmware.bin [MAC_ADDRESS]" >&2
  exit 1
fi

NIMBLEOTA_PY="$1"
FIRMWARE_BIN="$2"
MAC_ADDRESS="${3:-}"
TIMEOUT_S="${OTA_TIMEOUT_S:-120}"

ts() { date '+%H:%M:%S'; }

attempt=0
while true; do
  attempt=$((attempt + 1))
  echo "[$(ts)] === Attempt #${attempt} (timeout ${TIMEOUT_S}s) ==="

  if [ -n "$MAC_ADDRESS" ]; then
    timeout "$TIMEOUT_S" python3 "$NIMBLEOTA_PY" "$FIRMWARE_BIN" "$MAC_ADDRESS"
  else
    timeout "$TIMEOUT_S" python3 "$NIMBLEOTA_PY" "$FIRMWARE_BIN"
  fi
  rc=$?

  if [ $rc -eq 0 ]; then
    echo "[$(ts)] Transfer complete - ctrl-c to stop retrying."
  elif [ $rc -eq 124 ]; then
    echo "[$(ts)] --- Timed out after ${TIMEOUT_S}s (device likely asleep mid-handshake), retrying in 2s ---"
  else
    echo "[$(ts)] --- Attempt #${attempt} ended (exit ${rc}), retrying in 2s ---"
  fi
  sleep 2
done
