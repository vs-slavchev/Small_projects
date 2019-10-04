package utilities;

import java.awt.Graphics2D;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class AnimationManager {

	public static List<Animation> animations = new CopyOnWriteArrayList<>();

	@SuppressWarnings("incomplete-switch")
	public static void spawnAnimation(String type, int x, int y, double scale) {

		Animation anim = null;
		switch (type) {
		case "explosion":
			double rand = Math.random(); // explosions are randomly chosen
			if (rand < 0.33) {
				anim = new Animation(x, y, scale, 0.1, 31, "expl_10_", false);
			} else if (rand < 0.66) {
				anim = new Animation(x, y, scale, 0.1, 23, "expl_11_", false);
			} else {
				anim = new Animation(x, y, scale, 0.1, 31, "expl_09_", false);
			}
			break;
		case "bulletImpact":
			int shiftedX = (int) (x - 20 + Math.random() * 40);
			int shiftedY = (int) (y - 20 + Math.random() * 40);
			double alteredScale = scale - scale / 2 + Math.random() * scale;
			anim = new Animation(shiftedX, shiftedY, alteredScale, 0.3, 4,
					"bulletImpact", false);
			break;
		case "mineExplosion":
			anim = new Animation(x, y, scale, 0.1, 23, "expl_01_", false);
			break;
		}

		synchronized (animations) {
			if (anim != null) {
				animations.add(anim);
			}
		}
	}

	public static synchronized void updateAnimations() {
		for (final Iterator<Animation> iterator = animations.iterator()
				; iterator.hasNext();) {
			Animation anim = iterator.next();
			anim.update();
			if (!anim.getActive()) {
				animations.remove(anim);
			}
		}
	}

	public static synchronized void drawAnimations(Graphics2D g) {
		for (final Iterator<Animation> iterator = animations.iterator();
				iterator.hasNext();) {
			Animation anim = iterator.next();
			if (anim != null) {
				anim.drawAnimation(g);
			}
		}
	}
}
