package entities;

import game.Action;
import game.Game;

import java.awt.Graphics2D;
import java.awt.geom.AffineTransform;
import java.util.List;

import controllers.Controller;
import utilities.AnimationManager;
import utilities.ImageManager;
import utilities.Vector2D;

public class AlienShip extends BaseShip {

	protected String type;
	protected int health = 1;
	protected int scoreBounty = 200;

	public AlienShip(Vector2D s, Vector2D v, double r, String type,
			Controller controller, int health, String bulletType,
			int scoreBounty) {
		super(s, v, r);
		this.type = type;
		this.ctrl = controller;
		this.action = new Action();
		this.d = new Vector2D(1, 1);
		this.d.normalise();
		this.health = health;
		this.bulletType = bulletType;
		this.scoreBounty = scoreBounty;
	}

	public void update(List<GameObject> objects) {
		super.update(objects);
		ctrl.update(this);

		Vector2D particleCoords = new Vector2D(0, 45);
		particleCoords.rotate(d.theta() - Math.PI / 2);
		particleEmitter.emittParticle((int) (s.x + particleCoords.x),
				(int) (s.y + particleCoords.y));
		particleEmitter.emittParticle((int) (s.x + particleCoords.x),
				(int) (s.y + particleCoords.y));
	}

	public void draw(Graphics2D g) {
		super.draw(g);

		AffineTransform at = g.getTransform();
		double shipImageWidth = ImageManager.getImage(type).getWidth(null) / 2;
		double shipImageHeight = ImageManager.getImage(type).getHeight(null) / 2;
		double rot = this.d.theta() + Math.PI / 2; // used to be pi/2
		particleEmitter.drawParticles(g);

		g.setTransform(at);
		g.translate(this.s.x, this.s.y);
		g.rotate(rot);
		g.translate(-shipImageWidth, -shipImageHeight);
		g.drawImage(ImageManager.getImage(type), 0, 0, null);

		g.setTransform(at);
	}

	@Override
	public void hit() {
		AnimationManager
				.spawnAnimation("bulletImpact", (int) s.x, (int) s.y, 1);
		if (invulnerabilityTimer > 0) {
			return;
		}
		health--;
		if (health <= 0) {
			this.dead = true;
			Game.addScore(scoreBounty);
			AnimationManager.spawnAnimation("explosion", (int) s.x, (int) s.y,
					1 + radius / 35);
			Game.spawnPowerup(s);
		}
	}

}
