# ESP32 OTA PWM Board

Sensitive values were moved out of the sketches and into a shared config header.

## Sketches

- `ota_led_pwm_test/ota_led_pwm_test.ino`
- `plant_stand_led/plant_stand_led.ino`
- `ota_pwm_vanity_lights/ota_pwm_vanity_lights.ino`

## Setup

1. Rename `secrets_temp.h` to `secrets.h`.
2. Edit `secrets.h` and set your Wi-Fi SSID, Wi-Fi password, and OTA password.
3. Keep `secrets_temp.h` in version control as the template.
4. Do not commit `secrets.h`; it is ignored by Git.

## Additional library for vanity lights sketch

Install the SparkFun APDS-9960 Arduino library before building `ota_pwm_vanity_lights`.

All sketches include the same shared config file:

- `ota_led_pwm_test/ota_led_pwm_test.ino`
- `plant_stand_led/plant_stand_led.ino`
- `ota_pwm_vanity_lights/ota_pwm_vanity_lights.ino`
