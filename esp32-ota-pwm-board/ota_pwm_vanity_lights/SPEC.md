# OTA PWM Vanity Lights Spec

## Overview

This sketch controls a MOSFET-driven LED strip from an ESP32 using:

- Wi-Fi connectivity
- Arduino OTA updates
- NTP-backed local time
- APDS-9960 gesture input via interrupt pin
- PWM brightness control with eased transitions

Primary sketch: `ota_pwm_vanity_lights.ino`

## Hardware Assumptions

- ESP32
- LED strip driven through a MOSFET on PWM-capable `GPIO 32`
- APDS-9960 gesture sensor
- APDS-9960 interrupt pin connected to `GPIO 27`
- I2C on ESP32 default `Wire.begin()` pins

## APDS-9960 Wiring

The sketch assumes the APDS-9960 is wired to the ESP32 as follows:

- ESP32 `3V3` -> APDS-9960 `VCC`
- ESP32 `GND` -> APDS-9960 `GND`
- ESP32 `GPIO 21` -> APDS-9960 `SDA`
- ESP32 `GPIO 22` -> APDS-9960 `SCL`
- ESP32 `GPIO 27` -> APDS-9960 `INT`

Notes:

- `INT` is used for gesture-trigger interrupts and is configured as an input with pull-up
- I2C pin assumptions come from the current `Wire.begin()` default pin mapping on ESP32
- If different I2C pins are needed later, the sketch would need an explicit `Wire.begin(SDA, SCL)` update

## Network and OTA

- Wi-Fi credentials and OTA password are loaded from the shared `../secrets.h`
- OTA hostname: `esp32-vanity-lights`
- OTA must remain responsive while gesture and brightness logic are running

## Time Behavior

- Local timezone: `Europe/Sofia`
- NTP servers:
  - `pool.ntp.org`
  - `time.nist.gov`
- Time sync is initialized at boot
- The sketch uses the ESP32 local clock for runtime decisions
- Gesture handling must not wait on blocking time lookups
- Time config may be refreshed periodically, but turn-on gesture handling must remain immediate

## Quiet Hours Policy

Turning the strip on is disallowed between `00:00` and `07:30` local time.

### Enforcement rule

Only transitions from `0%` brightness to a value greater than `0%` are blocked.

### If local time is unavailable

- Any turn-on action from `0%` is blocked for safety
- Turn-off actions remain allowed

## Gesture Handling

The APDS-9960 is used in an interrupt-driven manner:

- The sensor asserts `INT`
- The ISR only sets a pending flag
- Gesture decoding is performed in the main loop

### Debounce

- Debounce window: `350 ms`
- Gestures arriving within that window after a handled gesture are ignored

## Gesture Map

- `UP` -> set brightness target to `100%`
- `DOWN` -> set brightness target to `0%`
- `LEFT` -> reduce brightness target by `20%`
- `RIGHT` -> increase brightness target by `20%`
- `NEAR` -> ignored
- `FAR` -> ignored

## Brightness and Animation

- PWM frequency: `5000 Hz`
- PWM resolution: `13 bits`
- Brightness range: `0%..100%`
- Transitions are non-blocking
- Transitions use an ease-out cubic curve
- Current animation duration: `450 ms`

## Requested vs Current Brightness

The implementation distinguishes between:

- **current brightness**: the live PWM output level at this instant
- **requested/target brightness**: the destination level of the active transition

During an active fade, `LEFT` and `RIGHT` modify the target brightness, not the current visible instantaneous level.

## Edge Cases and Expected Behavior

### Swipe right while fully off

- Target becomes `20%`
- If local time is valid and current time is after `07:30`, an eased fade starts from `0% -> 20%`
- If current time is between `00:00` and `07:30`, the request is blocked
- If time has not been synced yet, the request is blocked

### Swipe up while fully off

- Same as above, except target becomes `100%`

### Swipe left while fully off

- Target remains `0%`
- No visible change

### Swipe down while fully off

- Target remains `0%`
- No visible change

### Swipe down while still turning on

- The active animation is replaced
- A new eased fade starts from the current instantaneous brightness down to `0%`

### Swipe up while still turning off

- If current brightness is still above `0%`, the strip is treated as already on
- A new eased fade starts from the current instantaneous brightness to `100%`
- This remains allowed during quiet hours because the guard only blocks transitions from exactly `0%`

### Swipe right while still turning off

- If current brightness is still above `0%`, the fade may reverse upward
- The new target increases by `20%` from the requested target logic
- If brightness has already reached `0%`, quiet-hours and time-availability rules apply again

### Swipe left while still turning on

- Reduction is based on the current requested target, not the visible instantaneous level
- Example: if the strip is fading toward `100%`, `LEFT` changes target to `80%`

### Swipe right while still turning on

- Increase is based on the current requested target, not the visible instantaneous level
- Example: if the current target is `60%`, `RIGHT` changes it to `80%`

### Repeated fast swipes

- Any gesture received within `350 ms` of the previous handled gesture is ignored
- This includes gestures in a different direction

### Multiple interrupts from one swipe

- Duplicate events are typically suppressed by the debounce window
- If duplicate events arrive outside the debounce window, they may still be processed

### Time unavailable after boot

- Any turn-on request from `0%` is blocked
- Turn-off remains allowed

### Wi-Fi disconnected after time was previously synced

- Gesture handling remains immediate
- Quiet-hours decisions continue using the local ESP32 clock
- Runtime behavior does not require a live NTP request per gesture

### APDS-9960 initialization failure

- Gesture control is unavailable
- Wi-Fi, OTA, time, and PWM subsystems continue to function

### `NEAR` and `FAR` gestures

- Ignored by design

## Known Current Behavior

The quiet-hours block only applies to transitions from exactly `0%` to a value above `0%`.

This means:

- Increasing brightness while already on is allowed during quiet hours
- If the strip is fading down but has not yet reached `0%`, a new increase gesture can reverse the fade during quiet hours

This is intentional according to the current implementation and should be preserved unless the policy is explicitly changed.
