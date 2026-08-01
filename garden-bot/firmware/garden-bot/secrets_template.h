#include <pgmspace.h>
 
#define SECRET
#define AWS_THINGNAME "***************"                         //change this

const char* ntpServer = "pool.ntp.org";
// Timezone lives in config.h as TZ_INFO (a full POSIX TZ string with DST rules).
// The old gmtOffset_sec/daylightOffset_sec pair is no longer read - you can drop
// it from your local secrets.h.

const char WIFI_SSID[] = "***************";               //change this
const char WIFI_PASSWORD[] = "***************";           //change this
const char AWS_IOT_ENDPOINT[] = "***************";       //change this

// 6-digit passkey the BLE central (the laptop running read_logs.py) must
// supply to pair before it can read the logs. The ESP32 has no
// display/keyboard, so this fixed value stands in for the passkey it would
// otherwise show on screen.
#define BLE_PASSKEY 123456                                        //change this
 
// Amazon Root CA 1
static const char AWS_CERT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
 
-----END CERTIFICATE-----
)EOF";
 
// Device Certificate                                               //change this``
static const char AWS_CERT_CRT[] PROGMEM = R"KEY(
-----BEGIN CERTIFICATE-----
 
-----END CERTIFICATE-----
 
 
)KEY";
 
// Device Private Key                                               //change this
static const char AWS_CERT_PRIVATE[] PROGMEM = R"KEY(
-----BEGIN RSA PRIVATE KEY-----
 
-----END RSA PRIVATE KEY-----
 
 
)KEY";
