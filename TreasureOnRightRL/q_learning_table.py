import numpy as np
import pandas as pd

from treasure_environment import TreasureEnvironment


class QLearningTable:

    def __init__(self, actions_list, learning_rate=0.01,
                 discount_factor_gamma=0.9, exploration_epsilon=0.9):
        self.actions_list = actions_list
        self.learning_rate = learning_rate
        self.discount_factor_gamma = discount_factor_gamma
        self.exploration_epsilon = exploration_epsilon
        self.q_table = pd.DataFrame(columns=self.actions_list, dtype=np.float64)

    def choose_action(self, state):
        self.check_state_exist(state)
        # action selection
        if np.random.uniform() < self.exploration_epsilon:
            # choose best action
            state_action = self.q_table.loc[state, :]
            # some actions may have the same value, randomly choose on in these actions
            action = np.random.choice(state_action[state_action == np.max(state_action)].index)
        else:
            # choose random action
            action = np.random.choice(self.actions_list)
        return action

    def check_state_exist(self, state):
        if state not in self.q_table.index:
            # append new state to q table
            self.q_table = self.q_table.append(
                pd.Series(
                    [0] * len(self.actions_list),  # series with as many 0s as the number of actions
                    index=self.q_table.columns,
                    name=state,
                )
            )

    def run(self):
        environment = TreasureEnvironment()

        current_state = environment.current_place

        while True:
            action = self.choose_action(current_state)

            next_state, reward = environment.get_environment_feedback(str(action))

            self.check_state_exist(next_state)
            q_predict = self.q_table.loc[current_state, action]

            if environment.is_end_state(next_state):
                q_target = reward  # next state is terminal
            else:
                q_target = reward + self.discount_factor_gamma * self.q_table.loc[next_state, :].max()

            # learn
            self.q_table.loc[current_state, action] += self.learning_rate * (q_target - q_predict)

            current_state = next_state

            print(self.q_table)

            if environment.finished:
                break


if __name__ == "__main__":
    q_learning_table = QLearningTable(['left', 'right'])
    for rerun in range(0, 500):
        q_learning_table.run()
