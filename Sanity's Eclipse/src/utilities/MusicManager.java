package utilities;

import java.io.IOException;
import java.util.LinkedList;
import java.util.Queue;
import java.util.Random;

import org.newdawn.easyogg.OggClip;

public class MusicManager {

	public boolean isPaused = false;
	private OggClip backgroundMusic;
	private Queue<String> songNames = new LinkedList<>();
	private final String[] songs = { "Teminite - Shockwave",
			"Spag Heddy - The Master", "Spag Heddy - Onvang",
			"Porter Robinson - Unison Knife Party Remix",
			"Knife Party - Power Glove", "Knife Party - Fire Hive",
			"Knife Party - EDM Death Machine", "Knife Party - Bonfire",
			"Eliminate - Free Fall" };

	public MusicManager() {
		/*shuffleArray(songs);
		for (int i = 0; i < songs.length; i++) {
			songNames.add(songs[i]);
		}
		loadNextSong();*/
	}

	// Fisher-Yates algorithm to shuffle the songs in the array
	private static void shuffleArray(String[] ar) {
		/*Random rnd = new Random();
		for (int i = ar.length - 1; i > 0; i--) {
			int index = rnd.nextInt(i + 1);
			String a = ar[index];
			ar[index] = ar[i];
			ar[i] = a;
		}*/
	}

	private void loadNextSong() {
		/*try {
			this.backgroundMusic = new OggClip("music/" + songNames.poll()
					+ ".ogg");
		} catch (IOException e) {
			System.out.println(e.getMessage());
			e.printStackTrace();
		}*/
	}

	// checks if the song has finished, and loads and plays the next one
	public void updateMusic() {
		/*if (songNames.isEmpty()) {
			for (int i = 0; i < songs.length; i++) {
				songNames.add(songs[i]);
			}
		}
		if (!isPlayingBackgroundMusic() && !isPaused) {
			loadNextSong();
			playBackgroundMusic();
		}*/
	}

	public boolean isPlayingBackgroundMusic() {
		return true;
		//return !backgroundMusic.stopped();
	}

	public void playBackgroundMusic() {
		/*this.backgroundMusic.play();
		this.backgroundMusic.setGain(0.75f);
		this.backgroundMusic.setBalance(-1.0f);*/
	}

	public void stopBackgroundMusic() {
		//this.backgroundMusic.stop();
	}

}
