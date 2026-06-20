#ifndef DEBUG_H
#define DEBUG_H

#include <Arduino.h>

// Rolling buffer of this wake cycle's log lines, served over BLE.
// Not RTC-retained: it only ever holds the current run, reset to empty on every boot.
extern String runLog;
void logAppend(const String& s);

#if defined debug_print
   #define debug_begin(x)        Serial.begin(x)
   #define debug(x)              do { Serial.print(x); logAppend(String(x)); } while (0)
   #define debugln(x)            do { Serial.println(x); logAppend(String(x) + "\n"); } while (0)
   #define debugf(...)           do { char _dbgBuf[200]; snprintf(_dbgBuf, sizeof(_dbgBuf), __VA_ARGS__); Serial.print(_dbgBuf); logAppend(String(_dbgBuf)); } while (0)
   #define debugFlush()          Serial.flush()
#else
   #define debug_begin(x)
   #define debug(x)              logAppend(String(x))
   #define debugln(x)            logAppend(String(x) + "\n")
   #define debugf(...)           do { char _dbgBuf[200]; snprintf(_dbgBuf, sizeof(_dbgBuf), __VA_ARGS__); logAppend(String(_dbgBuf)); } while (0)
   #define debugFlush()
#endif

#endif


