#include "debug.h"
#include "config.h"

#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

String runLog;
static SemaphoreHandle_t runLogMutex = nullptr;

void debug_init() {
  runLogMutex = xSemaphoreCreateMutex();
}

void lockRunLog() {
  if (runLogMutex) xSemaphoreTake(runLogMutex, portMAX_DELAY);
}

void unlockRunLog() {
  if (runLogMutex) xSemaphoreGive(runLogMutex);
}

void logAppend(const String& s) {
  lockRunLog();
  runLog += s;
  if (runLog.length() > LOG_BUFFER_MAX_CHARS) {
    runLog = runLog.substring(runLog.length() - LOG_BUFFER_MAX_CHARS);
  }
  unlockRunLog();
}
