// #define debug_print // comment out to disable debug

#define BOT_NAME "veso-cherry-watcher" // CHANGE NAME
 
// Pins
#define PUMP_PIN 32
#define SENSOR_POWER_PIN 33
#define MOISTURE_1_PIN 34
#define MOISTURE_2_PIN 35
#define BATTERY_GAUGE_PIN 39
#define ONE_WIRE_BUS 5 // temp sensor pin
// #define POTENTIOMETER_PIN 36
#define DIAGNOSTIC_PIN 16

// values gotten from testing
#define AIR_MOISTURE 2900
#define WATER_MOISTURE 1000

#define WATERING_DURATION_S 150 //150
#define SECONDS_TO_SLEEP  1800 // 60s * 30m = 1800

// AWS IoT settings
#define AWS_IOT_PUBLISH_TOPIC   "esp32/pub"
#define AWS_IOT_SUBSCRIBE_TOPIC "esp32/sub"