from abc import ABC, abstractmethod
import random
from collections import deque


class FoodSpawner(ABC):
    @abstractmethod
    def provide_food_x_y(self, width, height):
        raise NotImplementedError()


class RandomFoodSpawner(FoodSpawner):
    def __init__(self):
        pass

    def provide_food_x_y(self, width, height):
        rand_x = random.randrange(1, width - 1)
        rand_y = random.randrange(1, height - 1)
        return rand_x, rand_y


class ReplayFoodSpawner(FoodSpawner):
    def __init__(self, coords):
        self.point_coords = deque(coords)

    def provide_food_x_y(self, width, height):
        tokens = self.point_coords.popleft().split(",")
        return int(tokens[0]), int(tokens[1])
