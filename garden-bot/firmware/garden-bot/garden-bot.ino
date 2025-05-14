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
#include "driver/adc.h"
#include "time.h"
#include <OneWire.h>
#include <DallasTemperature.h>


 
WiFiClientSecure net = WiFiClientSecure();
PubSubClient client(net);

unsigned long startTime;

int battery_mV = 0;
int moisturePercent_1 = 0;
int moisturePercent_2 = 0;
bool watered = false;
int tempC = -100;
RTC_DATA_ATTR int seconds_since_last_watering = 3600*24*10;
RTC_DATA_ATTR struct tm timeinfo = { 0, 0, 13, 2, 6, 123 };
RTC_DATA_ATTR int maxRecentTemperature = INT_MIN;


 
void connectWiFi()
{
  adc_power_on();
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
    WiFi.disconnect(true);  // Disconnect from the network
    WiFi.mode(WIFI_OFF);    // Switch WiFi off
    debugln("Disconnected from Wi-Fi");
}

void connectAWS()
{
  // Configure WiFiClientSecure to use the AWS IoT device credentials
  net.setCACert(AWS_CERT_CA);
  net.setCertificate(AWS_CERT_CRT);
  net.setPrivateKey(AWS_CERT_PRIVATE);
 
  // Connect to the MQTT broker on the AWS endpoint we defined earlier
  client.setServer(AWS_IOT_ENDPOINT, 8883);
 
  // Create a message handler
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
 
  // Subscribe to a topic
  client.subscribe(AWS_IOT_SUBSCRIBE_TOPIC);
 
  debugln("AWS IoT Connected!");
}
 
void publishMessage()
{
  StaticJsonDocument<200> doc;
  doc["device"] = BOT_NAME;
  doc["battery"] = battery_mV;
  doc["moisture_1"] = moisturePercent_1;
  doc["moisture_2"] = moisturePercent_2;
  doc["watered"] = watered;
  doc["temp"] = tempC;
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
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer); // get internet time
  if(!getLocalTime(&timeinfo)){
    debugln("Failed to obtain internet time, adding sleep time to timeinfo");
    timeinfo.tm_sec += SECONDS_TO_SLEEP;
    mktime(&timeinfo); // normalize the time structure if seconds overflow
    return;
  }
  debugln((String)"Current time: " + asctime(&timeinfo));
}

void readBattery() {
  float batteryInput = analogRead(BATTERY_GAUGE_PIN);
  
  float input_voltage = (batteryInput * 4.2) / 4095.0;
  battery_mV = input_voltage * 1000;
  debugln((String)"batt input: " + batteryInput + 
    (String)"; battery voltage [0-4.2V]: " + input_voltage + (String)"; batt mV: " + battery_mV);
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

  int moisture1_raw = averageReadings(MOISTURE_1_PIN);
  int moisture2_raw = averageReadings(MOISTURE_2_PIN);
  digitalWrite(SENSOR_POWER_PIN, LOW);

  moisturePercent_1 = map(moisture1_raw, AIR_MOISTURE, WATER_MOISTURE, 0, 100);
  moisturePercent_1 = constrain(moisturePercent_1, 0, 100);
  moisturePercent_2 = map(moisture2_raw, AIR_MOISTURE, WATER_MOISTURE, 0, 100);
  moisturePercent_2 = constrain(moisturePercent_2, 0, 100);
  
  int averageMoisturePercent = (moisturePercent_1 + moisturePercent_2) / 2;
  
  debugf("moisture1: raw = %d, pct = %d; moisture2: raw = %d, pct = %d avg = %d\n",
    moisture1_raw, moisturePercent_1, moisture2_raw, moisturePercent_2, averageMoisturePercent);
}

void readTemperature() {
    // setup
    OneWire oneWire(ONE_WIRE_BUS);
    DallasTemperature sensors(&oneWire);
    sensors.begin();

    sensors.requestTemperatures(); 
    tempC = round(sensors.getTempCByIndex(0)); // first on bus
    if (tempC == -127 || tempC > 50) {
      debugln("Temperature reading was corrupted");
      tempC = 0;
    }
    debugf("Temperature: %d°C\n", tempC);

    maxRecentTemperature = max(maxRecentTemperature, tempC);
}

bool shouldWater() {
  bool enoughTimePassedSinceWateringForRecentMaxTemps = seconds_since_last_watering >= calculateSecondsBetweenWateringFromMaxRecentTemperature();
  bool isMorning = timeinfo.tm_hour == 8; // 8am
  bool isHotAfternoon = timeinfo.tm_hour == 15 && maxRecentTemperature >= 31;
  bool shouldWater = enoughTimePassedSinceWateringForRecentMaxTemps && (isMorning || isHotAfternoon);
  if (!shouldWater) {
    seconds_since_last_watering += SECONDS_TO_SLEEP;
    debugln((String)"set seconds_since_last_watering to:  " + seconds_since_last_watering);
  }
  return shouldWater;
}

int calculateSecondsBetweenWateringFromMaxRecentTemperature() {
  if (maxRecentTemperature >= 31) {
    return 3600 * 6; // 6 hours
  } else if (maxRecentTemperature >= 25) {
    return 3600 * 15; // 15 hours
  } else if (maxRecentTemperature >= 19) {
    return 3600 * 24 * 2; // 2 days
  } else if (maxRecentTemperature >= 15) {
    return 3600 * 24 * 3; // 3 days
  } else if (maxRecentTemperature >= 10) {
    return 3600 * 24 * 4; // 4 days
  } else {
    return 3600 * 24 * 5; // 5 days
  }
}

void powerPump() {
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, HIGH);

  debugf("starting watering for %d seconds", WATERING_DURATION_S);
  for (int i = 0; i < WATERING_DURATION_S; i++) {
    delay(1000);
    debug(".");
    flashOffDiagnosticLed();
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
  adc_power_off();
  // WiFi.disconnect(true);  // Disconnect from the network
  // WiFi.mode(WIFI_OFF);    // Switch WiFi off

  // btStop();
  // esp_bluedroid_disable();
  // esp_bt_controller_disable();
  // esp_wifi_stop();
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
  // setup
  setCpuFrequencyMhz(80);
  debug_begin(9600);
  //set the resolution to 12 bits (0-4096)
  analogReadResolution(12);
  turnOnDiagnosticLed();
  startTime = millis();

  // read sensors
  readBattery();
  readMoisture();
  readTemperature();

  connectWiFi();
  saveCurrentTime();

  if (shouldWater()) {
      disconnectWiFi(); // to save energy
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
