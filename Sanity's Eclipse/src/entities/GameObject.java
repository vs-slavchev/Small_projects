package entities;

import game.Constants;
import game.Game;

import java.awt.Graphics2D;
import java.util.List;

import utilities.SoundManager;
import utilities.Vector2D;

public abstract class GameObject {
	protected Vector2D s, v;
	protected Vector2D d;
	protected double radius;
	protected boolean dead;
	protected double acceleration = Constants.DT;

	public GameObject(Vector2D s, Vector2D v, double r) {
		this.s = s;
		this.v = v;
		this.radius = r;
		this.dead = false;
	}

	public boolean overlap(GameObject other) {
		double marginX = Math.abs(other.s.x - this.s.x);
		double marginY = Math.abs(other.s.y - this.s.y);

		double distance = Math
				.sqrt(Math.pow(marginX, 2) + Math.pow(marginY, 2));
		if (distance < this.radius + other.radius) {
			return true;
		}
		return false;
	}

	public void collisionHandling(GameObject other) {
		if (this.getClass() != other.getClass() && this.overlap(other)) {

			if (this instanceof Powerup || other instanceof Powerup) {

				if (this instanceof Powerup && other instanceof BaseShip) {
					((BaseShip) other).receivePowerup(((Powerup) this)
							.getType());
					SoundManager.playByIndex(4);
					this.hit();
					return;
				} else if (other instanceof Powerup && this instanceof BaseShip) {
					((BaseShip) this).receivePowerup(((Powerup) other)
							.getType());
					SoundManager.playByIndex(4);
					other.hit();
					return;
				}
				return;
			}
			this.hit();
			other.hit();
		}
	}

	public void hit() {
		this.dead = true;
	}

	public boolean isDead() {
		return dead;
	}

	public void setDead(boolean dead) {
		this.dead = dead;
	}

	public void update(List<GameObject> objects) {
		this.s.add(this.v, acceleration);
		this.s.wrap(Constants.FRAME_WIDTH, Constants.FRAME_HEIGHT);
	}

	public double getX() {
		return s.x;
	}

	public double getY() {
		return s.y;
	}

	public Vector2D getD() {
		return d;
	}

	public abstract void draw(Graphics2D g);

}
