
class TreasureEnvironment:
    def __init__(self):
        self.number_places = 5
        self.current_place = 0
        self.finished = False

    def go_left(self):
        self.current_place = max(0, self.current_place - 1)

    def go_right(self):
        self.current_place = min(self.number_places - 1, self.current_place + 1)

    def is_end_state(self, state):
        return state == self.number_places - 1

    def get_environment_feedback(self, action):
        if action == 'left':
            self.go_left()
        else:
            self.go_right()

        reward = 0
        if self.is_end_state(self.current_place):
            reward = 1
            self.finished = True

        print("place" + str(self.current_place))

        return self.current_place, reward
