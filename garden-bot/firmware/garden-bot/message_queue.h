#ifndef MESSAGE_QUEUE_H
#define MESSAGE_QUEUE_H

#include <Arduino.h>
#include "time.h"

// One reading, captured at the time it was taken (RTC-retained so it
// survives deep sleep). Queued when AWS is unreachable, flushed once
// connectivity returns.
struct QueuedMessage {
  time_t timestamp;
  int battery_mV;
  int moisturePercent;
  int tempC;
  bool watered;
  bool water_available;
  int water_level_raw;
  // Watering-rule inputs, captured with the reading rather than read from
  // globals at publish time: a message replayed after an outage must report the
  // values that held when it was taken, not the ones current at flush.
  int maxTempC;
  int hoursSinceWatering;
};

// Ring buffer: drops the oldest entry once full rather than blocking
// or growing unbounded.
void queueMessage(const QueuedMessage& msg);
int queuedMessageCount();
QueuedMessage queuedMessageAt(int index);
void removeSentMessages(int sentCount);

#endif
