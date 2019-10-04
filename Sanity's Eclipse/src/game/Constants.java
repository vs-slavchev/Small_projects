package game;

import java.awt.Color;
import java.awt.Dimension;

import utilities.JEasyFrameFull;

public class Constants {
	public static final int FRAME_HEIGHT = JEasyFrameFull.HEIGHT;
	public static final int FRAME_WIDTH = JEasyFrameFull.WIDTH;
	public static final Color BG_COLOR = Color.black;
	public static final Dimension FRAME_SIZE = new Dimension(
			Constants.FRAME_WIDTH, Constants.FRAME_HEIGHT);
	// sleep time between two frames in milliseconds
	public static final int DELAY = 10;

	// ship geometry
	public static final int SHIP_RADIUS = 45; //50
	public static final double STEER_RATE = 2 * Math.PI / 175; // in radians
																// per
	// magnitude of acceleration when thrust is applied
	public static final double MAG_ACC = 300;

	// constant speed loss factor
	public static final double LOSS = 0.99;
	public static final double MUZZLE_VEL = 800;
	
	// sleep time between two frames in seconds
	public static final double DT = DELAY / 1000.0;
	public static final int XP[] = { -1, -1, 1, 1 };
	public static final int YP[] = { 0, -2, -2, 0 };
	public static final int XPTRIANGLE[] = { 0, -1, 1 };
	public static final int YPTRIANGLE[] = { 1, -1, -1 };
	public static final int TRIANGLESCALE = 47;
	public static final int SCALE = 15;
	
	// content oriented constants
	public static final int GAIN_LIVES_THRESHOLD = 5000;
	public static final int N_INITIAL_ASTEROIDS = 6;
	public static final int MAX_LIVES = 6;
}