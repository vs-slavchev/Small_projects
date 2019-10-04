package entities;

import utilities.AnimationManager;
import utilities.ImageManager;
import utilities.SoundManager;
import utilities.Vector2D;
import game.Constants;
import game.Game;

import java.awt.Graphics2D;
import java.awt.geom.AffineTransform;

public class Asteroid extends GameObject {
	private static final double MAX_SPEED = 100;
	private int type;
	private double angdeg, angModifier;

	public Asteroid(double sx, double sy, double vx, double vy, Vector2D d,
			double asteroidRadius, int type) {
		super(new Vector2D(sx, sy), new Vector2D(vx, vy), asteroidRadius);
		this.type = type;
		this.d = d;
		this.angModifier = -2 + Math.random() * 4;
	}

	public static Asteroid makeRandomAsteroid() {
		return new Asteroid(Math.random() * Constants.FRAME_WIDTH,
				Math.random() * (Constants.FRAME_HEIGHT * 2 / 3),
				Game.modifyVelocity(-100 + Math.random() * 200),
				Game.modifyVelocity(-100 + Math.random() * 200),
				new Vector2D(10, 10), 20 + Math.random() * 30,
				(int) Math.round((Math.random() * 2)));
	}

	public void hit() {
		Game.addScore(100);
		SoundManager.playByIndex((int) (Math.random() * 2));
		AnimationManager.spawnAnimation("explosion", (int) s.x, (int) s.y,
				1 + radius / 35);
		Game.spawnPowerup(this.s);
		super.hit();
	}

	public void update() {
		this.s.add(this.v, Constants.DT);
		this.s.wrap(Constants.FRAME_WIDTH, Constants.FRAME_HEIGHT);
	}

	public void draw(Graphics2D g) {

		AffineTransform at = g.getTransform();
		g.translate(s.x, s.y);
		angdeg += angModifier;
		if (angdeg > 360) {
			angdeg = 0.0;
		}
		if (angdeg < 0) {
			angdeg = 360.0;
		}
		g.rotate(this.d.theta() + Math.toRadians(angdeg));
		String end = Integer.toString(type);
		g.drawImage(ImageManager.getImage("asteroid" + end), (int) (-radius),
				(int) (-radius), (int) radius * 2, (int) radius * 2, null);
		g.setTransform(at);

	}
}
