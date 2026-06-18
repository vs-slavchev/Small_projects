/*
    Pro Micro PWM Vanity Lights
    Features:
        - MOSFET-driven PWM control for an LED strip (IRF3708, gate resistor + pulldown)
        - Rotary encoder input using interrupt-driven reading (Encoder library)
        - Software debounce for rotary changes and button clicks

    Control map:
        - Rotate right / clockwise: increase brightness by 3%
        - Rotate left / counter-clockwise: decrease brightness by 3%
        - Button press: toggle off/on with eased animation

    Pin assignments:
        - PWM output: pin 9 (OC1A / Timer1A)
            To switch to 25 kHz: change PWM_PIN to 10 (OC1B / Timer1B) and configure
            Timer1 in fast PWM mode (ICR1=320, prescaler=2). Both pins share Timer1.
        - Encoder CLK: pin 2 (INT1)
        - Encoder DT:  pin 3 (INT0)
        - Encoder SWITCH:  pin 4
        - Onboard LED: pin 17 (RXLED, active LOW on SparkFun Pro Micro)
*/

#include <Encoder.h>

static const uint8_t PWM_PIN         = 9;
static const uint8_t ONBOARD_LED_PIN = 17;  // RXLED, active LOW

static const uint8_t ENCODER_CLK_PIN = 3;
static const uint8_t ENCODER_DT_PIN  = 2;
static const uint8_t ENCODER_SW_PIN  = 4;
static const int8_t  ENCODER_STEPS_PER_DETENT = 4;

static const unsigned long BRIGHTNESS_ANIMATION_MS = 450;
static const unsigned long ROTARY_DEBOUNCE_MS      = 35;
static const unsigned long BUTTON_DEBOUNCE_MS      = 180;
static const uint8_t       BRIGHTNESS_STEP_PCT     = 3;

static const long ENCODER_MIN_LEVEL = 0;
static const long ENCODER_MAX_LEVEL = (100 + BRIGHTNESS_STEP_PCT - 1) / BRIGHTNESS_STEP_PCT;

Encoder rotaryEncoder(ENCODER_CLK_PIN, ENCODER_DT_PIN);

uint8_t  currentBrightnessPct        = 0;
uint8_t  targetBrightnessPct         = 0;
uint8_t  animationStartBrightnessPct = 0;
uint8_t  rememberedOnBrightnessPct   = 100;
long     lastEncoderLevel            = ENCODER_MIN_LEVEL;
unsigned long lastEncoderHandledMs   = 0;
unsigned long lastButtonHandledMs    = 0;
unsigned long brightnessAnimationStartMs = 0;
bool brightnessAnimationActive = false;
bool lastButtonState           = false;

uint8_t dutyFromPercent(uint8_t percent) {
    return (uint8_t)(((uint16_t)percent * 255U) / 100U);
}

long brightnessPercentToEncoderLevel(uint8_t percent) {
    if (percent > 100) percent = 100;
    if (percent == 100) return ENCODER_MAX_LEVEL;
    return (long)((percent + (BRIGHTNESS_STEP_PCT / 2)) / BRIGHTNESS_STEP_PCT);
}

uint8_t encoderLevelToBrightnessPercent(long level) {
    if (level < ENCODER_MIN_LEVEL) level = ENCODER_MIN_LEVEL;
    if (level > ENCODER_MAX_LEVEL) level = ENCODER_MAX_LEVEL;
    if (level == ENCODER_MAX_LEVEL) return 100;
    return (uint8_t)(level * BRIGHTNESS_STEP_PCT);
}

uint8_t requestedBrightness() {
    return brightnessAnimationActive ? targetBrightnessPct : currentBrightnessPct;
}

void syncEncoderToRequestedBrightness() {
    long level = brightnessPercentToEncoderLevel(requestedBrightness());
    rotaryEncoder.write((long)(level * ENCODER_STEPS_PER_DETENT));
    lastEncoderLevel = level;
}

void rememberOnBrightness(uint8_t percent) {
    if (percent == 0 || percent > 100) return;
    rememberedOnBrightnessPct = percent;
}

void writeBrightnessNow(uint8_t percent, bool verbose = true) {
    if (percent > 100) percent = 100;
    currentBrightnessPct = percent;
    uint8_t duty = dutyFromPercent(percent);
    analogWrite(PWM_PIN, duty);
    if (verbose) {
        Serial.print(F("[PWM] Brightness set to "));
        Serial.print(currentBrightnessPct);
        Serial.print(F("% (duty="));
        Serial.print(duty);
        Serial.println(F(")"));
    }
    if (!brightnessAnimationActive) {
        targetBrightnessPct = currentBrightnessPct;
    }
}

float easeInCubic(float t) {
    return t * t * t;
}

void startBrightnessTransition(uint8_t percent) {
    if (percent > 100) percent = 100;

    if (percent == currentBrightnessPct) {
        brightnessAnimationActive = false;
        targetBrightnessPct = percent;
        writeBrightnessNow(percent);
        return;
    }

    animationStartBrightnessPct = currentBrightnessPct;
    targetBrightnessPct         = percent;
    brightnessAnimationStartMs  = millis();
    brightnessAnimationActive   = true;

    Serial.print(F("[PWM] Transition "));
    Serial.print(animationStartBrightnessPct);
    Serial.print(F("% -> "));
    Serial.print(targetBrightnessPct);
    Serial.println(F("%"));

    if (BRIGHTNESS_ANIMATION_MS == 0) {
        brightnessAnimationActive = false;
        writeBrightnessNow(targetBrightnessPct);
        return;
    }

    if (targetBrightnessPct > animationStartBrightnessPct) {
        writeBrightnessNow(animationStartBrightnessPct, false);
    }
}

void requestBrightness(uint8_t targetPercent) {
    if (targetPercent > 100) targetPercent = 100;
    if (targetPercent > 0) rememberOnBrightness(targetPercent);
    startBrightnessTransition(targetPercent);
    syncEncoderToRequestedBrightness();
}

void updateBrightnessAnimation() {
    if (!brightnessAnimationActive) return;

    unsigned long elapsedMs = millis() - brightnessAnimationStartMs;
    if (elapsedMs >= BRIGHTNESS_ANIMATION_MS) {
        brightnessAnimationActive = false;
        writeBrightnessNow(targetBrightnessPct);
        return;
    }

    float t     = (float)elapsedMs / (float)BRIGHTNESS_ANIMATION_MS;
    float eased = easeInCubic(t);
    float delta = (float)targetBrightnessPct - (float)animationStartBrightnessPct;
    uint8_t next = (uint8_t)((float)animationStartBrightnessPct + (delta * eased) + 0.5f);
    writeBrightnessNow(next, false);
}

void runStartupDiagnostic() {
    pinMode(PWM_PIN, OUTPUT);
    pinMode(ONBOARD_LED_PIN, OUTPUT);

    for (uint8_t flash = 0; flash < 3; ++flash) {
        digitalWrite(PWM_PIN, HIGH);
        digitalWrite(ONBOARD_LED_PIN, LOW);   // RXLED is active LOW
        delay(1000);
        digitalWrite(PWM_PIN, LOW);
        digitalWrite(ONBOARD_LED_PIN, HIGH);
        delay(500);
    }
}

void setupEncoder() {
    pinMode(ENCODER_SW_PIN, INPUT_PULLUP);
    rotaryEncoder.write(ENCODER_MIN_LEVEL * ENCODER_STEPS_PER_DETENT);
    lastEncoderLevel = ENCODER_MIN_LEVEL;
    Serial.println(F("[Encoder] Rotary encoder ready"));
}

void processEncoderRotation() {
    long rawCount    = rotaryEncoder.read();
    long encoderLevel = rawCount / ENCODER_STEPS_PER_DETENT;

    if (encoderLevel < ENCODER_MIN_LEVEL) {
        encoderLevel = ENCODER_MIN_LEVEL;
        rotaryEncoder.write(ENCODER_MIN_LEVEL * ENCODER_STEPS_PER_DETENT);
    } else if (encoderLevel > ENCODER_MAX_LEVEL) {
        encoderLevel = ENCODER_MAX_LEVEL;
        rotaryEncoder.write(ENCODER_MAX_LEVEL * ENCODER_STEPS_PER_DETENT);
    }

    if (encoderLevel == lastEncoderLevel) return;

    unsigned long now = millis();
    if ((now - lastEncoderHandledMs) < ROTARY_DEBOUNCE_MS) return;

    long previousLevel   = lastEncoderLevel;
    lastEncoderLevel     = encoderLevel;
    lastEncoderHandledMs = now;

    Serial.println(encoderLevel > previousLevel ? F("[Input] ROTATE RIGHT") : F("[Input] ROTATE LEFT"));
    requestBrightness(encoderLevelToBrightnessPercent(encoderLevel));
}

void processEncoderButton() {
    bool buttonDown = !digitalRead(ENCODER_SW_PIN);  // active LOW via INPUT_PULLUP

    if (!buttonDown) {
        lastButtonState = false;
        return;
    }

    if (lastButtonState) return;  // already acted on this press; wait for release

    unsigned long now = millis();
    if ((now - lastButtonHandledMs) < BUTTON_DEBOUNCE_MS) return;

    lastButtonHandledMs = now;
    lastButtonState     = true;

    if (requestedBrightness() == 0) {
        Serial.println(F("[Input] BUTTON ON"));
        requestBrightness(rememberedOnBrightnessPct);
    } else {
        Serial.println(F("[Input] BUTTON OFF"));
        requestBrightness(0);
    }
}

void setup() {
    runStartupDiagnostic();
    Serial.begin(115200);
    pinMode(PWM_PIN, OUTPUT);
    analogWrite(PWM_PIN, 0);
    delay(200);
    Serial.println();
    Serial.println(F("=== Pro Micro PWM Vanity Lights ==="));
    setupEncoder();
    writeBrightnessNow(0, false);
    syncEncoderToRequestedBrightness();
    lastEncoderHandledMs = millis();  // ignore counts accumulated during startup diagnostic
}

void loop() {
    processEncoderRotation();
    processEncoderButton();
    updateBrightnessAnimation();
    delay(5);
}
