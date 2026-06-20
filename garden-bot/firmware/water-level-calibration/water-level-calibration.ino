// Standalone sketch for calibrating WATER_LEVEL_THRESHOLD.
// Prints raw analogRead() values for both probe directions every second.
// Move the probes in/out of water and watch the Serial Monitor to see
// where a good threshold falls, then copy it into garden-bot/config.h.

#define WATER_LEVEL_PIN_A 33
#define WATER_LEVEL_PIN_B 25

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
}

void loop() {
  pinMode(WATER_LEVEL_PIN_A, OUTPUT);
  pinMode(WATER_LEVEL_PIN_B, OUTPUT);
  digitalWrite(WATER_LEVEL_PIN_A, LOW);
  digitalWrite(WATER_LEVEL_PIN_B, LOW);
  delay(10);

  // Measurement 1: A=HIGH, B=analog input
  digitalWrite(WATER_LEVEL_PIN_A, HIGH);
  pinMode(WATER_LEVEL_PIN_B, INPUT_PULLDOWN);
  delay(10);
  int reading1 = analogRead(WATER_LEVEL_PIN_B);

  // Both LOW between measurements
  pinMode(WATER_LEVEL_PIN_B, OUTPUT);
  digitalWrite(WATER_LEVEL_PIN_A, LOW);
  digitalWrite(WATER_LEVEL_PIN_B, LOW);
  delay(10);

  // Measurement 2: B=HIGH, A=analog input
  digitalWrite(WATER_LEVEL_PIN_B, HIGH);
  pinMode(WATER_LEVEL_PIN_A, INPUT_PULLDOWN);
  delay(10);
  int reading2 = analogRead(WATER_LEVEL_PIN_A);

  // Both LOW after measurements
  pinMode(WATER_LEVEL_PIN_A, OUTPUT);
  digitalWrite(WATER_LEVEL_PIN_A, LOW);
  digitalWrite(WATER_LEVEL_PIN_B, LOW);

  Serial.printf("r1=%d r2=%d (range 0-4095)\n", reading1, reading2);

  delay(1000);
}
