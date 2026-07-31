#include "ble_service.h"
#include "config.h"
#include "debug.h"

#include <NimBLEDevice.h>

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

void startBLE(uint32_t blePasskey) {
  NimBLEDevice::init(BOT_NAME);
  NimBLEDevice::setMTU(247);

  // The ESP32 has no display/keyboard to show or enter a passkey, so pin it
  // to a fixed value known in advance by the laptop reading the logs (see
  // read_logs.py). Bonding (true) lets a reconnect skip re-pairing.
  NimBLEDevice::setSecurityAuth(true, true, true);
  NimBLEDevice::setSecurityIOCap(BLE_HS_IO_DISPLAY_ONLY);
  NimBLEDevice::setSecurityPasskey(blePasskey);

  pServer = NimBLEDevice::createServer();

  NimBLEService* logService = pServer->createService(LOG_SERVICE_UUID);
  // READ_ENC requires an encrypted/paired link, so the log can't be read by
  // an unauthenticated nearby device.
  NimBLECharacteristic* logChar = logService->createCharacteristic(
    LOG_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::READ_ENC, LOG_BUFFER_MAX_CHARS);
  logChar->setCallbacks(&logCharCallbacks);
  logService->start();

  NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(logService->getUUID());
  // NimBLEDevice::init(name) only sets the GATT device name (visible after
  // connecting) - it does NOT put the name into the advertisement, so a
  // scanner filtering by name would never see this device. Route the name
  // through the separate scan response packet instead.
  pAdvertising->enableScanResponse(true);
  pAdvertising->setName(BOT_NAME);
  pAdvertising->start();

  debugln("BLE adv start");
}

bool bleClientConnected() {
  return pServer != nullptr && pServer->getConnectedCount() > 0;
}
