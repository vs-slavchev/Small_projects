static const uint8_t GATE_PIN = 9;

void setup() {
    pinMode(GATE_PIN, OUTPUT);
    digitalWrite(GATE_PIN, LOW);
}

void loop() {
    digitalWrite(GATE_PIN, HIGH);
    delay(1000);
    digitalWrite(GATE_PIN, LOW);
    delay(1000);
}
