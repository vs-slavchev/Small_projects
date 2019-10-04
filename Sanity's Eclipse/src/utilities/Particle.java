package utilities;

import java.awt.Color;
import java.awt.Graphics2D;

public class Particle {
	private int x, y;
	private Color color;

	/* the offset is used to introduce
	 * varying x and y coordinates of the particles */
	public Particle(int x, int y, int positionOffset, Color color) {
		this.x = (int) (x - positionOffset + Math.random() * positionOffset * 2);
		this.y = (int) (y - positionOffset + Math.random() * positionOffset * 2);
		this.color = color;
	}

	public void drawParticle(Graphics2D g) {
		g.setColor(color);
		// java does not support single pixel drawing :(
		g.drawLine(x, y, x, y);
	}
}
