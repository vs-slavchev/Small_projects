import RPi.GPIO as GPIO
import time

pin_hand = 7
pin_elbow = 11
pin_shoulder = 13
pin_base = 15


GPIO.setmode(GPIO.BOARD)
GPIO.setup(pin_hand, GPIO.OUT)

pwm_hand = GPIO.PWM(pin_hand, 50)
pwm_hand.start(2.5)


def hand_to_angle(angle): # limit angle min max
    dc = angle/18 + 2.5
    pwm_hand.ChangeDutyCycle(dc)
    time.sleep(1) # TODO: scale time to angle, 0.05 is 50ms, look in datasheet

# pass in pwm of the servo to move
def MG996_to_angle(pwm_servo, angle):
    # dc = ???
    pwm_servo.ChangeDutyCycle(dc)
    # time.sleep(1)

try:
    while True:
        hand_to_angle(0)
        hand_to_angle(30)
except KeyboardInterrupt:
    pwm_hand.stop()
    GPIO.cleanup()
    


"""
only one servo should work at any 1 moment:
    stall current of MG996 is 2.5A

MG996 - 0.2sec/60deg turn speed
SG90 - 0.2sec/60
"""
