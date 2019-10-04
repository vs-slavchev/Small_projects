package entities;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.geom.AffineTransform;
import java.util.List;

import controllers.Controller;
import game.Action;
import game.Constants;
import game.Game;
import utilities.Animation;
import utilities.AnimationManager;
import utilities.ImageManager;
import utilities.ParticleEmitter;
import utilities.Vector2D;

public class Ship extends BaseShip {

	/* 3 variables are used to control the shield */
	private static double currentShield = 50.0;
	private double maxShield = 100.0;
	private double shieldRegen = 0.005;
	protected Animation shieldAnimation;
	private static boolean shieldOn = false;
	private static boolean thrusting = false;

	public Ship(Controller ctrl) {
		super(new Vector2D(Constants.FRAME_WIDTH / 2,
				(Constants.FRAME_HEIGHT * 5 / 6)), new Vector2D(0, 0),
				Constants.SHIP_RADIUS);
		this.ctrl = ctrl;
		this.d = new Vector2D(0, 1);
		this.action = new Action();
		this.d.normalise();
		particleEmitter = new ParticleEmitter(200, 8);
		reset();
		this.shootInterval = 200;
		acceleration = 1.5 * Constants.DT;
		weaponGrade = 3;

		shieldAnimation = new Animation((int) s.x, (int) s.y, 1.5, 0.075, 8,
				"shieldSpriteGreen", true);
	}

	public void reset() {
		this.s.set(Constants.FRAME_WIDTH / 2, (Constants.FRAME_HEIGHT * 5 / 6));
		this.d.set(0, 1);
		this.v.set(0, 0);
	}

	public void hit() {
		if (this.invulnerabilityTimer <= 0 && !isShieldOn()) {
			Game.removeLives();
			AnimationManager.spawnAnimation("explosion", (int) s.x, (int) s.y,
					1 + radius / 35);
			Game.addScore(25);
			if (Game.getLives() > 0) {
				reset();
				decrementWeaponGrade();
			} else {
				this.dead = true;
				Game.setCurrentWave(1);
			}
			this.invulnerabilityTimer = this.MAX_INVUL_TIMER;
		}
	}

	public void giveInvulnerability() {
		invulnerabilityTimer = MAX_INVUL_TIMER;
	}

	public void update(List<GameObject> objects) {
		super.update(objects);
		shieldAnimation.setPosition((int) s.x, (int) s.y);
		shieldAnimation.update();
		for (PowerupEffect powerup : powerupList) {
			if (powerup.isBonusLife()) {
				Game.incrementLives();
				powerup.setActive(false);
			}
			if (powerup.isCoin()) {
				Game.addScore(1000);
				powerup.setActive(false);
			}
		}

		if (action.thrust == 1) {
			thrusting = true;
		}

		Vector2D particleCoords = new Vector2D(35, 50);
		particleCoords.rotate(d.theta() - Math.PI / 2);
		particleEmitter.emittParticle((int) (s.x + particleCoords.x),
				(int) (s.y + particleCoords.y));
		particleEmitter.emittParticle((int) (s.x + particleCoords.x),
				(int) (s.y + particleCoords.y));

		particleCoords = new Vector2D(-35, 50);
		particleCoords.rotate(d.theta() - Math.PI / 2);
		particleEmitter.emittParticle((int) (s.x + particleCoords.x),
				(int) (s.y + particleCoords.y));
		particleEmitter.emittParticle((int) (s.x + particleCoords.x),
				(int) (s.y + particleCoords.y));

		currentShield += shieldRegen;
		if (currentShield >= maxShield) {
			currentShield = maxShield;
		}
	}

	/*
	 * Calculate the distance between the centers of the triangle and circle
	 * using the Pythagorean theorem. The triangle "radius" is determined by the
	 * angle at which the circle approaches, defined by the relation of the
	 * difference between the x and y coordinates of each figure.
	 */
	public boolean overlap(GameObject other) {

		if (invulnerabilityTimer > 0 || isShieldOn()) {
			return super.overlap(other);
		}
		double marginX = Math.abs(other.s.x - this.s.x);
		double marginY = Math.abs(other.s.y - this.s.y);

		Vector2D otherCoords = new Vector2D(marginX, marginY);
		double rot = this.d.theta() + Math.PI / 2;
		otherCoords.rotate(-rot);

		boolean nearZero = (Math.min(marginX, marginY) < 1)
				&& (Math.min(marginX, marginY) > -1);
		double lesserMargin = nearZero ? 1 : Math.min(marginX, marginY);
		double marginRelation = Math.round(Math.max(marginX, marginY)
				/ lesserMargin);
		double maxMarginRelation = other.radius + Constants.YPTRIANGLE[0]
				* Constants.TRIANGLESCALE;
		double distance = Math
				.sqrt(Math.pow(marginX, 2) + Math.pow(marginY, 2));
		double triangleRadius = 0.5d
				* Constants.TRIANGLESCALE
				+ ((marginRelation / maxMarginRelation) * (0.5d * Constants.TRIANGLESCALE));

		if (distance < triangleRadius + other.radius) {
			return true;
		}
		return false;
	}

	public void draw(Graphics2D g) {
		super.draw(g);
		if (isShieldOn()) {
			currentShield -= 0.2;
			if (currentShield <= 0.0) {
				currentShield = 0.0;
				setShieldOn(false);
			}
			shieldAnimation.drawAnimation(g);
		}

		AffineTransform at = g.getTransform();
		double shipImageWidth = ImageManager.getImage("ship").getWidth(null) / 2;
		double shipImageHeight = ImageManager.getImage("ship").getHeight(null) / 2;
		double rot = this.d.theta() + Math.PI / 2;
		particleEmitter.drawParticles(g);
		g.setTransform(at);

		drawThrustFire(g, rot);
		g.setTransform(at);

		g.translate(this.s.x, this.s.y);
		g.rotate(rot);
		g.translate(-shipImageWidth, -shipImageHeight);
		g.drawImage(ImageManager.getImage("ship"), 0, 0, null);

		g.setTransform(at);
	}

	protected void drawThrustFire(Graphics2D g, double rot) {
		if (thrusting) {
			g.setColor(new Color(255, 200, 0));
			g.translate(this.s.x, this.s.y);
			g.rotate(rot);
			int thrustCoefficient = (thrusting ? 1 : 0);
			g.fillOval(-37, -50, thrustCoefficient * 9, thrustCoefficient * 15);
			g.fillOval(30, -50, thrustCoefficient * 9, thrustCoefficient * 15);
		}
	}

	public static boolean isThrusting() {
		return thrusting;
	}

	public static void setThrusting(boolean thrusting) {
		Ship.thrusting = thrusting;
	}

	public static boolean isShieldOn() {
		return shieldOn;
	}

	public static void setShieldOn(boolean shieldOn) {
		Ship.shieldOn = shieldOn;
	}

	public static double getCurrentShield() {
		return currentShield;
	}

	public double getMaxShield() {
		return maxShield;
	}

}