"""
have walls
have tail
collide with tail
eat food

"""

import pygame
from pygame.locals import *
import math
import random


pygame.init()

empty_id = 0
snake_id = 1
food_id = 2

colors = [(0,0,0), (0,255,0), (255,0,0)]

block_size = 20
width, height = 20, 20
matrix = [[0 for x in range(width)] for y in range(height)] 

snake_x = 10
snake_y = 10
matrix[snake_x][snake_y] = snake_id
matrix[6][6] = food_id

display_width = width * block_size
display_height = height * block_size

game_display = pygame.display.set_mode((display_width, display_height))
pygame.display.set_caption('umnata zmia')

snake_direction = 0 # degrees
score = 0

def change_direction_by(degrees):
    global snake_direction
    snake_direction = add_to_direction(degrees)

def add_to_direction(degrees):
    global snake_direction
    return (snake_direction + degrees) % 360

# get value of the ahead cell
def check_in_direction(direction_to_check):
    ahead_x = cos(radians(direction_to_check))
    ahead_y = sin(radians(direction_to_check))
    return matrix[snake_x + ahead_x][snake_y + ahead_y]

def check_left():
    return check_in_direction(add_to_direction(90))

def check_right():
    return check_in_direction(add_to_direction(-90))

def snake_move_forward():
    global snake_direction
    ahead_x = math.cos(math.radians(snake_direction))
    ahead_y = math.sin(math.radians(snake_direction))

    global snake_x
    global snake_y
    global matrix
    matrix[snake_x][snake_y] = empty_id

    snake_x += int(ahead_x)
    snake_y += int(ahead_y)
    check_game_over()
    food_eaten = attempt_eat_food(matrix[snake_x][snake_y])
    if food_eaten:
        spawn_food(snake_x, snake_y)

    matrix[snake_x][snake_y] = snake_id

def check_game_over():
    if (snake_x >= width or
        snake_y >= height or
        snake_x <= 0 or
        snake_y <= 0):
           pygame.quit()
           quit()

def attempt_eat_food(cell_content):
    if cell_content == food_id:
        global score
        score += 1
        
        food_eaten = True
    else:
        food_eaten = False

    return food_eaten

def spawn_food(snake_x, snake_y):
    rand_x = random.randrange(0, width)
    rand_y = random.randrange(0, height)
    if rand_x == snake_x and rand_y == snake_y:
        rand_x += 1
    matrix[rand_x][rand_y] = food_id

def event_handler():
    for event in pygame.event.get():
        if event.type == QUIT or (
            event.type == KEYDOWN and (
             event.key == K_ESCAPE or
             event.key == K_q
            )):
           pygame.quit()
           quit()
        elif event.type == KEYDOWN and event.key == K_LEFT:
            change_direction_by(90)
        elif event.type == KEYDOWN and event.key == K_RIGHT:
            change_direction_by(-90)

clock = pygame.time.Clock()
while True:
    event_handler()
    snake_move_forward()
    
    for row in range(0, height - 1):
        for col in range(0, width - 1):
            pygame.draw.rect(game_display, colors[matrix[row][col]], [col * block_size, row * block_size, block_size, block_size])

    pygame.display.update()
    clock.tick(3)
                                                                                 
