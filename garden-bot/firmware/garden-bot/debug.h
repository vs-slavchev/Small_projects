#ifndef DEBUG_H
#define DEBUG_H

#include <Arduino.h>

#if defined debug_print
   #define debug_begin(x)        Serial.begin(x)
   #define debug(x)              Serial.print(x)
   #define debugln(x)            Serial.println(x)
   #define debugf(...)           Serial.printf(__VA_ARGS__)
   #define debugFlush()          Serial.flush()
#else
   #define debug_begin(x)
   #define debug(x)
   #define debugln(x)
   #define debugf(...)
   #define debugFlush()
#endif

void turnOnDiagnosticLed();
void flashOffDiagnosticLed();
#endif


