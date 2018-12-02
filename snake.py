"""
have walls
have tail
collide with tail
eat food

"""

import pygame
from pygame.locals import *


pygame.init()

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

def change_direction_by(degrees):
    direction = add_to_direction(degrees)

def add_to_direction(degrees):
    return direction + degrees

# get value of matrix cell of the ahead cell
def check_in_direction(direction_to_check):
    ahead_x = cos(direction_to_check)
    ahead_y = sin(direction_to_check)
    return matrix[snake_x + ahead_x][snake_y + ahead_y]

def check_left():
    return check_in_direction(add_to_direction(90))

def check_right():
    return check_in_direction(add_to_direction(-90))

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

while True:
    event_handler()
    #pygame.draw.rect(game_display, (0,100,0), [190,190,20,20])
    
    for row in range(0, height - 1):
        for col in range(0, width - 1):
            if matrix[row][col] != 0:
                pygame.draw.rect(game_display, colors[matrix[row][col]], [col * block_size, row * block_size, block_size, block_size])

    pygame.display.update()
                                                                                 
