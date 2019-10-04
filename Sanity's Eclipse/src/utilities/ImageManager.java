package utilities;

import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import javax.imageio.ImageIO;

public class ImageManager {

	final static String path = "images/";
	final static String ext = ".png";

	static Map<String, Image> images = new HashMap<String, Image>();

	public static Image getImage(String s) {
		return images.get(s);
	}

	public static Image loadImage(String fname) throws IOException {
		BufferedImage img = null;
		img = ImageIO.read(new File(path + fname + ext));
		images.put(fname, img);
		return img; 
	}

	public static Image loadImage(String imName, String fname) throws IOException {
		BufferedImage img = null;
		img = ImageIO.read(new File(path + fname + ext));
		images.put(imName, img);
		return img; 
	}

	public static void initImages() throws IOException{
		ArrayList<String> imageNames = new ArrayList<>();
			imageNames.add("backgr0");
			imageNames.add("backgr1");
			imageNames.add("backgr2");
			imageNames.add("backgr3");
			imageNames.add("backgr4");
			imageNames.add("backgr5");
			imageNames.add("backgr6");
			imageNames.add("backgr7");
			imageNames.add("backgr8");
			imageNames.add("backgr9");
			imageNames.add("ship");
			imageNames.add("asteroid1");
			imageNames.add("asteroid0");
			imageNames.add("asteroid2");
			imageNames.add("retroheart");
			imageNames.add("gameover");
			imageNames.add("finalscore");
			imageNames.add("glow");
			imageNames.add("redBullet");
			imageNames.add("purpleBullet");
			imageNames.add("orangeBullet");
			imageNames.add("greenBullet");
			imageNames.add("pinkBullet");
			imageNames.add("numbers");
			imageNames.add("bonusVelocity");
			imageNames.add("rapidFire");
			imageNames.add("invulnerabilityShield");
			imageNames.add("bonusLife");
			imageNames.add("upgrWeapon");
			imageNames.add("shieldSprite");
			imageNames.add("scatter");
			imageNames.add("barFrame");
			imageNames.add("barFiller");
			imageNames.add("shieldSpriteGreen");
			imageNames.add("coin");
			imageNames.add("alienShip1");
			imageNames.add("alienShip2");
			imageNames.add("alienShip3");
			imageNames.add("alienShip4");
			imageNames.add("alienShip5");
			imageNames.add("bulletImpact");
			imageNames.add("mine");
			imageNames.add("mainMenu");
			imageNames.add("logo");
			imageNames.add("play");
			imageNames.add("music");
			imageNames.add("quit");
			imageNames.add("selector");
			imageNames.add("ingameScore");
			imageNames.add("ingameDigits");
			
			for (int j = 0; j < 23; j++){
				String tmp = String.format("asteroidExplosion/expl_01_%04d", j);
				imageNames.add(tmp);
			}
			for (int i = 0; i < 24; i++){
				String tmp = String.format("asteroidExplosion/expl_11_%04d", i);
				imageNames.add(tmp);
			}
			for (int j = 0; j < 31; j++){
				String tmp = String.format("asteroidExplosion/expl_10_%04d", j);
				imageNames.add(tmp);
			}
			for (int j = 0; j < 31; j++){
				String tmp = String.format("asteroidExplosion/expl_09_%04d", j);
				imageNames.add(tmp);
			}

		loadImages(imageNames);
	}
	
	public static void loadImages(String[] fNames) throws IOException {
		for (String s : fNames)
			loadImage(s);
	}

	public static void loadImages(Iterable<String> fNames) throws IOException {
		for (String s : fNames)
			loadImage(s);
	}

}
