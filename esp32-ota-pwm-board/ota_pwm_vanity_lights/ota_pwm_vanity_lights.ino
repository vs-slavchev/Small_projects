/*
	ESP32 OTA PWM Vanity Lights
	Features:
		- Wi-Fi + OTA updates using shared secrets config
		- NTP time sync with Europe/Sofia timezone
		- MOSFET-driven PWM control for an LED strip
		- Rotary encoder input using interrupt-driven reading
		- Software debounce for rotary changes and button clicks

	Control map:
		- Rotate right / clockwise: increase brightness by 3%
		- Rotate left / counter-clockwise: decrease brightness by 3%
		- Button press: toggle off/on with eased animation

	Quiet hours:
		- Turning the strip on above 10% is limited to 10% between 00:00 and 07:30 local time.
		- If local time is unavailable, turn-on requests are allowed.

	Hardware defaults used here:
		- PWM output: GPIO 32
		- Encoder CLK/A: GPIO 19
		- Encoder DT/B: GPIO 21
		- Encoder SW: GPIO 22
*/

#include <WiFi.h>
#include <ArduinoOTA.h>
#include <AiEsp32RotaryEncoder.h>
#include <esp_arduino_version.h>
#include <time.h>
#include "../secrets.h"

static const char* OTA_HOSTNAME = "esp32-vanity-lights";
static const char* NTP_PRIMARY = "pool.ntp.org";
static const char* NTP_SECONDARY = "time.nist.gov";
static const char* TZ_INFO = "EET-2EEST,M3.5.0/3,M10.5.0/4";

static const uint8_t PWM_PIN = 32;
static const uint8_t ONBOARD_LED_PIN = 2;
static const uint8_t PWM_CHANNEL = 0;
static const uint32_t PWM_FREQ = 5000;
static const uint8_t PWM_RES_BITS = 13;

static const uint8_t ENCODER_CLK_PIN = 19;
static const uint8_t ENCODER_DT_PIN = 21;
static const uint8_t ENCODER_SW_PIN = 22;
static const int ENCODER_VCC_PIN = -1;
static const uint8_t ENCODER_STEPS = 4;

static const unsigned long TIME_RESYNC_INTERVAL_MS = 3600000;
static const unsigned long BRIGHTNESS_ANIMATION_MS = 450;
static const unsigned long ROTARY_DEBOUNCE_MS = 35;
static const unsigned long BUTTON_DEBOUNCE_MS = 180;
static const unsigned long BUTTON_CLICK_TIMEOUT_MS = 400;
static const uint8_t BRIGHTNESS_STEP_PCT = 3;
static const uint8_t QUIET_HOURS_MAX_BRIGHTNESS_PCT = 10;
static const time_t MIN_VALID_EPOCH = 1704067200; // 2024-01-01 00:00:00 UTC

static const long ENCODER_MIN_LEVEL = 0;
static const long ENCODER_MAX_LEVEL = (100 + BRIGHTNESS_STEP_PCT - 1) / BRIGHTNESS_STEP_PCT;

AiEsp32RotaryEncoder rotaryEncoder(
	ENCODER_CLK_PIN,
	ENCODER_DT_PIN,
	ENCODER_SW_PIN,
	ENCODER_VCC_PIN,
	ENCODER_STEPS,
	false
);

uint8_t currentBrightnessPct = 0;
uint8_t targetBrightnessPct = 0;
uint8_t animationStartBrightnessPct = 0;
uint8_t rememberedOnBrightnessPct = 100;
long lastEncoderLevel = ENCODER_MIN_LEVEL;
unsigned long lastEncoderHandledMs = 0;
unsigned long lastButtonHandledMs = 0;
unsigned long lastTimeSetupMs = 0;
unsigned long brightnessAnimationStartMs = 0;
bool timeConfigured = false;
bool awaitingTimeSyncLog = false;
bool brightnessAnimationActive = false;
bool hasUsedButtonTurnOn = false;

void IRAM_ATTR readEncoderISR() {
	rotaryEncoder.readEncoder_ISR();
}

uint32_t dutyFromPercent(uint8_t percent) {
	const uint32_t dutyMax = (1U << PWM_RES_BITS) - 1U;
	return ((uint32_t)percent * dutyMax) / 100U;
}

bool attachPwmOutput() {
	#if ESP_ARDUINO_VERSION_MAJOR >= 3
	return ledcAttachChannel(PWM_PIN, PWM_FREQ, PWM_RES_BITS, PWM_CHANNEL);
	#else
	ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RES_BITS);
	ledcAttachPin(PWM_PIN, PWM_CHANNEL);
	return true;
	#endif
}

void writePwmDuty(uint32_t duty) {
	#if ESP_ARDUINO_VERSION_MAJOR >= 3
	ledcWriteChannel(PWM_CHANNEL, duty);
	#else
	ledcWrite(PWM_CHANNEL, duty);
	#endif
}

long brightnessPercentToEncoderLevel(uint8_t percent) {
	if (percent > 100) {
		percent = 100;
	}
	if (percent == 100) {
		return ENCODER_MAX_LEVEL;
	}

	return (long)((percent + (BRIGHTNESS_STEP_PCT / 2)) / BRIGHTNESS_STEP_PCT);
}

uint8_t encoderLevelToBrightnessPercent(long level) {
	if (level < ENCODER_MIN_LEVEL) {
		level = ENCODER_MIN_LEVEL;
	}
	if (level > ENCODER_MAX_LEVEL) {
		level = ENCODER_MAX_LEVEL;
	}
	if (level == ENCODER_MAX_LEVEL) {
		return 100;
	}

	return (uint8_t)(level * BRIGHTNESS_STEP_PCT);
}

uint8_t requestedBrightness() {
	return brightnessAnimationActive ? targetBrightnessPct : currentBrightnessPct;
}

void syncEncoderToRequestedBrightness() {
	long level = brightnessPercentToEncoderLevel(requestedBrightness());
	rotaryEncoder.setEncoderValue(level);
	lastEncoderLevel = rotaryEncoder.readEncoder();
}

uint8_t clampAwakeRestoreBrightness(uint8_t percent) {
	if (percent > 100) {
		percent = 100;
	}
	if (percent < QUIET_HOURS_MAX_BRIGHTNESS_PCT) {
		return QUIET_HOURS_MAX_BRIGHTNESS_PCT;
	}

	return percent;
}

void rememberOnBrightness(uint8_t percent) {
	if (percent == 0) {
		return;
	}

	if (percent > 100) {
		percent = 100;
	}

	rememberedOnBrightnessPct = percent;
}

uint8_t resolveButtonOnBrightness() {
	if (!hasUsedButtonTurnOn) {
		return 100;
	}

	if (isQuietHours()) {
		return QUIET_HOURS_MAX_BRIGHTNESS_PCT;
	}

	return clampAwakeRestoreBrightness(rememberedOnBrightnessPct);
}

void writeBrightnessNow(uint8_t percent, bool verbose = true) {
	if (percent > 100) {
		percent = 100;
	}

	currentBrightnessPct = percent;
	uint32_t duty = dutyFromPercent(percent);
	writePwmDuty(duty);
	if (verbose) {
		Serial.printf("[PWM] Brightness set to %u%% (duty=%lu)\n", currentBrightnessPct, (unsigned long)duty);
	}
	if (!brightnessAnimationActive) {
		targetBrightnessPct = currentBrightnessPct;
	}
}

float easeInCubic(float t) {
	return t * t * t;
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
	if (!attachPwmOutput()) {
		Serial.println("[PWM] Failed to attach LEDC output");
		return;
	}

	writeBrightnessNow(0);
}

void runStartupDiagnostic() {
	pinMode(PWM_PIN, OUTPUT);
	pinMode(ONBOARD_LED_PIN, OUTPUT);

	for (uint8_t flash = 0; flash < 3; ++flash) {
		digitalWrite(PWM_PIN, HIGH);
		digitalWrite(ONBOARD_LED_PIN, HIGH);
		delay(1000);
		digitalWrite(PWM_PIN, LOW);
		digitalWrite(ONBOARD_LED_PIN, LOW);
		delay(500);
	}
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
	awaitingTimeSyncLog = true;
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

bool formatLocalTime(char* buffer, size_t bufferSize) {
	struct tm timeInfo;
	if (!getLocalTimeFromClock(&timeInfo)) {
		return false;
	}

	strftime(buffer, bufferSize, "%Y-%m-%d %H:%M:%S %Z", &timeInfo);
	return true;
}

void ensureTimeConfigured() {
	unsigned long nowMs = millis();
	if (!timeConfigured || (WiFi.status() == WL_CONNECTED && (nowMs - lastTimeSetupMs) >= TIME_RESYNC_INTERVAL_MS)) {
		setupTime();
	}
}

void logTimeSyncStatus() {
	if (!awaitingTimeSyncLog) {
		return;
	}

	char buf[64];
	if (!formatLocalTime(buf, sizeof(buf))) {
		return;
	}

	awaitingTimeSyncLog = false;
	Serial.printf("[Time] Synced: %s\n", buf);
}

void logInputEvent(const char* label) {
	char buf[64];
	if (formatLocalTime(buf, sizeof(buf))) {
		Serial.printf("[Input] %s at %s\n", label, buf);
		return;
	}

	Serial.printf("[Input] %s at unknown time\n", label);
}

bool isQuietHours() {
	struct tm timeInfo;
	if (!getLocalTimeFromClock(&timeInfo)) {
		return false;
	}

	int minutes = (timeInfo.tm_hour * 60) + timeInfo.tm_min;
	return minutes < 450; // 07:30 = 450 minutes
}

bool requestBrightness(uint8_t targetPercent) {
	if (targetPercent > 100) {
		targetPercent = 100;
	}

	if (currentBrightnessPct == 0 && targetPercent > 0) {
		if (isQuietHours() && targetPercent > QUIET_HOURS_MAX_BRIGHTNESS_PCT) {
			Serial.printf("[Policy] Quiet hours active; limiting turn-on to %u%%\n", QUIET_HOURS_MAX_BRIGHTNESS_PCT);
			targetPercent = QUIET_HOURS_MAX_BRIGHTNESS_PCT;
		}
	}
	if (targetPercent > 0) {
		rememberOnBrightness(targetPercent);
	}

	startBrightnessTransition(targetPercent);
	syncEncoderToRequestedBrightness();
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
	float eased = easeInCubic(t);
	float delta = (float)targetBrightnessPct - (float)animationStartBrightnessPct;
	uint8_t nextBrightness = (uint8_t)lroundf((float)animationStartBrightnessPct + (delta * eased));
	writeBrightnessNow(nextBrightness, false);
}

void setupEncoder() {
	rotaryEncoder.begin();
	rotaryEncoder.isButtonPulldown = false;
	rotaryEncoder.setup(readEncoderISR);
	rotaryEncoder.setBoundaries(ENCODER_MIN_LEVEL, ENCODER_MAX_LEVEL, false);
	rotaryEncoder.disableAcceleration();
	rotaryEncoder.setEncoderValue(ENCODER_MIN_LEVEL);
	lastEncoderLevel = rotaryEncoder.readEncoder();
	Serial.println("[Encoder] Rotary encoder ready");
}

void processEncoderRotation() {
	long encoderLevel = rotaryEncoder.readEncoder();
	if (encoderLevel == lastEncoderLevel) {
		return;
	}

	unsigned long now = millis();
	if ((now - lastEncoderHandledMs) < ROTARY_DEBOUNCE_MS) {
		return;
	}

	long previousLevel = lastEncoderLevel;
	lastEncoderLevel = encoderLevel;
	lastEncoderHandledMs = now;

	if (encoderLevel > previousLevel) {
		logInputEvent("ROTATE RIGHT");
	} else {
		logInputEvent("ROTATE LEFT");
	}

	requestBrightness(encoderLevelToBrightnessPercent(encoderLevel));
}

void processEncoderButton() {
	if (!rotaryEncoder.isEncoderButtonClicked(BUTTON_CLICK_TIMEOUT_MS)) {
		return;
	}

	unsigned long now = millis();
	if ((now - lastButtonHandledMs) < BUTTON_DEBOUNCE_MS) {
		return;
	}

	lastButtonHandledMs = now;
	if (requestedBrightness() == 0) {
		logInputEvent("BUTTON ON");
		hasUsedButtonTurnOn = true;
		requestBrightness(resolveButtonOnBrightness());
		return;
	}

	logInputEvent("BUTTON OFF");
	requestBrightness(0);
}

void setup() {
	runStartupDiagnostic();
	Serial.begin(115200);
	setupPWM();
	delay(200);
	Serial.println();
	Serial.println("=== ESP32 OTA PWM Vanity Lights ===");
	connectWiFi();
	setupOTA();
	setupTime();
	logTimeSyncStatus();
	setupEncoder();
	writeBrightnessNow(0, false);
	syncEncoderToRequestedBrightness();
}

void loop() {
	if (WiFi.status() != WL_CONNECTED) {
		connectWiFi();
	}

	ensureTimeConfigured();
	logTimeSyncStatus();

	ArduinoOTA.handle();
	processEncoderRotation();
	processEncoderButton();
	updateBrightnessAnimation();

	delay(5);
}
