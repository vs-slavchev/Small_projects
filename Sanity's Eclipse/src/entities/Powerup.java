package entities;

import java.awt.Graphics2D;
import java.util.List;

import utilities.Animation;
import utilities.Vector2D;

public class Powerup extends GameObject {

	/* type represents both the name of the sprite file and the name of the
	 * power-up type */
	private String type;
	private Animation animation;
	private int lifeTimer;

	public Powerup(Vector2D s, Vector2D v, double r, String type) {
		super(s, v, r);

		this.type = type;
		this.lifeTimer = 1300;

		/* the coin animation used is a bit different than the other power-ups
		 * and requires special parameters */
		if (type.equals("coin")) {
			animation = new Animation((int) s.x, (int) s.y, 1, 0.075, 10, type,
					true);
			return;
		}
		animation = new Animation((int) s.x, (int) s.y, 1, 0.075, 8, type, true);
	}

	@Override
	public void draw(Graphics2D g) {
		animation.drawAnimation(g);
	}

	public void update(List<GameObject> objects) {
		super.update(objects);
		animation.update();
		animation.setPosition((int) s.x, (int) s.y);
		lifeTimer--;
		if (lifeTimer <= 0) {
			dead = true;
		}

	}

	public String getType() {
		return type;
	}

}
