#include <WiFi.h>
#include <ArduinoOTA.h>
#include "secrets.h"

static const char* OTA_HOSTNAME = "vanka_table_ota";

// RGB MOSFET pins (wired to gates)
const int R_PIN = 25; // Red
const int G_PIN = 26; // Green
const int B_PIN = 33; // Blue

// LEDC (hardware PWM) channels
const int LEDC_CH_R = 0;
const int LEDC_CH_G = 1;
const int LEDC_CH_B = 2;
const int LEDC_FREQ = 5000; // 5 kHz
const int LEDC_RESOLUTION = 8; // 8-bit (0-255)

void connectWiFi() {
	WiFi.mode(WIFI_STA);
	WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

	while (WiFi.status() != WL_CONNECTED) {
		delay(500);
	}
}

void setupOTA() {
	ArduinoOTA.setHostname(OTA_HOSTNAME);
	ArduinoOTA.setPassword(OTA_PASSWORD);
	ArduinoOTA.begin();
}

// Helper: set RGB output (0-255)
void setRGB(uint8_t r, uint8_t g, uint8_t b) {
	ledcWrite(LEDC_CH_R, r);
	ledcWrite(LEDC_CH_G, g);
	ledcWrite(LEDC_CH_B, b);
}

void delayWithOTA(uint32_t ms) {
	const uint32_t end = millis() + ms;
	while (millis() < end) {
		ArduinoOTA.handle();
		delay(10);
	}
}

void stepToColor(uint8_t r, uint8_t g, uint8_t b) {
	const uint32_t durationMs = 10000;
	const uint32_t stepDelay = 20;
	const int steps = max(1, (int)(durationMs / stepDelay));

	for (int i = 0; i <= steps; ++i) {
		float t = (float)i / (float)steps;
		setRGB((uint8_t)(r * t), (uint8_t)(g * t), (uint8_t)(b * t));
		ArduinoOTA.handle();
		delay(stepDelay);
	}

	delayWithOTA(300);
}

void setup() {
	// Configure LEDC channels and attach pins
	ledcSetup(LEDC_CH_R, LEDC_FREQ, LEDC_RESOLUTION);
	ledcAttachPin(R_PIN, LEDC_CH_R);
	ledcSetup(LEDC_CH_G, LEDC_FREQ, LEDC_RESOLUTION);
	ledcAttachPin(G_PIN, LEDC_CH_G);
	ledcSetup(LEDC_CH_B, LEDC_FREQ, LEDC_RESOLUTION);
	ledcAttachPin(B_PIN, LEDC_CH_B);

	pinMode(2, OUTPUT); // onboard LED

	delay(200);

	connectWiFi();
	setupOTA();
}

void loop() {
	// If WiFi drops, reconnect.
	if (WiFi.status() != WL_CONNECTED) {
		connectWiFi();
	}

	// Start from black and step through red, green, then blue.
	const uint8_t colors[3][3] = {
		{255, 0, 0},   // Red
		{0, 255, 0},   // Green
		{0, 0, 255}    // Blue
	};

	for (int i = 0; i < 3; ++i) {
		stepToColor(colors[i][0], colors[i][1], colors[i][2]);
		setRGB(0, 0, 0);
		delayWithOTA(300);
	}

	// Small blink on onboard LED to show loop cycling
	digitalWrite(2, HIGH);
	delay(100);
	digitalWrite(2, LOW);
	delay(100);
}
