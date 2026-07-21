#ifndef BLE_SERVICE_H
#define BLE_SERVICE_H

#include <stdint.h>

// Starts BLE advertising with a single service: a log characteristic exposing
// this wake cycle's runLog (for field debugging over BLE - see read_logs.py).
// Call once, early in setup(), so the advertising window covers the whole run.
// blePasskey is passed in (rather than pulled from secrets.h here) so this
// file doesn't #include secrets.h into a second translation unit, which
// would duplicate-define any non-const globals declared there (e.g. ntpServer).
void startBLE(uint32_t blePasskey);

// True while any BLE central is connected (e.g. mid log-read). setup() checks
// this before deepSleep() so a client that's still doing service
// discovery/pairing/reading doesn't get the connection yanked out from under
// it by deep sleep.
bool bleClientConnected();

#endif
