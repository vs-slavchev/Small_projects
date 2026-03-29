/*
	ESP32 OTA PWM Vanity Lights
	Features:
		- Wi-Fi + OTA updates using shared secrets config
		- NTP time sync with Europe/Sofia timezone
		- MOSFET-driven PWM control for an LED strip
		- APDS-9960 gesture control using interrupt-driven handling
		- Gesture debounce to suppress duplicate swipe events

	Gesture map:
		- Up:    set brightness to 100%
		- Down:  set brightness to 0%
		- Left:  reduce brightness by 20%
		- Right: increase brightness by 20%

	Quiet hours:
		- Turning the strip on is blocked between 00:00 and 07:30 local time.
		- If local time is unavailable, turn-on requests are rejected for safety.

	Hardware defaults used here:
		- PWM output: GPIO 32
		- APDS-9960 INT: GPIO 27
		- I2C: ESP32 default pins via Wire.begin()
*/

#include <WiFi.h>
#include <ArduinoOTA.h>
#include <Wire.h>
#include <SparkFun_APDS9960.h>
#include <time.h>
#include "../secrets.h"

static const char* OTA_HOSTNAME = "esp32-vanity-lights";
static const char* NTP_PRIMARY = "pool.ntp.org";
static const char* NTP_SECONDARY = "time.nist.gov";
static const char* TZ_INFO = "EET-2EEST,M3.5.0/3,M10.5.0/4";

static const uint8_t PWM_PIN = 32;
static const uint8_t PWM_CHANNEL = 0;
static const uint32_t PWM_FREQ = 5000;
static const uint8_t PWM_RES_BITS = 13;

static const uint8_t APDS_INT_PIN = 27;
static const unsigned long GESTURE_DEBOUNCE_MS = 350;
static const unsigned long TIME_LOG_INTERVAL_MS = 60000;
static const unsigned long TIME_RESYNC_INTERVAL_MS = 3600000;
static const unsigned long BRIGHTNESS_ANIMATION_MS = 450;
static const time_t MIN_VALID_EPOCH = 1704067200; // 2024-01-01 00:00:00 UTC

SparkFun_APDS9960 apds;
volatile bool gestureInterruptPending = false;

uint8_t currentBrightnessPct = 0;
uint8_t targetBrightnessPct = 0;
uint8_t animationStartBrightnessPct = 0;
unsigned long lastGestureHandledMs = 0;
unsigned long lastTimeLogMs = 0;
unsigned long lastTimeSetupMs = 0;
unsigned long brightnessAnimationStartMs = 0;
bool timeConfigured = false;
bool apdsReady = false;
bool brightnessAnimationActive = false;

void IRAM_ATTR onGestureInterrupt() {
	gestureInterruptPending = true;
}

uint32_t dutyFromPercent(uint8_t percent) {
	const uint32_t dutyMax = (1U << PWM_RES_BITS) - 1U;
	return ((uint32_t)percent * dutyMax) / 100U;
}

void writeBrightnessNow(uint8_t percent, bool verbose = true) {
	if (percent > 100) {
		percent = 100;
	}

	currentBrightnessPct = percent;
	uint32_t duty = dutyFromPercent(percent);
	ledcWrite(PWM_CHANNEL, duty);
	if (verbose) {
		Serial.printf("[PWM] Brightness set to %u%% (duty=%lu)\n", currentBrightnessPct, (unsigned long)duty);
	}
	if (!brightnessAnimationActive) {
		targetBrightnessPct = currentBrightnessPct;
	}
}

uint8_t requestedBrightness() {
	return brightnessAnimationActive ? targetBrightnessPct : currentBrightnessPct;
}

float easeOutCubic(float t) {
	float inv = 1.0f - t;
	return 1.0f - (inv * inv * inv);
}

void startBrightnessTransition(uint8_t percent) {
	if (percent > 100) {
		percent = 100;
	}

	if (percent == currentBrightnessPct) {
		brightnessAnimationActive = false;
		targetBrightnessPct = percent;
		writeBrightnessNow(percent);
		return;
	}

	animationStartBrightnessPct = currentBrightnessPct;
	targetBrightnessPct = percent;
	brightnessAnimationStartMs = millis();
	brightnessAnimationActive = true;
	Serial.printf("[PWM] Transition %u%% -> %u%%\n", animationStartBrightnessPct, targetBrightnessPct);
	if (BRIGHTNESS_ANIMATION_MS == 0) {
		brightnessAnimationActive = false;
		writeBrightnessNow(targetBrightnessPct);
	}

	if (targetBrightnessPct > animationStartBrightnessPct) {
		writeBrightnessNow(animationStartBrightnessPct, false);
	}
}

void setupPWM() {
	ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RES_BITS);
	ledcAttachPin(PWM_PIN, PWM_CHANNEL);
	writeBrightnessNow(0);
}

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

void setupTime() {
	lastTimeSetupMs = millis();
	timeConfigured = true;
	configTzTime(TZ_INFO, NTP_PRIMARY, NTP_SECONDARY);
	Serial.println("[Time] NTP + TZ config initiated (Europe/Sofia)");
}

bool getLocalTimeFromClock(struct tm* timeInfo) {
	time_t now = time(nullptr);
	if (now < MIN_VALID_EPOCH) {
		return false;
	}

	localtime_r(&now, timeInfo);
	return true;
}

void ensureTimeConfigured() {
	unsigned long nowMs = millis();
	if (!timeConfigured || (WiFi.status() == WL_CONNECTED && (nowMs - lastTimeSetupMs) >= TIME_RESYNC_INTERVAL_MS)) {
		setupTime();
	}
}

void logLocalTime() {
	struct tm timeInfo;
	if (!getLocalTimeFromClock(&timeInfo)) {
		Serial.println("[Time] Local time not available yet");
		return;
	}

	char buf[64];
	strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S %Z", &timeInfo);
	Serial.printf("[Time] %s\n", buf);
}

bool isQuietHours() {
	struct tm timeInfo;
	if (!getLocalTimeFromClock(&timeInfo)) {
		return true;
	}

	int minutes = (timeInfo.tm_hour * 60) + timeInfo.tm_min;
	return minutes < 450; // 07:30 = 450 minutes
}

bool canTurnOnNow() {
	struct tm timeInfo;
	if (!getLocalTimeFromClock(&timeInfo)) {
		Serial.println("[Policy] Time unavailable; blocking turn-on request");
		return false;
	}

	int minutes = (timeInfo.tm_hour * 60) + timeInfo.tm_min;
	if (minutes < 450) {
		char buf[32];
		strftime(buf, sizeof(buf), "%H:%M:%S", &timeInfo);
		Serial.printf("[Policy] Turn-on blocked during quiet hours at %s\n", buf);
		return false;
	}

	return true;
}

bool requestBrightness(uint8_t targetPercent) {
	if (targetPercent > 100) {
		targetPercent = 100;
	}

	if (currentBrightnessPct == 0 && targetPercent > 0 && !canTurnOnNow()) {
		return false;
	}

	startBrightnessTransition(targetPercent);
	return true;
}

void updateBrightnessAnimation() {
	if (!brightnessAnimationActive) {
		return;
	}

	unsigned long elapsedMs = millis() - brightnessAnimationStartMs;
	if (elapsedMs >= BRIGHTNESS_ANIMATION_MS) {
		brightnessAnimationActive = false;
		writeBrightnessNow(targetBrightnessPct);
		return;
	}

	float t = (float)elapsedMs / (float)BRIGHTNESS_ANIMATION_MS;
	float eased = easeOutCubic(t);
	float delta = (float)targetBrightnessPct - (float)animationStartBrightnessPct;
	uint8_t nextBrightness = (uint8_t)lroundf((float)animationStartBrightnessPct + (delta * eased));
	writeBrightnessNow(nextBrightness, false);
}

void handleGesture(int gesture) {
	switch (gesture) {
		case DIR_UP:
			Serial.println("[Gesture] UP");
			requestBrightness(100);
			break;
		case DIR_DOWN:
			Serial.println("[Gesture] DOWN");
			requestBrightness(0);
			break;
		case DIR_LEFT: {
			Serial.println("[Gesture] LEFT");
			uint8_t base = requestedBrightness();
			uint8_t target = (base >= 20) ? (base - 20) : 0;
			requestBrightness(target);
			break;
		}
		case DIR_RIGHT: {
			Serial.println("[Gesture] RIGHT");
			uint8_t base = requestedBrightness();
			uint8_t target = (base <= 80) ? (base + 20) : 100;
			requestBrightness(target);
			break;
		}
		case DIR_NEAR:
			Serial.println("[Gesture] NEAR ignored");
			break;
		case DIR_FAR:
			Serial.println("[Gesture] FAR ignored");
			break;
		default:
			Serial.printf("[Gesture] Unhandled code: %d\n", gesture);
			break;
	}
}

void processGestureInterrupt() {
	if (!gestureInterruptPending || !apdsReady) {
		return;
	}

	unsigned long now = millis();
	if ((now - lastGestureHandledMs) < GESTURE_DEBOUNCE_MS) {
		noInterrupts();
		gestureInterruptPending = false;
		interrupts();
		return;
	}

	noInterrupts();
	gestureInterruptPending = false;
	interrupts();

	if (!apds.isGestureAvailable()) {
		return;
	}

	int gesture = apds.readGesture();
	if (gesture == DIR_NONE) {
		return;
	}

	lastGestureHandledMs = now;
	handleGesture(gesture);
}

void setupGestureSensor() {
	pinMode(APDS_INT_PIN, INPUT_PULLUP);

	if (!apds.init()) {
		Serial.println("[APDS9960] Initialization failed");
		apdsReady = false;
		return;
	}

	if (!apds.enableGestureSensor(true)) {
		Serial.println("[APDS9960] Gesture sensor enable failed");
		apdsReady = false;
		return;
	}

	attachInterrupt(digitalPinToInterrupt(APDS_INT_PIN), onGestureInterrupt, FALLING);
	apdsReady = true;
	Serial.println("[APDS9960] Gesture sensor ready");
}

void setup() {
	Serial.begin(115200);
	delay(200);
	Serial.println();
	Serial.println("=== ESP32 OTA PWM Vanity Lights ===");

	setupPWM();
	Wire.begin();
	connectWiFi();
	setupOTA();
	setupTime();
	setupGestureSensor();

	logLocalTime();
	lastTimeLogMs = millis();
}

void loop() {
	if (WiFi.status() != WL_CONNECTED) {
		connectWiFi();
	}

	ensureTimeConfigured();

	ArduinoOTA.handle();
	processGestureInterrupt();
	updateBrightnessAnimation();

	unsigned long now = millis();
	if ((now - lastTimeLogMs) >= TIME_LOG_INTERVAL_MS) {
		logLocalTime();
		lastTimeLogMs = now;
	}

	delay(5);
}
