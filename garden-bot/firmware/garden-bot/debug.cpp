#include "debug.h"
#include "config.h"

String runLog;

void logAppend(const String& s) {
  runLog += s;
  if (runLog.length() > LOG_BUFFER_MAX_CHARS) {
    runLog = runLog.substring(runLog.length() - LOG_BUFFER_MAX_CHARS);
  }
}
