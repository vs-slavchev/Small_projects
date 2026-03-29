#include <WiFi.h>
#include <ArduinoOTA.h>
#include "../secrets.h"

static const char* OTA_HOSTNAME = "esp32-plant-stand-test";
static const uint8_t PWM_PIN = 32;

void connectWiFi() {
	WiFi.mode(WIFI_STA);
	WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

	Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
	while (WiFi.status() != WL_CONNECTED) {
		delay(500);
		Serial.print(".");
	}

	Serial.println();
	Serial.printf("[WiFi] Connected. IP: %s\n", WiFi.localIP().toString().c_str());
}

void setupOTA() {
	ArduinoOTA.setHostname(OTA_HOSTNAME);
	ArduinoOTA.setPassword(OTA_PASSWORD);

	ArduinoOTA.onStart([]() {
		Serial.println("[OTA] Update started");
	});

	ArduinoOTA.onEnd([]() {
		Serial.println("\n[OTA] Update complete");
	});

	ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
		static unsigned int lastPercent = 101;
		unsigned int percent = (progress * 100U) / total;
		if (percent != lastPercent) {
			Serial.printf("[OTA] Progress: %u%%\n", percent);
			lastPercent = percent;
		}
	});

	ArduinoOTA.onError([](ota_error_t error) {
		Serial.printf("[OTA] Error[%u]\n", error);
	});

	ArduinoOTA.begin();
	Serial.println("[OTA] Ready");
}

void setup() {
	pinMode(PWM_PIN, OUTPUT);
	digitalWrite(PWM_PIN, HIGH);

	Serial.begin(115200);
	delay(200);
	Serial.println();
	Serial.println("=== ESP32 Plant Stand OTA Pin-High Test ===");
	Serial.printf("[GPIO] Pin %u forced HIGH\n", PWM_PIN);

	connectWiFi();
	setupOTA();
}

void loop() {
	if (digitalRead(PWM_PIN) == LOW) {
		digitalWrite(PWM_PIN, HIGH);
	}

	if (WiFi.status() != WL_CONNECTED) {
		connectWiFi();
	}

	ArduinoOTA.handle();
	delay(10);
}
