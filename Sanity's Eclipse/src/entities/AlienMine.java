package entities;

import java.awt.Graphics2D;
import java.util.List;

import utilities.Animation;
import utilities.AnimationManager;
import utilities.SoundManager;
import utilities.Vector2D;

/* mines are deployed by the alienBomber class */
public class AlienMine extends GameObject {
	private Animation animation;

	public AlienMine(Vector2D s, Vector2D v, double r) {
		super(s, v, r);

		animation = new Animation((int) s.x, (int) s.y, 1, 0.075, 4, "mine",
				true);
	}

	public void update(List<GameObject> objects) {
		super.update(objects);
		animation.update();
		animation.setPosition((int) s.x, (int) s.y);
	}

	public void hit() {
		SoundManager.playByIndex((int) (Math.random() * 2));
		AnimationManager.spawnAnimation("mineExplosion", (int) s.x, (int) s.y, 2);
		super.hit();
	}

	public void draw(Graphics2D g) {
		animation.drawAnimation(g);
	}
}
