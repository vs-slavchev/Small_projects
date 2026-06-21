#ifndef BLE_SERVICE_H
#define BLE_SERVICE_H

#include <stdint.h>

// Starts BLE advertising with two services:
//  - a log characteristic exposing this wake cycle's runLog (for field debugging)
//  - the NimBLEOta service (for firmware updates while standing next to the device)
// Call once, early in setup(), so the advertising window covers the whole run.
// otaPasskey is passed in (rather than pulled from secrets.h here) so this
// file doesn't #include secrets.h into a second translation unit, which
// would duplicate-define any non-const globals declared there (e.g. ntpServer).
void startBLE(uint32_t otaPasskey);

// True while a client is actively pushing a firmware update.
// setup() checks this before deepSleep() to avoid sleeping mid-transfer.
bool otaInProgress();

// Aborts an in-progress OTA (used when it stalls past OTA_MAX_WAIT_MS).
void abortOta();

#endif
