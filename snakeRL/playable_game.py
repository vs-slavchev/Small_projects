
import pygame
from pygame.locals import *
import numpy as np
import pandas as pd

from snake import SnakeEnvironment

pygame.init()

snake_environment = SnakeEnvironment()

game_display = pygame.display.set_mode((snake_environment.display_width, snake_environment.display_height))
pygame.display.set_caption('umnata zmia')


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
            snake_environment.change_direction_by(90)
        elif event.type == KEYDOWN and event.key == K_RIGHT:
            snake_environment.change_direction_by(-90)


def render_game():
    for row in range(0, snake_environment.height):
        for col in range(0, snake_environment.width):
            pygame.draw.rect(game_display, snake_environment.get_color_at(row, col),
                             [col * snake_environment.block_size, row * snake_environment.block_size,
                              snake_environment.block_size, snake_environment.block_size])
    pygame.display.update()


clock = pygame.time.Clock()
while True:
    event_handler()
    try:
        snake_environment.snake_move_forward()
    except RuntimeError:
        pygame.quit()
        quit()

    render_game()

    clock.tick(3)
