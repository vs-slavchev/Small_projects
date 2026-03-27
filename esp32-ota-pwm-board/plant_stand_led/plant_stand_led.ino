/*
	ESP32 Plant Stand LED Controller (extended)
	Features added:
		- WiFi connection (replace WIFI_SSID / WIFI_PASSWORD)
		- Arduino OTA updates over the network
		- NTP time sync with Europe/Sofia timezone (EET / EEST DST rules)
		- Periodic time printing every 60 seconds

	OTA Usage:
		1. Set WIFI_SSID and WIFI_PASSWORD below.
		2. Upload this sketch via USB once.
		3. After boot, find the device's IP in Serial Monitor.
		4. In Arduino IDE: Tools > Port (select network port) OR use 'espota.py' for advanced OTA.

	Timezone Rule string breakdown (POSIX TZ):
		"EET-2EEST,M3.5.0/3,M10.5.0/4"
			Standard:  EET (UTC+2)  -> represented as -2 in POSIX (inverse sign convention)
			DST:       EEST (UTC+3)
			Starts:    March, 5th week, Sunday at 03:00 local
			Ends:      October, 5th week, Sunday at 04:00 local
*/

#include <WiFi.h>
#include <ArduinoOTA.h>
#include <time.h>
#include <math.h>
#include <stdarg.h>
#include "../secrets.h"

// -------- NTP Servers --------
const char* NTP_PRIMARY   = "pool.ntp.org";
const char* NTP_SECONDARY = "time.nist.gov";

// -------- Touch Input --------
static const uint8_t TOUCH_PIN = 33; // ESP32 Touch T8

// -------- PWM Output (ESP32 LEDC) --------
static const uint8_t PWM_PIN = 32;   // Output pin for LED/PWM
static const uint8_t PWM_CHANNEL = 0; // LEDC channel (0-15 on ESP32)
static const uint32_t PWM_FREQ = 5000; // PWM frequency in Hz
static const uint8_t PWM_RES_BITS = 13; // PWM resolution in bits (up to 16)

// -------- Test Simulation --------
// When TEST_RUN is true, PWM uses a simulated seconds-to-sunset value
// that starts at +5 and counts down once per second into negatives.
static const bool TEST_RUN = false;    // Set true to enable simulation

void setupPWM() {
	// Configure LEDC PWM on the specified pin
	ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RES_BITS);
	ledcAttachPin(PWM_PIN, PWM_CHANNEL);
	// Start with 0% duty (LOW)
	ledcWrite(PWM_CHANNEL, 0);
}

// -------- Network Log (Telnet) --------
// Connect via: telnet <device-ip> 23  OR  nc <device-ip> 23
WiFiServer logServer(23);
WiFiClient logClient;

void startLogServer() {
	logServer.begin();
	logServer.setNoDelay(true);
}

void handleLogClient() {
	if (!logClient || !logClient.connected()) {
		WiFiClient incoming = logServer.available();
		if (incoming) {
			if (logClient && logClient.connected()) {
				logClient.stop();
			}
			logClient = incoming;
		}
	}
}

inline void netPrint(const char* s) {
	if (logClient && logClient.connected()) {
		logClient.print(s);
	}
}

void logf(const char* fmt, ...) {
	char buf[256];
	va_list ap;
	va_start(ap, fmt);
	vsnprintf(buf, sizeof(buf), fmt, ap);
	va_end(ap);
	Serial.print(buf);
	netPrint(buf);
}

void log(const char* s) {
	Serial.print(s);
	netPrint(s);
}

void logln(const char* s) {
	Serial.println(s);
	if (logClient && logClient.connected()) {
		logClient.println(s);
	}
}

void bootLightAnimation() {
  const uint32_t dutyMax = (1U << PWM_RES_BITS) - 1U;

  logln("[Boot] Light animation start");

  // ---- Fade up over 3 seconds ----
  for (int i = 0; i <= 300; i++) {
    float t = (float)i / 300.0f;          // 0..1
    uint32_t duty = (uint32_t)(t * dutyMax);
    ledcWrite(PWM_CHANNEL, duty);
    delay(10); // 300 steps * 10ms = 3000ms
  }

  // ---- Hold for 3 seconds ----
  delay(3000);

  // ---- Fade down over 3 seconds ----
  for (int i = 300; i >= 0; i--) {
    float t = (float)i / 300.0f;          // 1..0
    uint32_t duty = (uint32_t)(t * dutyMax);
    ledcWrite(PWM_CHANNEL, duty);
    delay(10);
  }

  ledcWrite(PWM_CHANNEL, 0);
  logln("[Boot] Light animation done");
}


// Update PWM on pin 32 based on seconds to sunset.
// If seconds > 0 (sunset in future): duty = 0%.
// If seconds <= 0 (after sunset): map 0s -> 0%, -600s -> 100%, clamp at 100%.
void updateSunsetPWM(long secondsToSunset) {
	const uint32_t dutyMax = (1U << PWM_RES_BITS) - 1U;
	uint32_t duty = 0;
	float pct = 0.0f;
	if (secondsToSunset <= 0) {
		long secondsAfterSunset = -secondsToSunset;
		if (secondsAfterSunset >= 600) {
			duty = dutyMax; // 100%
			pct = 100.0f;
		} else {
			pct = (float)secondsAfterSunset / 600.0f * 100.0f; // 0..100
			duty = (uint32_t)lrintf((pct / 100.0f) * (float)dutyMax);
		}
	} else {
		duty = 0;
		pct = 0.0f;
	}
	ledcWrite(PWM_CHANNEL, duty);
	Serial.printf("[PWM] pin %u duty=%u (%.1f%%)\n", PWM_PIN, duty, pct);
}

// Simulated seconds-to-sunset for testing. Starts at +5 and decreases
// once per second; becomes negative after 5 seconds.
long simulatedSecondsToSunset() {
	unsigned long ms = millis();
	long elapsed = (long)(ms / 1000UL);
	return 10 - elapsed;
}

boolean isCapacitiveTouchNear() {
	uint16_t val = touchRead(TOUCH_PIN);
	logf("[Touch] capacitive raw=%u\n", val);
	// Threshold value to determine "near" state (adjust as needed)
	return val < 35;
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
	ArduinoOTA.setHostname("esp32-plant-stand");
	ArduinoOTA.setPassword(OTA_PASSWORD);

	ArduinoOTA.onStart([]() {
		String type = (ArduinoOTA.getCommand() == U_FLASH) ? "sketch" : "filesystem";
		logln((String("[OTA] Start updating ") + type).c_str());
	});
	ArduinoOTA.onEnd([]() {
		logln("\n[OTA] Update complete");
	});
	ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
		static unsigned long lastPct = 0;
		unsigned long pct = (progress * 100) / total;
		if (pct != lastPct) { // reduce spam
			logf("[OTA] Progress: %u%%\n", pct);
			lastPct = pct;
		}
	});
	ArduinoOTA.onError([](ota_error_t error) {
		logf("[OTA] Error[%u]: ", error);
		switch (error) {
			case OTA_AUTH_ERROR:    logln("Auth Failed"); break;
			case OTA_BEGIN_ERROR:   logln("Begin Failed"); break;
			case OTA_CONNECT_ERROR: logln("Connect Failed"); break;
			case OTA_RECEIVE_ERROR: logln("Receive Failed"); break;
			case OTA_END_ERROR:     logln("End Failed"); break;
			default:                logln("Unknown"); break;
		}
	});
	ArduinoOTA.begin();
	logln("[OTA] Ready for updates");
}

// Configure timezone and start NTP sync
void setupTime() {
	// Preferred helper: sets TZ and NTP in one call
	configTzTime("EET-2EEST,M3.5.0/3,M10.5.0/4", NTP_PRIMARY, NTP_SECONDARY);
	logln("[Time] NTP + TZ config initiated (Europe/Sofia)");
}

bool getAndPrintLocalTime(bool verbose = true) {
	struct tm timeinfo;
	if (!getLocalTime(&timeinfo, 5000)) { // 5s timeout
		if (verbose) logln("[Time] Failed to obtain time");
		return false;
	}
	char buf[64];
	strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S %Z", &timeinfo);
	if (verbose) {
		log("[Time] Current local time: ");
		logln(buf);
	}
	return true;
}

	// Compute seconds until today's sunset in Europe/Sofia.
	// Positive: sunset is in the future; Negative: sunset has passed.
	// Uses NOAA-style sunrise/sunset approximation and current local time from NTP.
	long secondsUntilSunsetSofia() {
		struct tm localTm;
		if (!getLocalTime(&localTm, 3000)) {
			// Time not ready
			return 0;
		}

		// Sofia coordinates
		const double lat = 42.6977;   // degrees North
		const double lon = 23.3219;   // degrees East
		const double zenith = 90.833; // standard civil sunrise/sunset
		const double DEG2RAD = M_PI / 180.0;
		const double RAD2DEG = 180.0 / M_PI;

		// Day of year (1..366)
		int N = localTm.tm_yday + 1;

		// Timezone offset in minutes (accounts for DST), derived from local vs UTC
		time_t nowEpoch = time(nullptr);
		struct tm localNow, utcNow;
		localtime_r(&nowEpoch, &localNow);
		gmtime_r(&nowEpoch, &utcNow);
		long tzOffsetSec = (long)difftime(mktime(&localNow), mktime(&utcNow));
		long tzOffsetMin = tzOffsetSec / 60;

		// Equation of Time (minutes) and solar declination (degrees)
		double B = 2.0 * M_PI * (double)(N - 81) / 364.0;
		double EoT = 9.87 * sin(2.0 * B) - 7.53 * cos(B) - 1.5 * sin(B);
		double decl = 23.45 * sin(2.0 * M_PI * (double)(284 + N) / 365.0);

		// Hour angle for sunset (degrees)
		double sinDec = sin(decl * DEG2RAD);
		double cosDec = cos(decl * DEG2RAD);
		double sinLat = sin(lat * DEG2RAD);
		double cosLat = cos(lat * DEG2RAD);
		double cosZenith = cos(zenith * DEG2RAD);
		double cosH = (cosZenith - sinLat * sinDec) / (cosLat * cosDec);
		if (cosH < -1.0) cosH = -1.0;
		if (cosH > 1.0)  cosH = 1.0;
		double H = acos(cosH) * RAD2DEG; // degrees

		// Solar noon (local minutes) and sunset (local minutes)
		double solarNoonMin = 720.0 - 4.0 * lon - EoT + (double)tzOffsetMin;
		double sunsetMin = solarNoonMin + 4.0 * H;

		// Current local minutes + seconds
		long nowMin = localTm.tm_hour * 60L + localTm.tm_min;
		long nowSec = localTm.tm_sec;

		long diffSec = (long)llround((sunsetMin - (double)nowMin) * 60.0 - (double)nowSec);
		return diffSec;
	}

void setup() {
	Serial.begin(115200);
	delay(200);
	logln("");
	logln("=== ESP32 Plant Stand LED Controller Boot ===");
	connectWiFi();
	setupOTA();
	setupPWM();
  bootLightAnimation();
 	setupTime();
	startLogServer();
	// Attempt immediate time fetch (might need a short delay if first attempt fails)
	if (!getAndPrintLocalTime()) {
		logln("[Time] Will retry later.");
	}
}

void loop() {
	// Handle OTA updates
	ArduinoOTA.handle();
	// Accept telnet client connections
	handleLogClient();

	// Reconnect WiFi if dropped
	if (WiFi.status() != WL_CONNECTED) {
		logln("[WiFi] Lost connection. Reconnecting...");
		connectWiFi();
	}

	getAndPrintLocalTime();
	// Optional: print seconds until sunset for monitoring
	long s = secondsUntilSunsetSofia();
	logf("[Sunset] Seconds until sunset (Sofia): %ld\n", s);
	boolean near = isCapacitiveTouchNear();

	long sForPwm = TEST_RUN ? simulatedSecondsToSunset() : s;
	if (TEST_RUN) {
		logf("[Test] Sim sunset seconds: %ld\n", sForPwm);
	}
	updateSunsetPWM(sForPwm);
	

	// ...existing future LED logic could go here...
	// Small delay to reduce idle spin
	delay(1000);
}
