"""
have tail
collide with tail
"""

import math
import random
import datetime
import re
import json


class SnakeEnvironment:

    def __init__(self, save_replay, food_spawner):
        self.empty_id = '.'
        self.snake_id = 's'
        self.food_id = 'f'
        self.wall_id = 'w'

        self.color_converter = {
            self.empty_id: (0, 0, 0),
            self.snake_id: (0, 255, 0),
            self.food_id: (255, 0, 0)
        }

        self.block_size = 20
        self.width, self.height = 20, 20
        self.matrix = [[self.empty_id for x in range(self.width)] for y in range(self.height)]

        self.food_spawner = food_spawner

        self.snake_x = 10
        self.snake_y = 10
        self.matrix[self.snake_x][self.snake_y] = self.snake_id

        self.display_width = self.width * self.block_size
        self.display_height = self.height * self.block_size

        self.snake_direction = 0  # degrees
        self.score_gained_this_action = 0
        self.is_finished = False

        self.save_replay = save_replay
        self.food_spawn_positions = []
        self.actions_taken = []
        self.total_score = 0

        self.spawn_food()

    def save_to_replay(self, line):
        if self.save_replay:
            regexp = re.compile(r'^food.*')
            matches = regexp.search(line)
            if matches:
                self.food_spawn_positions.append(line[5:])
            else:
                self.actions_taken.append(line)

    def close_game(self):
        if self.save_replay:
            replay_dict = {
                "food_points": self.food_spawn_positions,
                "actions_taken": self.actions_taken
            }

            current_time = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            replay_path = 'replays/{}.txt'.format(current_time)
            replay_file = open(replay_path, 'x')
            json.dump(replay_dict, replay_file)
            replay_file.close()

    def tile_id_to_color(self, tile_id):
        return self.color_converter.get(tile_id)

    def change_direction_by(self, degrees):
        self.snake_direction = self.add_to_direction(degrees)

    def add_to_direction(self, degrees):
        return (self.snake_direction + degrees) % 360

    # get value of the ahead cell
    def check_in_direction(self, direction_to_check, distance):
        ahead_x = int(math.cos(math.radians(direction_to_check))) * distance
        ahead_y = int(math.sin(math.radians(direction_to_check))) * distance
        x_to_check = self.snake_x + ahead_x
        y_to_check = self.snake_y + ahead_y
        if self.is_outside_world(x_to_check, y_to_check):
            return self.wall_id
        else:
            return self.get_tile(x_to_check, y_to_check)

    def get_tile(self, x, y):
        if self.is_outside_world(x, y):
            return self.wall_id
        else:
            return self.matrix[x][y]

    def snake_move_forward(self):
        self.score_gained_this_action = -0.1

        ahead_x = int(math.cos(math.radians(self.snake_direction)))
        ahead_y = int(math.sin(math.radians(self.snake_direction)))

        self.matrix[self.snake_x][self.snake_y] = self.empty_id

        self.snake_x += ahead_x
        self.snake_y += ahead_y
        if not self.is_outside_world(self.snake_x, self.snake_y):
            self.attempt_eat_food(self.matrix[self.snake_x][self.snake_y])
            self.matrix[self.snake_x][self.snake_y] = self.snake_id
        else:
            self.score_gained_this_action = -1
            self.is_finished = True
        self.total_score += self.score_gained_this_action

    def is_outside_world(self, x, y):
        return (x >= self.width or
                y >= self.height or
                x < 0 or
                y < 0)

    def attempt_eat_food(self, cell_content):
        if cell_content == self.food_id:
            self.score_gained_this_action = 1
            self.spawn_food()

    def spawn_food(self):
        rand_x, rand_y = self.food_spawner.provide_food_x_y(self.width, self.height)
        while rand_x == self.snake_x and rand_y == self.snake_y:
            rand_x, rand_y = self.food_spawner.provide_food_x_y(self.width, self.height)
        self.matrix[rand_x][rand_y] = self.food_id
        self.save_to_replay('food:{},{}'.format(rand_x, rand_y))

    def get_color_at(self, row, col):
        return self.tile_id_to_color(self.matrix[row][col])

    def look_in_direction(self, angle, distance):
        for step in range(1, distance):
            tile_content = self.check_in_direction(self.add_to_direction(angle), step)
            if tile_content != self.empty_id:
                return tile_content
        return self.empty_id

    def get_current_state(self):
        state_vector = str(self.look_in_direction(90, 3))
        state_vector += str(self.look_in_direction(0, 3))
        state_vector += str(self.look_in_direction(-90, 3))
        return state_vector

    def apply_action(self, action):
        if action == 'l':
            self.change_direction_by(90)
        elif action == 'r':
            self.change_direction_by(-90)
        self.save_to_replay(action)

    def get_environment_feedback(self, action):
        self.apply_action(action)
        self.snake_move_forward()
        if self.total_score < -40:
            self.is_finished = True
        return self.get_current_state(), self.score_gained_this_action
