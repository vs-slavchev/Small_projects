package game;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import controllers.BomberController;
import controllers.ChargeController;
import controllers.RotateNShoot;
import controllers.SeekNShoot;
import entities.AlienBomber;
import entities.AlienScatter;
import entities.AlienShip;
import entities.Asteroid;
import entities.GameObject;
import entities.Powerup;
import entities.Ship;
import game.StateManager.States;
import utilities.AnimationManager;
import utilities.JEasyFrameFull;
import utilities.MusicManager;
import utilities.SoundManager;
import utilities.Vector2D;

/*
 * 							#	#	# RESOURCES USED IN THIS GAME:	#	#	#
 * 
 *  - All of the images used in this game are from websites(http://wallpaperswide.com/; www.zedge.net/wallpapers/) 
 *  for FREE wallpapers. I am not the creator of these images, and I do not claim any ownership of them.
 *  
 *  - All of the game sprites and game entity related images(ships, bullets, asteroids, powerups etc.)
 *   in this game are from the following website (http://opengameart.org/) and they are FREE for use.
 *   
 *  - The music used in this game IS copyrighted. I do not claim any ownership of the music.
 *  The game is for entertainment purposes only and I am not going to use the game to make profit out of it. 
 *  All of the music that I am using is held in MusicManager.java with their respective song names. All of the songs
 *  can be found on YouTube.com
 *  
 *  - The four .jar files that I am using in order to load up the .ogg music files are not mine, I have found them on
 *  the Internet and their are FREE to use. They can be found on: (http://www.cokeandcode.com/main/code/) and the name
 *  of the creator is Kevin Glass. I give him full credit.
 *  
 *  -All of the .wav sound files are either from the CE218 directory and they were generously provided by the module
 *  supervisor Norbert Voelker or from a website mentioned above (http://opengameart.org/) and they are FREE to use.
 *  
 * */
public class Game {

	private List<Asteroid> asteroids = new ArrayList<Asteroid>();
	private static CopyOnWriteArrayList<GameObject> objects = new CopyOnWriteArrayList<GameObject>();
	private Keys ctrl;
	private MenuKeys menuKeys;
	private static MainMenu mainMenu = new MainMenu();
	private static Ship ship;
	private static boolean gameRunning = true;
	private static MusicManager musicManager;
	// player related variables
	private static int score;
	private static int defaultLivesThreshold = 5000;
	private static int gainLivesThreshold = defaultLivesThreshold;
	private static int lives = 3;
	private static int currentWave = 1;

	public Game() {

		this.ctrl = new Keys();
		this.menuKeys = new MenuKeys(mainMenu);
		musicManager = new MusicManager();
		musicManager.playBackgroundMusic();
	}

	public static void main(String[] args) throws Exception {
		Game game = new Game();
		View view = new View(game);
		JEasyFrameFull jFrame = new JEasyFrameFull(view);
		SoundManager.initSoundManager();

		while (gameRunning) {
			jFrame.addKeyListener(game.menuKeys);
			while (StateManager.getStateManager().getState() == States.MENU
					&& gameRunning) {
				musicManager.updateMusic();
				view.repaint();
				Thread.sleep(Constants.DELAY);
			}
			jFrame.removeKeyListener(game.menuKeys);

			jFrame.addKeyListener(game.ctrl);
			game.spawnShip();
			game.generateEnemies();
			lives = 3;
			score = 0;
			view.intRandomBackgroundImg();
			while (StateManager.getStateManager().getState() == States.PLAY
					&& gameRunning) {
				game.checkListContents();
				game.update();
				musicManager.updateMusic();
				view.repaint();
				Thread.sleep(Constants.DELAY);
			}
			jFrame.removeKeyListener(game.ctrl);
		}
		System.exit(0);
	}

	private void spawnShip() {
		// dispose of old entities
		objects = new CopyOnWriteArrayList<>();
		asteroids = new ArrayList<Asteroid>();
		ship = null;
		// create new ship for the new game
		ship = new Ship(this.ctrl);
		objects.add(ship);
	}

	/*
	 * check if there are no more enemies on the level and generate new enemies
	 * if so
	 */
	private void checkListContents() {
		boolean running = false;
		for (GameObject obj : objects) {
			if ((obj instanceof AlienShip) || (obj instanceof Asteroid)) {
				running = true;
			}
		}
		if (!running) {
			generateEnemies();
			ship.giveInvulnerability();
			running = false;
		}
	}

	/* method generates stronger and numerous enemies as the game progresses */
	private void generateEnemies() {

		// initialize new entities
		for (int i = 0; i < Constants.N_INITIAL_ASTEROIDS; i++) {
			this.asteroids.add(Asteroid.makeRandomAsteroid());
		}
		objects.addAll(this.asteroids);

		double difficulty = 0;
		double maxDifficulty = 0 + currentWave;
		currentWave++;

		while (difficulty <= maxDifficulty) {

			if (Math.random() < (double) 25 / 100) {
				createAlienShip("alienShip1");
				difficulty += 3;
			} else if (Math.random() < (double) 50 / 100) {
				createAlienShip("alienShip2");
				difficulty += 1;
			} else if (Math.random() < (double) 60 / 100) {
				createAlienShip("alienShip3");
				difficulty += 2;
			} else if (Math.random() < (double) 80 / 100) {
				createAlienShip("alienShip4");
				difficulty += 5;
			} else {
				createAlienShip("alienShip5");
				difficulty += 2;
			}
		}
	}

	public static void addScore(int addition) {
		if (!(ship.getInvulnerabilityTimer() > 0)) {
			score += addition;
		}
	}

	public static void addLives() {
		if (score >= gainLivesThreshold) {
			gainLivesThreshold += defaultLivesThreshold;
			incrementLives();
		}
	}

	public static void removeLives() {
		lives--;
	}

	public static void incrementLives() {
		lives++;
		if (lives > Constants.MAX_LIVES) {
			lives = Constants.MAX_LIVES;
		}
	}

	@SuppressWarnings("static-method")
	private void update() {

		// update all animations
		AnimationManager.updateAnimations();
		for (int i = 0; i < Game.objects.size(); i++) {
			for (int j = i + 1; j < Game.objects.size(); j++) {
				Game.objects.get(i).collisionHandling(Game.objects.get(j));
			}
		}
		addLives();

		// update all entities
		List<GameObject> alive = new ArrayList<GameObject>();
		for (GameObject object : Game.objects) {
			object.update(alive);
			if (!object.isDead())
				alive.add(object);
		}
		synchronized (Game.class) {
			Game.objects.clear();
			Game.objects.addAll(alive);
		}
	}

	/* method spawns a random power-up with a varying bonus and velocity, takes
	 * the position of the old entity as an argument */
	public static void spawnPowerup(Vector2D s) {
		if (Math.random() < 0.33) {
			final String[] powerupNames = { "upgrWeapon", "bonusLife",
					"invulnerabilityShield", "rapidFire", "bonusVelocity",
					"scatter", "coin" };
			int powerupIndex = (int) Math.round(Math.random()
					* (powerupNames.length - 1));
			Vector2D randomXYVelocity = new Vector2D(modifyVelocity(-60
					+ Math.random() * 120), modifyVelocity(-40 + Math.random()
					* 80));
			Game.objects.add(new Powerup(new Vector2D(s), randomXYVelocity,
					30.0, powerupNames[powerupIndex]));
		}
	}

	/* a factory method that makes creating concrete ships easier */
	public void createAlienShip(String type) {
		Vector2D position = new Vector2D(Math.random() * Constants.FRAME_WIDTH,
				Math.random() * Constants.FRAME_HEIGHT * 3 / 4);

		switch (type) {
		case "alienShip1":
			objects.add(new AlienShip(position, new Vector2D(0.5, 0.5), 40,
					type, new SeekNShoot(), 3, "redBullet", 150));
			break;
		case "alienShip2":
			objects.add(new AlienShip(position, new Vector2D(0.65, 0.65), 35,
					type, new ChargeController(), 1, "redBullet", 100));
			break;
		case "alienShip3":
			objects.add(new AlienBomber(position, new Vector2D(0.5, 0.5), 40,
					type, new BomberController(), 4, "redBullet"));
			break;
		case "alienShip4":
			AlienShip alien = new AlienShip(position, new Vector2D(0.5, 0.5),
					40, type, new SeekNShoot(), 5, "greenBullet", 300);
			alien.setWeaponGrade(3);
			objects.add(alien);
			break;
		case "alienShip5":
			objects.add(new AlienScatter(position, new Vector2D(0.5, 0.5), 50,
					type, new RotateNShoot(), 4, "purpleBullet"));
			break;
		default:
			System.out.println("createAlienShip input type is not valid!");
		}

	}

	public void createMultipleShips(int num, String type) {
		int number = num;
		for (; number > 0; number--) {
			createAlienShip(type);
		}
	}

	/* a utility method that diverges values away from 0 */
	public static double modifyVelocity(double vel) {
		double velocity = vel;
		if (velocity < 0) {
			velocity -= 50;
		} else {
			velocity += 50;
		}
		return velocity;
	}

	public static Ship getShip() {
		return ship;
	}

	public static MainMenu getMainMenu() {
		return mainMenu;
	}

	public static double calculateDistance(double relativeX, double relativeY) {
		return Math.sqrt(Math.pow(relativeX, 2) + Math.pow(relativeY, 2));
	}

	public static int getLives() {
		return lives;
	}

	public static void setCurrentWave(int wave) {
		currentWave = wave;
	}

	public static boolean isGameRunning() {
		return gameRunning;
	}

	public static void setGameRunning(boolean gameRunning) {
		Game.gameRunning = gameRunning;
	}

	public static CopyOnWriteArrayList<GameObject> getObjects() {
		return objects;
	}

	public static MusicManager getMusicManager() {
		return musicManager;
	}

	public static int getScore() {
		return score;
	}
}