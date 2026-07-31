#include "message_queue.h"
#include "config.h"
#include <string.h>

RTC_DATA_ATTR QueuedMessage messageQueue[MESSAGE_QUEUE_SIZE];
RTC_DATA_ATTR int queuedCount = 0;

void queueMessage(const QueuedMessage& msg) {
  if (queuedCount >= MESSAGE_QUEUE_SIZE) {
    memmove(&messageQueue[0], &messageQueue[1], sizeof(QueuedMessage) * (MESSAGE_QUEUE_SIZE - 1));
    queuedCount = MESSAGE_QUEUE_SIZE - 1;
  }
  messageQueue[queuedCount++] = msg;
}

int queuedMessageCount() {
  return queuedCount;
}

QueuedMessage queuedMessageAt(int index) {
  return messageQueue[index];
}

void removeSentMessages(int sentCount) {
  if (sentCount <= 0) {
    return;
  }
  if (sentCount >= queuedCount) {
    queuedCount = 0;
    return;
  }
  memmove(&messageQueue[0], &messageQueue[sentCount], sizeof(QueuedMessage) * (queuedCount - sentCount));
  queuedCount -= sentCount;
}
