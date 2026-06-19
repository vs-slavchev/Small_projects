#define debug_print // comment out to disable debug

#define BOT_NAME "cherry-3-pot" // CHANGE NAME

// Pins
#define PUMP_PIN 32
#define SENSOR_POWER_PIN 16
#define MOISTURE_PIN 34
#define BATTERY_GAUGE_PIN 35
#define WATER_LEVEL_PIN_A 17
#define WATER_LEVEL_PIN_B 18
#define TEMPERATURE_POWER_PIN 13
#define ONE_WIRE_BUS 14

// Voltage divider: 20k (high side) + 47k (low side)
// Vbat = Vadc * (20k + 47k) / 47k
#define BATTERY_DIVIDER_NUM 67
#define BATTERY_DIVIDER_DEN 47

// values gotten from testing
#define AIR_MOISTURE 2900
#define WATER_MOISTURE 1000

#define WATERING_DURATION_S 150
#define SECONDS_TO_SLEEP 1800 // 60s * 30m = 1800

// AWS IoT settings
#define AWS_IOT_PUBLISH_TOPIC   "esp32/pub"
#define AWS_IOT_SUBSCRIBE_TOPIC "esp32/sub"
