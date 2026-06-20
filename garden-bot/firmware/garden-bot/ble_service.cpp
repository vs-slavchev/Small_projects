#include "ble_service.h"
#include "config.h"
#include "debug.h"

#include <NimBLEDevice.h>
#include <NimBLEOta.h>

static NimBLEOta bleOta;

class LogCharCallbacks : public NimBLECharacteristicCallbacks {
  void onRead(NimBLECharacteristic* pChar, NimBLEConnInfo& connInfo) override {
    // Served lazily so a read always reflects the log as of right now,
    // not whatever was logged at the time the characteristic was created.
    pChar->setValue(runLog);
  }
} logCharCallbacks;

class OtaCallbacks : public NimBLEOtaCallbacks {
  void onStart(NimBLEOta* ota, uint32_t firmwareSize, NimBLEOta::Reason reason) override {
    if (reason == NimBLEOta::Reconnected) {
      debugln("OTA reconnected, resuming update");
      ota->stopAbortTimer();
      return;
    }
    debugf("OTA start, firmware size: %u\n", firmwareSize);
  }

  void onProgress(NimBLEOta* ota, uint32_t current, uint32_t total) override {
    debugf("OTA progress: %u/%u\n", current, total);
  }

  void onStop(NimBLEOta* ota, NimBLEOta::Reason reason) override {
    if (reason == NimBLEOta::Disconnected) {
      debugln("OTA client disconnected, giving it 30s to resume before aborting");
      ota->startAbortTimer(30);
      return;
    }
    if (reason == NimBLEOta::StopCmd) {
      debugln("OTA stopped by command, aborting");
      ota->abortUpdate();
    }
  }

  void onComplete(NimBLEOta* ota) override {
    debugln("OTA update complete, restarting");
    debugFlush();
    delay(1000);
    ESP.restart();
  }

  void onError(NimBLEOta* ota, esp_err_t err, NimBLEOta::Reason reason) override {
    debugf("OTA error: %d\n", err);
  }
} otaCallbacks;

void startBLE() {
  NimBLEDevice::init(BOT_NAME);
  NimBLEDevice::setMTU(247);

  NimBLEServer* pServer = NimBLEDevice::createServer();

  NimBLEService* logService = pServer->createService(LOG_SERVICE_UUID);
  NimBLECharacteristic* logChar = logService->createCharacteristic(LOG_CHAR_UUID, NIMBLE_PROPERTY::READ);
  logChar->setCallbacks(&logCharCallbacks);
  logService->start();

  NimBLEService* otaService = bleOta.start(&otaCallbacks);

  NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(logService->getUUID());
  pAdvertising->addServiceUUID(otaService->getUUID());
  pAdvertising->start();

  debugln("BLE advertising started (log + OTA)");
}

bool otaInProgress() {
  return bleOta.isInProgress();
}

void abortOta() {
  bleOta.abortUpdate();
}
