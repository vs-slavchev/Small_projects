"""
have tail
collide with tail
"""

import math
import random


class SnakeEnvironment:

    def __init__(self):
        self.empty_id = 0
        self.snake_id = 1
        self.food_id = 2

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

    def change_direction_by(self, degrees):
        self.snake_direction = self.add_to_direction(degrees)

    def add_to_direction(self, degrees):
        return (self.snake_direction + degrees) % 360

    # get value of the ahead cell
    def check_in_direction(self, direction_to_check):
        ahead_x = int(math.cos(math.radians(direction_to_check)))
        ahead_y = int(math.sin(math.radians(direction_to_check)))
        return self.matrix[self.snake_x + ahead_x][self.snake_y + ahead_y]

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
        self.check_game_over()
        self.attempt_eat_food(self.matrix[self.snake_x][self.snake_y])

        self.matrix[self.snake_x][self.snake_y] = self.snake_id

    def is_outside_world(self):
        return (self.snake_x >= self.width or
                self.snake_y >= self.height or
                self.snake_x < 0 or
                self.snake_y < 0)

    def check_game_over(self):
        if self.is_outside_world():
            raise RuntimeError('out of matrix bounds')

    def attempt_eat_food(self, cell_content):
        if cell_content == self.food_id:
            self.score += 1
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

    def get_color_at(self, row, col):
        return self.colors[self.matrix[row][col]]
