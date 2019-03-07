"""
have tail
collide with tail
"""

import math
import random
import datetime
import re
'''
from collections import deque
>>> l = deque(['a', 'b', 'c', 'd'])
>>> l.popleft()
'a'
>>> l
deque(['b', 'c', 'd'])
'''


class SnakeEnvironment:

    def __init__(self, save_replay):
        self.empty_id = 0
        self.snake_id = 1
        self.food_id = 2
        self.wall_id = 3

        self.colors = [(0, 0, 0), (0, 255, 0), (255, 0, 0)]

        self.block_size = 20
        self.width, self.height = 20, 20
        self.matrix = [[0 for x in range(self.width)] for y in range(self.height)]

        self.snake_x = 10
        self.snake_y = 10
        self.matrix[self.snake_x][self.snake_y] = self.snake_id
        self.matrix[6][6] = self.food_id

        self.display_width = self.width * self.block_size
        self.display_height = self.height * self.block_size

        self.snake_direction = 0  # degrees
        self.score = 0
        self.score_gained_this_action = 0
        self.is_finished = False

        self.save_replay = save_replay
        self.food_spawn_positions = []
        self.actions_taken = []
        if self.save_replay:
            current_time = datetime.datetime.now().strftime("%Y-%m-%d_%H:%M:%S")
            replay_path = 'replays/{}.txt'.format(current_time)
            self.replay_file = open(replay_path, 'x')

    def save_to_replay(self, line):
        if self.save_replay:
            regexp = re.compile(r'^food.*')
            matches = regexp.search(line)
            if matches:
                self.food_spawn_positions.append(line)
            else:
                self.actions_taken.append(line)

    def close_game(self):
        if self.save_replay:
            for line in self.food_spawn_positions:
                print(line)
                self.replay_file.write(line + '\n')
            for line in self.actions_taken:
                print(line)
                self.replay_file.write(line + '\n')
            self.replay_file.close()

    def change_direction_by(self, degrees):
        self.snake_direction = self.add_to_direction(degrees)

    def add_to_direction(self, degrees):
        return (self.snake_direction + degrees) % 360

    # get value of the ahead cell
    def check_in_direction(self, direction_to_check):
        ahead_x = int(math.cos(math.radians(direction_to_check)))
        ahead_y = int(math.sin(math.radians(direction_to_check)))
        x_to_check = self.snake_x + ahead_x
        y_to_check = self.snake_y + ahead_y
        if self.is_outside_world(x_to_check, y_to_check):
            return self.wall_id
        else:
            return self.matrix[x_to_check][y_to_check]

    def check_left(self):
        return self.check_in_direction(self.add_to_direction(90))

    def check_right(self):
        return self.check_in_direction(self.add_to_direction(-90))

    def snake_move_forward(self):
        ahead_x = int(math.cos(math.radians(self.snake_direction)))
        ahead_y = int(math.sin(math.radians(self.snake_direction)))

        self.matrix[self.snake_x][self.snake_y] = self.empty_id

        self.snake_x += ahead_x
        self.snake_y += ahead_y
        if not self.is_outside_world(self.snake_x, self.snake_y):
            self.attempt_eat_food(self.matrix[self.snake_x][self.snake_y])
            self.matrix[self.snake_x][self.snake_y] = self.snake_id
        else:
            self.is_finished = True

    def is_outside_world(self, x, y):
        return (x >= self.width or
                y >= self.height or
                x < 0 or
                y < 0)

    def attempt_eat_food(self, cell_content):
        self.score_gained_this_action = 0
        if cell_content == self.food_id:
            self.score_gained_this_action = 1
            self.score += self.score_gained_this_action
            self.spawn_food()

    def random_x_y(self):
        rand_x = random.randrange(1, self.width - 1)
        rand_y = random.randrange(1, self.height - 1)
        return rand_x, rand_y

    def spawn_food(self):
        rand_x, rand_y = self.random_x_y()
        while rand_x == self.snake_x and rand_y == self.snake_y:
            rand_x, rand_y = self.random_x_y()
        self.matrix[rand_x][rand_y] = self.food_id
        self.save_to_replay('food:{},{}'.format(rand_x, rand_y))

    def get_color_at(self, row, col):
        return self.colors[self.matrix[row][col]]

    def get_current_state(self):
        state_vector = str(self.check_in_direction(self.add_to_direction(0)))
        state_vector += str(self.check_in_direction(self.add_to_direction(90)))
        state_vector += str(self.check_in_direction(self.add_to_direction(-90)))
        return state_vector

    def apply_action(self, action):
        if action == 'left':
            self.change_direction_by(90)
        elif action == 'right':
            self.change_direction_by(-90)
        self.save_to_replay(action)

    def get_environment_feedback(self, action):
        self.apply_action(action)
        self.snake_move_forward()
        return self.get_current_state(), self.score_gained_this_action
