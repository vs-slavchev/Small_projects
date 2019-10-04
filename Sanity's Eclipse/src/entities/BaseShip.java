package entities;

import game.Action;
import game.Constants;
import game.Game;

import java.awt.Graphics2D;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import controllers.Controller;
import utilities.Animation;
import utilities.AnimationManager;
import utilities.ParticleEmitter;
import utilities.Vector2D;

public abstract class BaseShip extends GameObject {

	protected long lastShootTime;
	protected Controller ctrl;
	public Action action = new Action();
	protected int shootInterval = 300;
	protected boolean forcedShooting = false;
	protected final int MAX_INVUL_TIMER = 255;
	// decreased to control invulnerability
	protected int invulnerabilityTimer = this.MAX_INVUL_TIMER;
	protected int weaponGrade = 1;
	protected final int maxWeaponGrade = 5;
	protected String bulletType = "glow";
	protected Animation invulShieldAnimation;
	protected ParticleEmitter particleEmitter = new ParticleEmitter(100, 12);
	protected CopyOnWriteArrayList<PowerupEffect> powerupList = new CopyOnWriteArrayList<>();

	public BaseShip(Vector2D s, Vector2D v, double r) {
		super(s, v, r);
		invulShieldAnimation = new Animation((int) s.x, (int) s.y, 1.5, 0.075,
				8, "shieldSprite", true);
	}

	public void update(List<GameObject> objects) {
		super.update(objects);
		invulShieldAnimation.setPosition((int) s.x, (int) s.y);
		invulShieldAnimation.update();
		for (PowerupEffect powerup : powerupList) {
			powerup.update();
			if (powerup.isInvulnerabilityShield()) {
				invulnerabilityTimer = MAX_INVUL_TIMER;
				powerup.setActive(false);
			} else if (powerup.isUpgrWeapon()) {
				incrementWeaponGrade();
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

		if (actionObj.thrust == 1) {
			int bonusVelocity = 0;
			for (PowerupEffect powerup : powerupList) {
				bonusVelocity += powerup.getBonusVelocity();
			}
			this.v.add(this.d, Constants.DT
					* (Constants.MAG_ACC + bonusVelocity));
		}

		else if (actionObj.thrust == -1) {
			int bonusVelocity = 0;
			for (PowerupEffect powerup : powerupList) {
				bonusVelocity += powerup.getBonusVelocity();
			}
			this.v.add(this.d, Constants.DT
					* -(Constants.MAG_ACC + bonusVelocity));
		}

		this.v.mult(Constants.LOSS);

		long currentTimeDifference = System.currentTimeMillis()
				- this.lastShootTime;
		int currentShootInterval = this.shootInterval;
		for (PowerupEffect powerupEffect : powerupList) {
			currentShootInterval += powerupEffect.getRapidFire();
		}
		if ((forcedShooting || actionObj.shoot)
				&& currentTimeDifference > currentShootInterval) {
			this.lastShootTime = System.currentTimeMillis();

			switch (weaponGrade) {
			case 2:
				objects.add(mkBullet(0, 0.5));
				objects.add(mkBullet(0, -0.5));
				break;
			case 3:
				objects.add(mkBullet(0, 1));
				objects.add(mkBullet(0, -1));
				objects.add(mkBullet(0, 0));
				break;
			case 4:
				objects.add(mkBullet(0, 1.2));
				objects.add(mkBullet(0, -1.2));
				objects.add(mkBullet(5, 0.4));
				objects.add(mkBullet(5, -0.4));
				break;
			case 5:
				objects.add(mkBullet(0, 1.5));
				objects.add(mkBullet(0, -1.5));
				objects.add(mkBullet(0, 0.8));
				objects.add(mkBullet(0, -0.8));
				objects.add(mkBullet(5, 0));
				break;
			default:
				objects.add(mkBullet(0, 0));
				break;
			}
			actionObj.shoot = false;
			forcedShooting = false;
		}

		if (this.invulnerabilityTimer > 0) {
			this.invulnerabilityTimer--;
		}
	}

	public boolean overlap(GameObject other) {
		return super.overlap(other);
	}

	public void hit() {
		if (invulnerabilityTimer > 0) {
			return;
		}
		super.hit();
		Game.addScore(100);
		AnimationManager.spawnAnimation("explosion", (int) s.x, (int) s.y,
				1 + radius / 35);
		Game.spawnPowerup(s);
	}

	public GameObject mkBullet(double offsetXY, double offsetRot) {
		/*
		 * offsetXY defines the offset from the center of the ship; offsetRot
		 * defines the +/- rotation of the "looking at" direction
		 */
		Vector2D bulletVel = new Vector2D(this.v);
		Vector2D dd = new Vector2D(this.d);
		dd.set(this.d.x * (-1), this.d.y * -1);
		bulletVel.add(dd, Constants.MUZZLE_VEL);
		double rot = this.d.theta() + Math.PI;

		Bullet bullet = new Bullet(new Vector2D(this.s.x
				+ Math.cos(rot + offsetRot) * (this.radius + 2 + offsetXY),
				this.s.y + Math.sin(rot + offsetRot)
						* (this.radius + 2 + offsetXY)), bulletVel, this.d,
				bulletType);
		return bullet;
	}

	public Bullet mkScatterBullet(double rotateDir) {

		Vector2D direction = new Vector2D(1, 0);
		direction.rotate(rotateDir);
		Vector2D bulletVel = new Vector2D(this.v);
		Vector2D dd = new Vector2D(direction);
		dd.set(direction.x, direction.y);
		bulletVel.add(dd, Constants.MUZZLE_VEL);

		Bullet bullet = new Bullet(new Vector2D(this.s.x + Math.cos(rotateDir)
				* (this.radius + 2), this.s.y + Math.sin(rotateDir)
				* (this.radius + 2)), bulletVel, direction, bulletType);
		return bullet;
	}

	protected void scatterBullets(List<GameObject> objects, int number) {
		for (double i = 0.0; i < 2 * Math.PI; i += (2 * Math.PI) / number) {
			objects.add(mkScatterBullet(i));
		}
	}

	public void draw(Graphics2D g) {
		if (invulnerabilityTimer > 0) {
			invulShieldAnimation.drawAnimation(g);
		}
	}

	public int getInvulnerabilityTimer() {
		return this.invulnerabilityTimer;
	}

	public void receivePowerup(String powerupType) {
		powerupList.add(new PowerupEffect(powerupType));
	}

	public void incrementWeaponGrade() {
		weaponGrade++;
		if (weaponGrade > maxWeaponGrade) {
			weaponGrade = maxWeaponGrade;
		}
	}

	public void setWeaponGrade(int grade) {
		weaponGrade = grade;
		if (weaponGrade > maxWeaponGrade) {
			weaponGrade = maxWeaponGrade;
		}
	}

	public void decrementWeaponGrade() {
		weaponGrade--;
		if (weaponGrade < 1) {
			weaponGrade = 1;
		}
	}

}
