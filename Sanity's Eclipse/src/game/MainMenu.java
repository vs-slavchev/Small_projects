package game;

import game.StateManager.States;

import java.awt.*;
import java.awt.image.ImageObserver;

import utilities.ImageManager;

public class MainMenu {
	private double slideProgress;
	private double slideModifier = 0.02;
	private int currentOption = 0;
	private final String[] options = { "play", "music", "quit" };
	ImageObserver observer = new ImageObserver() {
		@Override
		public boolean imageUpdate(Image img, int infoflags, int x, int y, int width, int height) {
			return false;
		}
	};

	public void goUp() {
		if (currentOption == 0) {
			currentOption = options.length - 1;
		} else {
			currentOption--;
		}
	}

	public void goDown() {
		if (currentOption == options.length - 1) {
			currentOption = 0;
		} else {
			currentOption++;
		}
	}

	@SuppressWarnings("incomplete-switch")
	public void select() {
		String choice = options[currentOption];
		switch (choice) {
		case "play":
			StateManager.getStateManager().setState(States.PLAY);
			break;
		case "music":
			if (Game.getMusicManager().isPlayingBackgroundMusic()
					&& !(Game.getMusicManager().isPaused)) {
				Game.getMusicManager().isPaused = true;
				Game.getMusicManager().stopBackgroundMusic();
			} else {
				Game.getMusicManager().isPaused = false;
				Game.getMusicManager().playBackgroundMusic();
			}
			break;
		case "quit":
			System.exit(0);
			break;
		}

	}

	public void drawMenuBackground(Graphics2D g) {
		double imgWidth = ImageManager.getImage("mainMenu").getWidth(observer);
		double imgHeight = ImageManager.getImage("mainMenu").getHeight(observer);

		double distance = imgWidth - Constants.FRAME_WIDTH;

		slideProgress += slideModifier;
		if (slideProgress >= 100 || slideProgress <= 0) {
			slideModifier *= -1;
		}

		g.drawImage(ImageManager.getImage("mainMenu"), 0, 0,
				Constants.FRAME_WIDTH, Constants.FRAME_HEIGHT,
				(int) (slideProgress / 100 * distance), 0,
				(int) (slideProgress / 100 * distance + Constants.FRAME_WIDTH),
				(int) imgHeight, null);

	}

	public void drawMenu(Graphics2D g) {
		g.drawImage(ImageManager.getImage("logo"), Constants.FRAME_WIDTH / 2
				- ImageManager.getImage("logo").getWidth(null) / 2,
				Constants.FRAME_HEIGHT / 9, null);
		int offset = Constants.FRAME_HEIGHT / 9;
		for (int i = 0; i < options.length; i++) {
			int imgWidth = ImageManager.getImage(options[i]).getWidth(null);

			if (i == currentOption) {
				g.drawImage(ImageManager.getImage("selector"),
						Constants.FRAME_WIDTH / 2 - imgWidth / 2
								- (ImageManager.getImage("selector").getWidth(null) + 30),
								Constants.FRAME_HEIGHT * 2 / 5 + i * offset, null);
			}
			g.drawImage(ImageManager.getImage(options[i]),
					Constants.FRAME_WIDTH / 2 - imgWidth / 2,
					Constants.FRAME_HEIGHT * 2 / 5 + i * offset, null);
		}

	}

}
