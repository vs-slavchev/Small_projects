//#define debug_print // comment out to disable debug

#define BOT_NAME "cherry-2-pot" // CHANGE NAME

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

#define WATERING_DURATION_S 120
#define SECONDS_TO_SLEEP 1800 // 60s * 30m = 1800

#define WIFI_CONNECT_TIMEOUT_MS 30000
#define AWS_CONNECT_TIMEOUT_MS 15000

// AWS IoT settings
#define AWS_IOT_PUBLISH_TOPIC   "esp32/pub"
#define AWS_IOT_SUBSCRIBE_TOPIC "esp32/sub"

// Backlog of readings queued in RTC memory while AWS is unreachable.
// 48 entries * ~32 bytes = ~1.5KB, well within the ~8KB RTC slow memory
// budget; covers a 24h outage at the 30-min cycle before oldest drops.
#define MESSAGE_QUEUE_SIZE 48

// BLE: current-run log dump + OTA. Logs are read during the normal wake's
// short advertising window; OTA extends the wake until done or timed out.
// 16-bit UUIDs (vs. 128-bit) keep the advertising payload under the legacy
// 31-byte PDU limit when combined with the OTA service UUID.
// 512 is a hard BLE ATT protocol ceiling on a single attribute's value
// length (independent of MTU) - going higher just gets silently clamped
// by the stack, so there's no point configuring more than this.
#define LOG_BUFFER_MAX_CHARS 512
#define LOG_SERVICE_UUID "FFA0"
#define LOG_CHAR_UUID    "FFA1"
#define OTA_MAX_WAIT_MS (5UL * 60 * 1000) // abort a stalled OTA after 5 minutes
// A plain log-read connection (no OTA) only needs long enough to pair and
// do one read - cap it short so a client that connects but never finishes
// (or never disconnects) can't keep the device awake burning battery.
#define BLE_CLIENT_MAX_WAIT_MS (30UL * 1000)
