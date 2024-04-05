#include "secrets.h"
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "WiFi.h"
 
#define AWS_IOT_PUBLISH_TOPIC   "esp32/pub"
#define AWS_IOT_SUBSCRIBE_TOPIC "esp32/sub"

#define MOISTURE_1_PIN 34
#define MOISTURE_2_PIN 35

// values gotten from testing
#define AIR_MOISTURE 2900
#define WATER_MOISTURE 1110
 
WiFiClientSecure net = WiFiClientSecure();
PubSubClient client(net);

int batteryPercent = 0;
int moisturePercent_1 = 0;
int moisturePercent_2 = 0;
 
void connectAWS()
{
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
 
  Serial.println("Connecting to Wi-Fi");
 
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Wi-Fi connected");
 
  // Configure WiFiClientSecure to use the AWS IoT device credentials
  net.setCACert(AWS_CERT_CA);
  net.setCertificate(AWS_CERT_CRT);
  net.setPrivateKey(AWS_CERT_PRIVATE);
 
  // Connect to the MQTT broker on the AWS endpoint we defined earlier
  client.setServer(AWS_IOT_ENDPOINT, 8883);
 
  // Create a message handler
  client.setCallback(messageHandler);
 
  Serial.println("Connecting to AWS IOT");
 
  while (!client.connect(THINGNAME))
  {
    Serial.print(".");
    delay(100);
  }
 
  if (!client.connected())
  {
    Serial.println("AWS IoT Timeout!");
    return;
  }
 
  // Subscribe to a topic
  client.subscribe(AWS_IOT_SUBSCRIBE_TOPIC);
 
  Serial.println("AWS IoT Connected!");
}
 
void publishMessage()
{
  StaticJsonDocument<200> doc;
  doc["location"] = "balcony";
  doc["battery"] = batteryPercent;
  doc["moisture_1"] = moisturePercent_1;
  doc["moisture_2"] = moisturePercent_2;
  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);
 
  client.publish(AWS_IOT_PUBLISH_TOPIC, jsonBuffer);
}
 
void messageHandler(char* topic, byte* payload, unsigned int length)
{
  //won't handle messages
}

void readBattery() {
  batteryPercent = 0;
}

void readMoisture() {
  int moisture1_raw = analogRead(MOISTURE_1_PIN);
  int moisture2_raw = analogRead(MOISTURE_2_PIN);

  moisturePercent_1 = map(moisture1_raw, AIR_MOISTURE, WATER_MOISTURE, 0, 100);
  moisturePercent_1 = constrain(moisturePercent_1, 0, 100);
  moisturePercent_2 = map(moisture2_raw, AIR_MOISTURE, WATER_MOISTURE, 0, 100);
  moisturePercent_2 = constrain(moisturePercent_2, 0, 100);
  
  int averageMoisturePercent = (moisturePercent_1 + moisturePercent_2) / 2;
  
  // print out the values you read:
  Serial.printf("moisture1: raw = %d, pct = %d; moisture2: raw = %d, pct = %d avg = %d\n", moisture1_raw, moisturePercent_1, moisture2_raw, moisturePercent_2, averageMoisturePercent);
}
 
void setup()
{
  Serial.begin(9600);
  //set the resolution to 12 bits (0-4096)
  analogReadResolution(12);

  connectAWS();
}
 
void loop()
{
  readBattery();
  readMoisture();

  publishMessage();
  client.loop();
  delay(1000);
}
