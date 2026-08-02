#define debug_print // comment out to disable debug

#define BOT_NAME "cherry-3-pot" // CHANGE NAME

// Pins
#define PUMP_PIN 32
#define SENSOR_POWER_PIN 16
#define MOISTURE_PIN 34
#define BATTERY_GAUGE_PIN 35
#define WATER_LEVEL_PIN_A 33 // bare GPIO pad, bypasses onboard RGB MOSFET header
#define WATER_LEVEL_PIN_B 25 // bare GPIO pad, bypasses onboard RGB MOSFET header
#define WATER_LEVEL_THRESHOLD 410 // ~10% of 12-bit ADC range (4095)
#define TEMPERATURE_POWER_PIN 13
#define ONE_WIRE_BUS 14

// Voltage divider: 20k (high side) + 47k (low side)
// Vbat = Vadc * (20k + 47k) / 47k
#define BATTERY_DIVIDER_NUM 67
#define BATTERY_DIVIDER_DEN 47

// values gotten from testing
#define AIR_MOISTURE 2900
#define WATER_MOISTURE 1000

#define WATERING_DURATION_S 150 // 50s per pot
#define SECONDS_TO_SLEEP 1800 // 60s * 30m = 1800

// POSIX TZ string, passed to configTzTime(). Must be a full spec including the
// DST transition rules - the configTime(gmtOffset, daylightOffset, ...) overload
// builds a TZ string with no rules, so the C library falls back to its defaults
// (US dates), which shifts the clock by an hour for the ~3 weeks in March and
// ~1 week in autumn where the US and EU changeovers disagree.
// EET-2EEST,M3.5.0/3,M10.5.0/4 = UTC+2, DST +1h, last Sunday of March 03:00 to
// last Sunday of October 04:00 (Europe/Sofia and the rest of EU Eastern time).
#define TZ_INFO "EET-2EEST,M3.5.0/3,M10.5.0/4"

// Assumed time since the last watering before any watering has happened in this
// power cycle - long enough that a freshly powered bot waters at its first
// opportunity rather than waiting out a full interval.
#define INITIAL_SECONDS_SINCE_WATERING (3600L * 24 * 10)

// How far the clock has to move during an NTP sync before we treat it as a
// correction rather than ordinary drift, and shift lastWateredEpoch to match.
// The ESP32 has no external RTC: its internal oscillator drifts by tens of
// seconds over a 30-minute sleep, and it starts from a hardcoded date after
// power loss, so a real correction is hours-to-years and ordinary drift is
// well under this.
#define CLOCK_JUMP_THRESHOLD_S 300

#define WIFI_CONNECT_TIMEOUT_MS 30000
#define AWS_CONNECT_TIMEOUT_MS 15000

// AWS IoT settings
#define AWS_IOT_PUBLISH_TOPIC   "esp32/pub"
#define AWS_IOT_SUBSCRIBE_TOPIC "esp32/sub"

// Backlog of readings queued in RTC memory while AWS is unreachable.
// 48 entries * ~40 bytes = ~1.9KB, well within the ~8KB RTC slow memory
// budget; covers a 24h outage at the 30-min cycle before oldest drops.
#define MESSAGE_QUEUE_SIZE 48

// BLE: current-run log dump, read during the normal wake's short advertising
// window (see read_logs.py). 16-bit UUIDs (vs. 128-bit) keep the advertising
// payload under the legacy 31-byte PDU limit.
// 512 is a hard BLE ATT protocol ceiling on a single attribute's value
// length (independent of MTU) - going higher just gets silently clamped
// by the stack, so there's no point configuring more than this.
#define LOG_BUFFER_MAX_CHARS 512
#define LOG_SERVICE_UUID "FFA0"
#define LOG_CHAR_UUID    "FFA1"
// Ceiling on how long deepSleep() waits out a still-connected BLE client
// (e.g. read_logs.py mid-read) before sleeping anyway. The wait exits as soon
// as the client disconnects on its own, so this only bites a client that
// hangs; read_logs.py finishes a read well within it.
#define BLE_CLIENT_MAX_WAIT_MS (30UL * 1000)
