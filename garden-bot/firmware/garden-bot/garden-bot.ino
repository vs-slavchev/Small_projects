#include "secrets.h"
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "WiFi.h"
#include <esp_wifi.h>
#include <esp_bt.h>
#include "driver/adc.h"

// #define debug_print
#if defined debug_print
   #define debug_begin(x)        Serial.begin(x)
   #define debug(x)              Serial.print(x)
   #define debugln(x)            Serial.println(x)
   #define debugf(...)           Serial.printf(__VA_ARGS__)
   #define debugFlush()          Serial.flush()
#else
   #define debug_begin(x)
   #define debug(x)
   #define debugln(x)
   #define debugf(...)
   #define debugFlush()
#endif

 
#define AWS_IOT_PUBLISH_TOPIC   "esp32/pub"
#define AWS_IOT_SUBSCRIBE_TOPIC "esp32/sub"

#define PUMP_PIN 32
#define SENSOR_POWER_PIN 33
#define MOISTURE_1_PIN 34
#define MOISTURE_2_PIN 35
#define BATTERY_GAUGE_PIN 39
// #define POTENTIOMETER_PIN 36

// values gotten from testing
#define AIR_MOISTURE 2900
#define WATER_MOISTURE 1000

#define WATERING_DURATION_S 15
#define WATERING_THRESHOLD_PCT 75

#define SECONDS_TO_SLEEP  1800 // 60s * 30m
// #define SECONDS_TO_SLEEP 3
const uint64_t uS_TO_SLEEP = SECONDS_TO_SLEEP * 1000000ull;
 
WiFiClientSecure net = WiFiClientSecure();
PubSubClient client(net);

int battery_mV = 0;
int moisturePercent_1 = 0;
int moisturePercent_2 = 0;
bool watered = false;
 
void connectWiFi()
{
  adc_power_on();
  // WiFi.disconnect(false);  // Reconnect the network
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
 
  debugln("Connecting to Wi-Fi");
 
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    debug(".");
  }
  debugln("Wi-Fi connected");
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
 
  while (!client.connect(THINGNAME))
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
  doc["device"] = "garden_bot1";
  doc["battery"] = battery_mV;
  doc["moisture_1"] = moisturePercent_1;
  doc["moisture_2"] = moisturePercent_2;
  doc["watered"] = watered;
  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);
 
  client.publish(AWS_IOT_PUBLISH_TOPIC, jsonBuffer);
}
 
void messageHandler(char* topic, byte* payload, unsigned int length)
{
  //won't handle messages
}

void readBattery() {
  float batteryInput = analogRead(BATTERY_GAUGE_PIN);
  
  float input_voltage = (batteryInput * 4.2) / 4095.0;
  battery_mV = input_voltage * 1000;
  debugln((String)"batt input: " + batteryInput + (String)"; battery voltage [0-4.2V]: " + input_voltage + (String)"; batt mV: " + battery_mV);
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
  
  debugf("moisture1: raw = %d, pct = %d; moisture2: raw = %d, pct = %d avg = %d\n", moisture1_raw, moisturePercent_1, moisture2_raw, moisturePercent_2, averageMoisturePercent);
}

void powerPump() {
  bool startPump = (moisturePercent_1 + moisturePercent_2) / 2 < WATERING_THRESHOLD_PCT;
  if (!startPump) {
    return;
  }
  
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, HIGH);

  delay(WATERING_DURATION_S * 1000);

  digitalWrite(PUMP_PIN, LOW);
  watered = true;
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
  esp_sleep_enable_timer_wakeup(uS_TO_SLEEP);
  debugln("Setup ESP32 to sleep for " + String(SECONDS_TO_SLEEP) + " seconds");
  debugFlush(); 
  esp_deep_sleep_start();
}
 
void setup()
{
  setCpuFrequencyMhz(80);
  debug_begin(9600);
  //set the resolution to 12 bits (0-4096)
  analogReadResolution(12);

  readBattery();
  readMoisture();

  powerPump();

  connectWiFi();
  connectAWS();
  publishMessage();
  client.loop();

  deepSleep();
}
 
void loop()
{
  // empty on purpose
}
