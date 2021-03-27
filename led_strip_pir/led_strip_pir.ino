#define PIR_SENSOR 4
#define GREEN_LED 5
#define RED_LED 6
#define BLUE_LED 9

#define MAX_BRIGHTNESS 120
#define INITIAL_BRIGHTNESS 0
#define GAIN_AMOUNT 1


float greenBrightness = 0.0;
float redBrightness = 0.0;
float blueBrightness = 0.0;

float greenMultiplier = 0.05;
float redMultiplier = 0.9;
float blueMultiplier = 0.02;

void setup() {
  Serial.begin(9600);
  initialise_all_color_brightness();
  pinMode(PIR_SENSOR, INPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BLUE_LED, OUTPUT);
}

void loop() {
  if (digitalRead(PIR_SENSOR) == HIGH) {
    analogWrite(GREEN_LED, greenBrightness);
    analogWrite(RED_LED, redBrightness);
    analogWrite(BLUE_LED, blueBrightness);

    if (max_brightness() < MAX_BRIGHTNESS) {
      greenBrightness = update_color(greenBrightness, greenMultiplier);
      redBrightness = update_color(redBrightness, redMultiplier);
      blueBrightness = update_color(blueBrightness, blueMultiplier);
    }
  } else {
    analogWrite(GREEN_LED, 0);
    analogWrite(RED_LED, 0);
    analogWrite(BLUE_LED, 0);
    initialise_all_color_brightness();
  }
  
  delay(60);
}

float update_color(float brightness, float multiplier) {
  return brightness + GAIN_AMOUNT * multiplier;
}

void initialise_all_color_brightness() {
  greenBrightness = INITIAL_BRIGHTNESS;
  redBrightness = INITIAL_BRIGHTNESS;
  blueBrightness = INITIAL_BRIGHTNESS;
}

int max_brightness() {
  int max_brightness = max(max(greenBrightness, redBrightness), blueBrightness);
  Serial.println(max_brightness);
  return max_brightness;
}
