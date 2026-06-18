# OTA PWM Vanity Lights Spec

## Overview

This sketch controls a MOSFET-driven LED strip from an ESP32 using:

- Wi-Fi connectivity
- Arduino OTA updates
- NTP-backed local time
- A 5-pin rotary encoder with push button
- Interrupt-driven rotary reading through the `Ai Esp32 Rotary Encoder` library
- PWM brightness control with eased transitions

Primary sketch: `ota_pwm_vanity_lights.ino`

## Required Library

Install this Arduino library before building the sketch:

- `Ai Esp32 Rotary Encoder` by Igor Antolic

### Arduino IDE install steps

1. Open `Sketch -> Include Library -> Manage Libraries...`
2. Search for `ai rotary`
3. Install `Ai Esp32 Rotary Encoder`

The old APDS-9960 library is no longer required for this sketch.

## Hardware Assumptions

- ESP32
- LED strip driven through a MOSFET on PWM-capable `GPIO 32`
- Rotary encoder module with 5 pins: `CLK`, `DT`, `SW`, `VCC`, `GND`
- Encoder rotation is read using interrupts on the two signal pins
- Encoder button toggles the light on and off

## Rotary Encoder Wiring

The sketch assumes the encoder is wired to the ESP32 as follows:

- ESP32 `GPIO 19` -> encoder `CLK` or `A`
- ESP32 `GPIO 21` -> encoder `DT` or `B`
- ESP32 `GPIO 22` -> encoder `SW`
- ESP32 `3V3` -> encoder `VCC`
- ESP32 `GND` -> encoder `GND`

### Notes

- This reuses the same ESP32 pins requested for the replacement: `19`, `21`, `22`
- The encoder library is constructed with the final `false` argument so ESP32 uses pull-ups on the encoder signal pins
- The button input also uses pull-up behavior
- If your module is labeled `A`, `B`, `SW`, `+`, `GND`, connect `A -> GPIO 19`, `B -> GPIO 21`, `SW -> GPIO 22`, `+ -> 3V3`, `GND -> GND`

## Network and OTA

- Wi-Fi credentials and OTA password are loaded from the shared `../secrets.h`
- OTA hostname: `esp32-vanity-lights`
- OTA must remain responsive while brightness and encoder logic are running

## Time Behavior

- Local timezone: `Europe/Sofia`
- NTP servers:
  - `pool.ntp.org`
  - `time.nist.gov`
- Time sync is initialized at boot
- The first successful local-time read is logged after sync becomes available
- The sketch uses the ESP32 local clock for runtime decisions
- Encoder handling must not wait on blocking network time requests
- Time config may be refreshed periodically during runtime

## Quiet Hours Policy

Turning the strip on is allowed between `00:00` and `07:30` local time, but only up to `10%` brightness.

### Enforcement rule

Only transitions from `0%` brightness to a value greater than `0%` are limited.

### Quiet-hours cap

- If a turn-on request from `0%` exceeds `10%` during quiet hours, it is reduced to `10%`
- Requests at `10%` or below are allowed unchanged
- Turn-off actions remain allowed

### If local time is unavailable

- Turn-on actions remain allowed
- Turn-off actions remain allowed

## Encoder Handling

The rotary encoder is used in an interrupt-driven manner:

- `GPIO 19` and `GPIO 21` are attached to interrupts through the encoder library
- The ISR path updates the encoder state using `readEncoder_ISR()`
- The main loop reads the current encoder position and applies brightness changes

### Debounce

The sketch adds software debounce on top of the library behavior:

- Rotary movement debounce window: `35 ms`
- Button action debounce window: `180 ms`
- Library click detection also performs its own short debounce internally

### Acceleration

- Encoder acceleration is disabled because the brightness range is small and the control should remain predictable

## Control Map

- Rotate right / clockwise -> increase brightness by `3%`
- Rotate left / counter-clockwise -> decrease brightness by `3%`
- Short button press -> toggle the light off or back on

Button turn-on behavior is:

- First button turn-on after boot -> `100%`
- Later button turn-ons during awake hours -> restore the previous remembered on level, but never below `10%`
- Later button turn-ons during sleep hours -> `10%`

The remembered on level is the last effective non-zero target brightness that the strip was using before being turned off.

## Brightness and Animation

- PWM frequency: `5000 Hz`
- PWM resolution: `13 bits`
- Brightness range: `0%..100%`
- Rotary changes target brightness in `3%` steps
- Transitions are non-blocking
- Transitions use an ease-in cubic curve
- Current animation duration: `450 ms`

## Requested vs Current Brightness

The implementation distinguishes between:

- **current brightness**: the live PWM output level at this instant
- **requested/target brightness**: the destination level of the active transition

During an active fade, a new rotation or button press replaces the current target with a new eased transition.

## Edge Cases and Expected Behavior

### Rotate right while fully off during awake hours

- Requested target becomes `3%`
- An eased fade starts from `0% -> 3%`
- The remembered on level becomes `3%`

### Rotate right while fully off during sleep hours

- Requested target becomes `3%`
- The quiet-hours policy still allows `3%` because it is at or below `10%`
- An eased fade starts from `0% -> 3%`
- The remembered on level becomes `3%`

### Rotate quickly from off toward a high level during sleep hours

- The encoder may request `12%`, `15%`, `18%`, or higher
- The quiet-hours policy limits the effective target to `10%`
- The encoder position is synchronized back to the limited target level so the knob state remains aligned with actual brightness
- The remembered on level becomes `10%`

### Rotate left while fully off

- Target remains `0%`
- No visible change
- The remembered on level is unchanged

### First button turn-on after boot during awake hours

- Target becomes `100%`
- An eased fade starts from `0% -> 100%`
- The remembered on level becomes `100%`

### First button turn-on after boot during sleep hours

- The button still requests `100%` as the first-on target
- The quiet-hours policy limits the effective target to `10%`
- An eased fade starts from `0% -> 10%`
- The remembered on level becomes `10%`

### Later button turn-on during awake hours with remembered level above `10%`

- Target becomes the remembered level
- Example: if the light was last on at `42%`, the next button turn-on requests `42%`

### Later button turn-on during awake hours with remembered level below `10%`

- The remembered level is clamped upward to `10%`
- Example: if the light was last on at `3%`, the next button turn-on requests `10%`

### Later button turn-on during sleep hours

- Target becomes `10%` regardless of the remembered level

### Press button while on

- Target becomes `0%`
- The strip fades down with the same ease-in animation
- The current remembered on level is kept for the next button-on action

### Press button to turn off during an active fade up

- The active fade is replaced by a fade to `0%`
- The remembered on level stays at the last effective non-zero target that was being faded toward

### Press button to turn on after turning off during an active fade up

- During awake hours, the strip restores that remembered target, clamped to at least `10%`
- During sleep hours, the strip turns on at `10%`

### Rotate during an active fade while already on

- The active animation is replaced
- A new fade starts from the current instantaneous brightness to the newly requested target
- The remembered on level updates to the new effective target

### Rotate down to `0%` instead of using the button

- The strip fades to `0%`
- The last remembered non-zero target remains available for a later button turn-on

### Rotate to `1` detent below `10%` and then turn off with the button

- The light can be manually operated below `10%` during awake hours using rotation
- A later button turn-on during awake hours restores at least `10%`, not the lower remembered level

### Repeated fast detents

- Rotary changes inside the `35 ms` debounce window are ignored until the input settles
- The final accepted detent sets the next target

### Repeated fast button presses

- Presses inside the `180 ms` debounce window are ignored

### Time unavailable after boot

- Turn-on actions remain allowed
- Button turn-on falls back to the awake-hours rule: first button turn-on requests `100%`, later button turn-ons restore the remembered level clamped to at least `10%`
- Turn-off remains allowed

### Wi-Fi disconnected after time was previously synced

- Encoder handling remains immediate
- Quiet-hours decisions continue using the local ESP32 clock
- Runtime behavior does not require a live NTP request per interaction

### Encoder moved to full scale with `3%` steps

- The internal encoder range reserves a final top step so full brightness is still reachable
- Rotating to the topmost encoder level maps to `100%`

### Missing library or wrong wiring

- If `Ai Esp32 Rotary Encoder` is not installed, compilation fails until the library is added
- If the encoder is wired incorrectly, OTA, Wi-Fi, time, and PWM can still operate, but local input control will not behave correctly
