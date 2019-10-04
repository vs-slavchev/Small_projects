package entities;

import game.Constants;
import game.Game;

import controllers.Controller;
import utilities.Vector2D;

public class AlienBomber extends AlienShip {

	public AlienBomber(Vector2D s, Vector2D v, double r, String type,
			Controller controller, int health, String bulletType) {
		super(s, v, r, type, controller, health, bulletType, 200);
		acceleration = Constants.DT / 2;
		shootInterval = 4000;
	}

	public GameObject mkBullet(double offsetXY, double offsetRot) {

		double rot = this.d.theta() + Math.PI;
		Vector2D randomXYVelocity = new Vector2D(Game.modifyVelocity(-20
				+ Math.random() * 40), Game.modifyVelocity(-20 + Math.random()
				* 40));
		AlienMine mine = new AlienMine(new Vector2D(this.s.x + Math.cos(rot)
				* -(this.radius + 80), this.s.y + Math.sin(rot)
				* -(this.radius + 80)), randomXYVelocity, 30);
		return mine;
	}

}
