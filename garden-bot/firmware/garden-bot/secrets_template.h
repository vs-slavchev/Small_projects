#include <pgmspace.h>
 
#define SECRET
#define AWS_THINGNAME "***************"                         //change this

const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 7200; //GMT+2
const int   daylightOffset_sec = 3600; // usually 1h

const char WIFI_SSID[] = "***************";               //change this
const char WIFI_PASSWORD[] = "***************";           //change this
const char AWS_IOT_ENDPOINT[] = "***************";       //change this

// 6-digit passkey the BLE central (e.g. a laptop OTA script) must supply
// to pair before it can read logs or push an OTA update. The ESP32 has no
// display/keyboard, so this fixed value stands in for the passkey it would
// otherwise show on screen.
#define OTA_BLE_PASSKEY 123456                                    //change this
 
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
