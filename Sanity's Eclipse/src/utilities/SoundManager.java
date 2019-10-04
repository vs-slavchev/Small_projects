package utilities;

import javax.sound.sampled.Clip;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.FloatControl;

import java.io.File;

public class SoundManager {

	private final static String path = "sounds/";
	private static Clip[] clips = new Clip[6];

	public static void initSoundManager() {

		clips[0] = getClip("bangLarge");
		clips[1] = getClip("bangMedium");
		clips[2] = getClip("bangSmall");
		clips[3] = getClip("explosion");
		clips[4] = getClip("beep");
		clips[5] = getClip("pickup");

		for (int j = 0; j <= 3; j++) {
			FloatControl gainControl = (FloatControl) clips[j]
					.getControl(FloatControl.Type.MASTER_GAIN);
			gainControl.setValue(-15.0f);
		}

	}

	public static void playByIndex(int index) {
		if (index > clips.length) {
			System.out.println(" ei vandal nema tolko indexi be: " + index);
			return;
		}
		clips[index].setFramePosition(0);
		clips[index].start();
	}

	public static void play(Clip clip) {
		clip.setFramePosition(0);
		clip.start();
	}

	private static Clip getClip(String filename) {
		Clip clip = null;
		try {
			clip = AudioSystem.getClip();
			@SuppressWarnings("resource")
			AudioInputStream sample = AudioSystem.getAudioInputStream(new File(
					path + filename + ".wav"));
			clip.open(sample);
		} catch (Exception e) {
			e.printStackTrace();
		}
		return clip;
	}

}
