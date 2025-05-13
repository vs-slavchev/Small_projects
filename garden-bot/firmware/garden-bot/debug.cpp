#include "debug.h"
#include "config.h"



void turnOnDiagnosticLed() {
  #if defined debug_print
    debugln("\nStarted!");
    pinMode(DIAGNOSTIC_PIN, OUTPUT);
    digitalWrite(DIAGNOSTIC_PIN, HIGH);
  #endif
}

void flashOffDiagnosticLed() {
  #if defined debug_print
    digitalWrite(DIAGNOSTIC_PIN, LOW);
    delay(50);
    digitalWrite(DIAGNOSTIC_PIN, HIGH);
  #endif
}