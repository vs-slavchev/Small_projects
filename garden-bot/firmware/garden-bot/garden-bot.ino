#include "secrets.h"
#include "config.h"
#include "debug.h"

// dependencies
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "WiFi.h"
#include <esp_wifi.h>
#include <esp_bt.h>
#include "time.h"
#include <OneWire.h>
#include <DallasTemperature.h>



WiFiClientSecure net = WiFiClientSecure();
PubSubClient client(net);

unsigned long startTime;

int battery_mV = 0;
int moisturePercent = 0;
bool water_available = false;
int water_level_raw = 0;
bool watered = false;
int tempC = -100;
RTC_DATA_ATTR int seconds_since_last_watering = 3600*24*10;
RTC_DATA_ATTR struct tm timeinfo = { 0, 0, 13, 2, 6, 123 };
RTC_DATA_ATTR int maxRecentTemperature = INT_MIN;



void connectWiFi()
{
  WiFi.setTxPower(WIFI_POWER_8_5dBm);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  debug("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    debug(".");
  }
  debugln(" Wi-Fi connected");
}

void disconnectWiFi() {
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);
    debugln("Disconnected from Wi-Fi");
}

void connectAWS()
{
  net.setCACert(AWS_CERT_CA);
  net.setCertificate(AWS_CERT_CRT);
  net.setPrivateKey(AWS_CERT_PRIVATE);

  client.setServer(AWS_IOT_ENDPOINT, 8883);
  client.setCallback(messageHandler);

  debugln("Connecting to AWS IOT");

  while (!client.connect(AWS_THINGNAME))
  {
    debug(".");
    delay(100);
  }

  if (!client.connected())
  {
    debugln("AWS IoT Timeout!");
    return;
  }

  client.subscribe(AWS_IOT_SUBSCRIBE_TOPIC);
  debugln("AWS IoT Connected!");
}

void publishMessage()
{
  StaticJsonDocument<200> doc;
  doc["device"] = BOT_NAME;
  doc["battery"] = battery_mV;
  doc["moisture"] = moisturePercent;
  doc["watered"] = watered;
  doc["temp"] = tempC;
  doc["water_available"] = water_available;
  doc["water_level_raw"] = water_level_raw;
  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);

  client.publish(AWS_IOT_PUBLISH_TOPIC, jsonBuffer);
  debugln((String)"Published message: " + jsonBuffer);
}

void messageHandler(char* topic, byte* payload, unsigned int length)
{
  //won't handle messages
}

void saveCurrentTime() {
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  if(!getLocalTime(&timeinfo)){
    debugln("Failed to obtain internet time, adding sleep time to timeinfo");
    timeinfo.tm_sec += SECONDS_TO_SLEEP;
    mktime(&timeinfo);
    return;
  }
  debugln((String)"Current time: " + asctime(&timeinfo));
}

void readBattery() {
  float raw = analogRead(BATTERY_GAUGE_PIN);
  float adc_voltage = raw * 3.3f / 4095.0f;
  float battery_voltage = adc_voltage * BATTERY_DIVIDER_NUM / BATTERY_DIVIDER_DEN;
  battery_mV = battery_voltage * 1000;
  debugf("batt raw: %.0f; adc: %.3fV; batt: %.3fV; mV: %d\n",
    raw, adc_voltage, battery_voltage, battery_mV);
}

int averageReadings(int pin) {
  const int numberReadings = 10;
  int sum = 0;
  for (int i = 0; i < numberReadings; i++) {
    sum += analogRead(pin);
    delay(20);
  }
  return sum / numberReadings;
}

void readMoisture() {
  pinMode(SENSOR_POWER_PIN, OUTPUT);
  digitalWrite(SENSOR_POWER_PIN, HIGH);
  delay(50);

  int moisture_raw = averageReadings(MOISTURE_PIN);
  digitalWrite(SENSOR_POWER_PIN, LOW);

  moisturePercent = map(moisture_raw, AIR_MOISTURE, WATER_MOISTURE, 0, 100);
  moisturePercent = constrain(moisturePercent, 0, 100);

  debugf("moisture: raw=%d, pct=%d\n", moisture_raw, moisturePercent);
}

void readTemperature() {
  pinMode(SENSOR_POWER_PIN, OUTPUT);
  digitalWrite(SENSOR_POWER_PIN, HIGH);
  pinMode(TEMPERATURE_POWER_PIN, OUTPUT);
  digitalWrite(TEMPERATURE_POWER_PIN, HIGH);
  delay(500);

  OneWire oneWire(ONE_WIRE_BUS);
  DallasTemperature sensors(&oneWire);
  sensors.begin();
  debug("Devices found: ");
  debugln(sensors.getDeviceCount());

  Serial.print("Device count: ");
  Serial.println(sensors.getDeviceCount());

  DeviceAddress addr;
  if (sensors.getAddress(addr, 0)) {
    Serial.print("Address: ");
    for (int i = 0; i < 8; i++) {
      Serial.printf("%02X ", addr[i]);
    }
    Serial.println();
  } else {
    Serial.println("No address found");
  }

  sensors.setWaitForConversion(false);
  sensors.requestTemperatures();
  delay(1000);
  float rawTempC = sensors.getTempCByIndex(0);
  debugf("Temperature raw: %.2f°C\n", rawTempC);
  tempC = round(rawTempC);
  if (tempC == -127 || tempC > 50) {
    debugln("Temperature reading was corrupted");
    tempC = 0;
  }

  digitalWrite(TEMPERATURE_POWER_PIN, LOW);
  digitalWrite(SENSOR_POWER_PIN, LOW);
  debugf("Temperature: %d°C\n", tempC);

  maxRecentTemperature = max(maxRecentTemperature, tempC);
}

void readWaterLevel() {
  pinMode(WATER_LEVEL_PIN_A, OUTPUT);
  pinMode(WATER_LEVEL_PIN_B, OUTPUT);
  digitalWrite(WATER_LEVEL_PIN_A, LOW);
  digitalWrite(WATER_LEVEL_PIN_B, LOW);
  delay(10);

  // Measurement 1: A=HIGH, B=analog input
  digitalWrite(WATER_LEVEL_PIN_A, HIGH);
  pinMode(WATER_LEVEL_PIN_B, INPUT_PULLDOWN);
  delay(10);
  int reading1 = analogRead(WATER_LEVEL_PIN_B);

  // Both LOW between measurements
  pinMode(WATER_LEVEL_PIN_B, OUTPUT);
  digitalWrite(WATER_LEVEL_PIN_A, LOW);
  digitalWrite(WATER_LEVEL_PIN_B, LOW);
  delay(10);

  // Measurement 2: B=HIGH, A=analog input
  digitalWrite(WATER_LEVEL_PIN_B, HIGH);
  pinMode(WATER_LEVEL_PIN_A, INPUT_PULLDOWN);
  delay(10);
  int reading2 = analogRead(WATER_LEVEL_PIN_A);

  // Both LOW after measurements
  pinMode(WATER_LEVEL_PIN_A, OUTPUT);
  digitalWrite(WATER_LEVEL_PIN_A, LOW);
  digitalWrite(WATER_LEVEL_PIN_B, LOW);

  water_level_raw = (reading1 + reading2) / 2;
  water_available = water_level_raw >= WATER_LEVEL_THRESHOLD;
  debugf("Water level: r1=%d, r2=%d, avg=%d, threshold=%d, available=%d\n", reading1, reading2, water_level_raw, WATER_LEVEL_THRESHOLD, water_available);
}

bool shouldWater() {
  bool enoughTimePassedSinceWateringForRecentMaxTemps = seconds_since_last_watering >= calculateSecondsBetweenWateringFromMaxRecentTemperature();
  bool isMorning = timeinfo.tm_hour == 8;
  bool isHotAfternoon = timeinfo.tm_hour == 15 && maxRecentTemperature >= 29;
  bool shouldWater = enoughTimePassedSinceWateringForRecentMaxTemps && (isMorning || isHotAfternoon);
  if (!shouldWater) {
    seconds_since_last_watering += SECONDS_TO_SLEEP;
    debugln((String)"set seconds_since_last_watering to: " + seconds_since_last_watering);
  }
  return shouldWater;
}

int calculateSecondsBetweenWateringFromMaxRecentTemperature() {
  if (maxRecentTemperature >= 29) {
    return 3600 * 6;
  } else if (maxRecentTemperature >= 25) {
    return 3600 * 15;
  } else if (maxRecentTemperature >= 19) {
    return 3600 * 24 * 2;
  } else if (maxRecentTemperature >= 15) {
    return 3600 * 24 * 3;
  } else if (maxRecentTemperature >= 10) {
    return 3600 * 24 * 4;
  } else {
    return 3600 * 24 * 5;
  }
}

void powerPump() {
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, HIGH);

  debugf("starting watering for %d seconds", WATERING_DURATION_S);
  for (int i = 0; i < WATERING_DURATION_S; i++) {
    delay(1000);
    debug(".");
  }

  digitalWrite(PUMP_PIN, LOW);
}

void finishWatering() {
  watered = true;
  seconds_since_last_watering = SECONDS_TO_SLEEP;
  maxRecentTemperature = INT_MIN;
  debugln((String)"\nrestarted seconds_since_last_watering and reset maxRecentTemperature");
}

void deepSleep()
{
  debugFlush();

  unsigned long secondsWorked = (millis() - startTime) / 1000;
  debugln((String)"secondsWorked: " + secondsWorked);
  uint64_t microSecondsToSleep = (SECONDS_TO_SLEEP - secondsWorked + 1) * 1000000ull;
  esp_sleep_enable_timer_wakeup(microSecondsToSleep);
  debugln("Sleeping for " + String(microSecondsToSleep / 1000000) + " seconds");
  debugFlush();
  esp_deep_sleep_start();
}

void setup()
{
  setCpuFrequencyMhz(80);
  debug_begin(115200);
  analogReadResolution(12);
  startTime = millis();

  esp_reset_reason_t reason = esp_reset_reason();
  debugf("Reset reason: %d\n", reason);

  readBattery();
  readMoisture();
  readTemperature();
  readWaterLevel();

  connectWiFi();
  saveCurrentTime();

  if (shouldWater() && water_available) {
    disconnectWiFi();
    powerPump();
    finishWatering();
    connectWiFi();
  }

  connectAWS();
  publishMessage();
  client.loop();

  deepSleep();
}

void loop()
{
  // empty on purpose
}
