package entities;

import game.Action;
import game.Constants;

import java.awt.Graphics2D;
import java.util.List;

import utilities.Vector2D;
import controllers.Controller;

/* a type of alien ship that shoots scattered bullets everywhere */
public class AlienScatter extends AlienShip {

	public AlienScatter(Vector2D s, Vector2D v, double r, String type,
			Controller controller, int health, String bulletType) {
		super(s, v, r, type, controller, health, bulletType, 150);
		shootInterval = 3000;
	}

	public void update(List<GameObject> objects) {
		invulShieldAnimation.setPosition((int) s.x, (int) s.y);
		invulShieldAnimation.update();
		for (PowerupEffect powerup : powerupList) {
			powerup.update();
			if (powerup.isInvulnerabilityShield()) {
				invulnerabilityTimer = MAX_INVUL_TIMER;
				powerup.setActive(false);
			} else if (powerup.getRapidFire() != 0) {
				forcedShooting = true;
			} else if (powerup.isScatter()) {
				scatterBullets(objects, 20);
				powerup.setActive(false);
			}
			if (!powerup.getActive()) {
				powerupList.remove(powerup);
			}
		}

		Action actionObj = this.ctrl.action();

		if (actionObj.turn != 0) {
			this.d.rotate(actionObj.turn * Constants.STEER_RATE);
		}

		long currentTimeDifference = System.currentTimeMillis()
				- this.lastShootTime;
		int currentShootInterval = this.shootInterval;
		for (PowerupEffect powerupEffect : powerupList) {
			currentShootInterval += powerupEffect.getRapidFire();
		}

		if ((forcedShooting || actionObj.shoot)
				&& currentTimeDifference > currentShootInterval) {
			this.lastShootTime = System.currentTimeMillis();
			scatterBullets(objects, 20);
			actionObj.shoot = false;
			forcedShooting = false;
		}

		if (this.invulnerabilityTimer > 0) {
			this.invulnerabilityTimer--;
		}
	}

	public void draw(Graphics2D g) {
		super.draw(g);
	}

}
