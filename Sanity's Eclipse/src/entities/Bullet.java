package entities;

import game.Constants;

import java.awt.Graphics2D;
import java.awt.geom.AffineTransform;
import java.util.List;

import utilities.ImageManager;
import utilities.Vector2D;

public class Bullet extends GameObject {
	public static final int RADIUS = 1;
	private double rot;
	private String animName;

	public Bullet(Vector2D s, Vector2D v, Vector2D d, String animName) {
		super(s, v, RADIUS);
		this.d = d;
		this.rot = d.theta() + Math.PI / 2;
		this.animName = animName;
	}

	public void draw(Graphics2D g) {

		AffineTransform at = g.getTransform();
		double beamImageWidth = ImageManager.getImage(animName).getWidth(null) / 2;
		double beamImageHeight = ImageManager.getImage(animName)
				.getHeight(null) / 2;
		int x = (int) this.s.x;
		int y = (int) this.s.y;

		g.translate(x, y);
		g.rotate(this.rot);
		g.translate(-beamImageWidth, -beamImageHeight);
		g.drawImage(ImageManager.getImage(animName), 0, 0, null);
		g.setTransform(at);
	}

	public void update(List<GameObject> objects) {

		this.s.add(this.v, Constants.DT);

		boolean outOfScreen = this.s.x < 0 || this.s.y < 0
				|| this.s.x > Constants.FRAME_WIDTH
				|| this.s.y > Constants.FRAME_HEIGHT;
		if (outOfScreen) {
			this.dead = true;
		}
	}

}