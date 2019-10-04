package controllers;

import utilities.Vector2D;
import entities.AlienShip;
import game.Action;
import game.Game;

/* defines the logic behind the "charging" alien ship */
public class ChargeController implements Controller {
	Action action = new Action();

	@Override
	public Action action() {
		return this.action;
	}

	public void update(AlienShip alien) {

		double playerShipRelativeX = Game.getShip().getX() - alien.getX();
		double playerShipRelativeY = Game.getShip().getY() - alien.getY();
		double angleAlienDirection = alien.getD().theta();

		Vector2D toShip = new Vector2D(playerShipRelativeX, playerShipRelativeY);
		toShip.rotate(-angleAlienDirection);

		double angleToTarget = toShip.theta();

		tickTimer(angleToTarget);

		if (3.11 <= Math.abs(angleToTarget)) {
			this.action.thrust = -1;
		}
	}

	private void tickTimer(double angleToTarget) {
		this.action.turn = 0;
		if (angleToTarget > 0)
			this.action.turn = -1;
		else if (angleToTarget < 0) {
			this.action.turn = 1;
		}
	}

}
