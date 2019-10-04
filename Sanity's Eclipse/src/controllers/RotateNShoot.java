package controllers;

import entities.AlienShip;
import game.Action;
import game.Game;

/* defines the logic behind the scatter shooting space station alien ship */
public class RotateNShoot implements Controller {
	Action action = new Action();

	public Action action(Game game) {
		action.shoot = true;
		action.turn = 1;
		return action;
	}

	@Override
	public Action action() {
		action.shoot = true;
		action.turn = 1;
		return this.action;
	}

	public void update(AlienShip alien) {
		/* empty on purpose: this controller does not have any variable
		 * components to be updated	 */
	}
}