package utilities;

import java.awt.Color;
import java.awt.Graphics2D;
import java.util.Iterator;
import java.util.concurrent.CopyOnWriteArrayList;

import utilities.Particle;

public class ParticleEmitter {

	private CopyOnWriteArrayList<Particle> particles = new CopyOnWriteArrayList<>();
	private int numMaxParticles;
	private int particlePositionOffset;
	private int currentIndex;

	public ParticleEmitter(int numMaxParticles, int particlePositionOffset) {
		this.numMaxParticles = numMaxParticles;
		this.particlePositionOffset = particlePositionOffset;
		this.currentIndex = 0;
	}

	public void emittParticle(int x, int y) {
		Color randomColor = new Color((int) (200 + Math.random() * 55),
				(int) (128 + Math.random() * 127), 0);

		if (particles.size() > currentIndex
				&& particles.get(currentIndex) != null) {
			particles.remove(currentIndex);
			particles.add(currentIndex, new Particle(x, y,
					particlePositionOffset, randomColor));
		} else {
			particles.add(new Particle(x, y, particlePositionOffset,
					randomColor));
		}

		currentIndex++;
		if (currentIndex >= numMaxParticles) {
			currentIndex = 0;
		}
	}

	public synchronized void drawParticles(Graphics2D g) {
		for (final Iterator<Particle> iterator = particles.iterator();
				iterator.hasNext();) {
			iterator.next().drawParticle(g);
		}
	}

}
