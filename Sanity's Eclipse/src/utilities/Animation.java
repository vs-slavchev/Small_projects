package utilities;

import java.awt.Graphics2D;

public class Animation {
	// x,y - center of the animation
	private double x, y;
	private boolean active = true;
	private double currentFrame = 0.0;
	private double frameModifier;
	private int numberOfFrames;
	private double scale;
	private String name;
	private boolean isLooping;

	public Animation(int x, int y, double scale, double frameModifier,
			int numFrames, String name, boolean looping) {
		this.x = x;
		this.y = y;
		this.scale = scale;
		this.frameModifier = frameModifier;
		this.numberOfFrames = numFrames;
		this.name = name;
		this.isLooping = looping;
	}

	public void update() {
		currentFrame += frameModifier;
		if (currentFrame >= numberOfFrames) {
			if (isLooping) {
				currentFrame = 0.0;
			} else {
				active = false;
			}
		}
	}

	public void drawAnimation(Graphics2D g) {

		if (!active) {
			return;
		}

		// explosion animations are organized in separate files, require a
		// special method
		if (name.contains("expl")) {
			drawExplosionAnimation(g);
			return;
		}

		int dimensionX = ImageManager.getImage(name).getWidth(null)
				/ numberOfFrames;
		int dimensionY = (ImageManager.getImage(name).getHeight(null));
		g.drawImage(ImageManager.getImage(name), (int) (x - dimensionX * scale
				/ 2), (int) (y - dimensionY * scale / 2), (int) (x + dimensionX
				* scale / 2), (int) (y + dimensionY * scale / 2),
				(int) currentFrame * dimensionX, 0, (int) (currentFrame + 1)
						* dimensionX, dimensionY, null);
	}

	private void drawExplosionAnimation(Graphics2D g) {

		String s = String.format("asteroidExplosion/" + name + "%04d",
				(int) currentFrame);
		int dimensions = ImageManager.getImage(s).getWidth(null);
		g.drawImage(ImageManager.getImage(s),
				(int) (x - (dimensions * scale / 2)),
				(int) (y - (dimensions * scale / 2)),
				(int) (dimensions * scale),
				(int) (dimensions * scale), null);
	}

	public boolean getActive() {
		return this.active;
	}

	public void modifyPosition(double modX, double modY) {
		this.x += modX;
		this.y += modY;
	}

	public void setPosition(int x, int y) {
		this.x = x;
		this.y = y;
	}

}
