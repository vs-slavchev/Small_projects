import RPi.GPIO as GPIO
import time

pin_hand = 7
pin_elbow = 11
pin_shoulder = 13
pin_base = 15


GPIO.setmode(GPIO.BOARD)

GPIO.setup(pin_hand, GPIO.OUT)
GPIO.setup(pin_elbow, GPIO.OUT)
GPIO.setup(pin_shoulder, GPIO.OUT)
GPIO.setup(pin_base, GPIO.OUT)

pwm_hand = GPIO.PWM(pin_hand, 50)
pwm_elbow = GPIO.PWM(pin_elbow, 50)
pwm_shoulder = GPIO.PWM(pin_shoulder, 50)
pwm_base = GPIO.PWM(pin_base, 50)

pwm_hand.start(2.5)
pwm_elbow.start(2.5)
pwm_shoulder.start(2.5)
pwm_base.start(2.5)


def hand_to_angle(angle): # limit angle min max
    dc = angle/18 + 2.5
    pwm_hand.ChangeDutyCycle(dc)
    time.sleep(1) # TODO: scale time to angle, 0.05 is 50ms, look in datasheet

# pass in pwm of the servo to move
def MG996_to_angle(pwm_servo, angle):
    dc = angle/18 + 2.5
    pwm_servo.ChangeDutyCycle(dc)
    time.sleep(1)

try:
    while True:
        hand_to_angle(0)
        MG996_to_angle(pwm_elbow, 0)
        MG996_to_angle(pwm_shoulder, 0)
        MG996_to_angle(pwm_base, 0)
        # go
        #MG996_to_angle(pwm_elbow, 60)
        #MG996_to_angle(pwm_shoulder, 50)
        #MG996_to_angle(pwm_base, 30)
        #hand_to_angle(30)
        #hand_to_angle(0)
        #hand_to_angle(30)
        # go back
        #MG996_to_angle(pwm_base, 0)
        #MG996_to_angle(pwm_shoulder, 0)
        #MG996_to_angle(pwm_elbow, 0)
except KeyboardInterrupt:
    pwm_hand.stop()
    pwm_elbow.stop()
    pwm_shoulder.stop()
    pwm_base.stop()
    GPIO.cleanup()
    


"""
only one servo should work at any 1 moment:
    stall current of MG996 is 2.5A

MG996 - 0.2sec/60deg turn speed
SG90 - 0.2sec/60
"""
