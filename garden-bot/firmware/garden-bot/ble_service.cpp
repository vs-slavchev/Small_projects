#include "ble_service.h"
#include "config.h"
#include "debug.h"

#include <NimBLEDevice.h>
#include <NimBLEOta.h>

static NimBLEOta bleOta;
static NimBLEServer* pServer = nullptr;

class LogCharCallbacks : public NimBLECharacteristicCallbacks {
  void onRead(NimBLECharacteristic* pChar, NimBLEConnInfo& connInfo) override {
    // Served lazily so a read always reflects the log as of right now,
    // not whatever was logged at the time the characteristic was created.
    // setValue(const String&) silently truncates to NimBLE's default 20-byte
    // attribute length; go through the raw pointer/length overload instead,
    // which respects the larger max length set on the characteristic below.
    lockRunLog();
    pChar->setValue((uint8_t*)runLog.c_str(), runLog.length());
    unlockRunLog();
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

void startBLE(uint32_t otaPasskey) {
  NimBLEDevice::init(BOT_NAME);
  NimBLEDevice::setMTU(247);

  // The ESP32 has no display/keyboard to show or enter a passkey, so pin
  // it to a fixed value known in advance by the laptop running the OTA
  // script. Bonding (true) lets a reconnect skip re-pairing mid-update.
  NimBLEDevice::setSecurityAuth(true, true, true);
  NimBLEDevice::setSecurityIOCap(BLE_HS_IO_DISPLAY_ONLY);
  NimBLEDevice::setSecurityPasskey(otaPasskey);

  pServer = NimBLEDevice::createServer();

  NimBLEService* logService = pServer->createService(LOG_SERVICE_UUID);
  // READ_ENC requires the same encrypted/paired link as OTA, so logs can't
  // be read by an unauthenticated nearby device either.
  NimBLECharacteristic* logChar = logService->createCharacteristic(
    LOG_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::READ_ENC, LOG_BUFFER_MAX_CHARS);
  logChar->setCallbacks(&logCharCallbacks);
  logService->start();

  NimBLEService* otaService = bleOta.start(&otaCallbacks, true);

  NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(logService->getUUID());
  pAdvertising->addServiceUUID(otaService->getUUID());
  // NimBLEDevice::init(name) only sets the GATT device name (visible after
  // connecting) - it does NOT put the name into the advertisement, so a
  // scanner filtering by name would never see this device. The two service
  // UUIDs already fill most of the 31-byte legacy advertising packet, so
  // route the name through the separate scan response packet instead.
  pAdvertising->enableScanResponse(true);
  pAdvertising->setName(BOT_NAME);
  pAdvertising->start();

  debugln("BLE advertising started (log + OTA)");
}

bool otaInProgress() {
  return bleOta.isInProgress();
}

bool bleClientConnected() {
  return pServer != nullptr && pServer->getConnectedCount() > 0;
}

void abortOta() {
  bleOta.abortUpdate();
}
