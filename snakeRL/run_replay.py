import pygame
from pygame.locals import *
import numpy as np
import pandas as pd
from collections import deque
import json

from snake import SnakeEnvironment
from food_spawner import ReplayFoodSpawner


replay_path = "replays/2019-09-30_16-34-41.txt"
file_object = open(replay_path, 'r')
replay = json.load(file_object)
actions_deque = deque(replay["actions_taken"])
food_spawns = deque(replay["food_points"])

pygame.init()
snake_environment = SnakeEnvironment(save_replay=False,
                                     food_spawner=ReplayFoodSpawner(food_spawns))
game_display = pygame.display.set_mode((snake_environment.display_width,
                                        snake_environment.display_height))
pygame.display.set_caption('umnata zmia - replay')


def event_handler():
    action = actions_deque.popleft()
    snake_environment.apply_action(action)


def render_game():
    for row in range(0, snake_environment.height):
        for col in range(0, snake_environment.width):
            pygame.draw.rect(game_display, snake_environment.get_color_at(row, col),
                             [col * snake_environment.block_size,
                              row * snake_environment.block_size,
                              snake_environment.block_size,
                              snake_environment.block_size])
    pygame.display.update()


clock = pygame.time.Clock()
while True:
    event_handler()
    snake_environment.snake_move_forward()
    if snake_environment.is_finished:
        pygame.quit()
        quit()

    render_game()

    clock.tick(7)
