package mainPackage;
import java.util.Random;
import java.util.Scanner;

import creaturePackage.Player;

/*
 * Class is used for random numbers, input and time keeping.
 */

public class GameUtil {

	private static int input = 0;
	private static Scanner inputScanner = new Scanner(System.in);
	private static Random rand = new Random();
	private static int timeofDay = 2; // start the game at 2 am
	
	
	public static int getrandom( int min, int max ){
		return min + rand.nextInt( max - min );
	}
	
	public static void validateInput( int min, int max){
		do{
			input = inputScanner.nextInt();
		}while( input < min || input > max ); //input is valid
	}
	
	public static void listenForInput(){
		input = inputScanner.nextInt();	
	}
	
	public static int getInput()
	{ return input; }
	
	public static void advanceinTime(){
		timeofDay++;
		if( timeofDay >= 24 )
			timeofDay = 0;
	}
	
	public static void advanceEightHoursSleep(){
		timeofDay = ( timeofDay + 8 ) % 24;
	}
	
	public static void endGame(Player player) {
		if (player.getHealth() <= 0) {
			System.out.println(" You have been slain!\n\n");
		} else {
			System.out.println(" You have successfully finished the game!\n"
					+ " There the road begins,"
					+ " 	where another one will end.\n" + " \n");

			System.out.print("	Ride like the wind, fight proud, my son...\n"
					+ " ...you are the Defender!\n\n\n");
		}

		System.out.println(" Game made by Veselin Slavchev in November 2013.\n"
				+ " Special thanks to Marto and Pavkata!\n\n");

		inputScanner.close();

		System.out.print("\n \t\tStatistics:"
				+ "\n Total gold received: " + player.getTotalgoldcoins()
				+ "\n Total number of enemies slain:" + player.getNumKills()
				+ "\n Total damage dealt: " + player.getTotaldmgdealt()
				+ "\n Total damage received: " + player.getTotalhplost());
	}
	
	public static void printTimeInfo(){
		
		if( timeofDay >= 0 && timeofDay <= 1 )
			System.out.print(" It is midnight.\n");
		else if( timeofDay >= 2 && timeofDay <= 6 )
			System.out.print(" The dark veil of night is shrouding your surroundings.\n");
		else if( timeofDay == 7 )
			System.out.print(" The dawn brings you hope and strength.\n");
		else if( timeofDay >= 8 && timeofDay <= 11 )
			System.out.print(" The morning sun warms the cold ground.\n");
		else if( timeofDay == 12 || timeofDay == 13 )
			System.out.print(" The sun is almost at its highest point, it must be midday.\n");
		else if( timeofDay >= 14 && timeofDay <= 18 )
			System.out.print(" The sun begins to cast longer and longer shadows.\n");
		else if( timeofDay == 19 )
			System.out.print(" The darkening sky welcomes the dusk.\n");
		else // [20-23]
			System.out.print(" The air is cold, but the ground is still warm in the evening.\n");
		
	}
	
	public static void printStory(){
		
		System.out.println();
		System.out.print("			You are the Defender!\n\n");
		System.out.print("		Game made by Veselin Slavchev\n		Special thanks to Marto and Pavkata\n\n");
		System.out.println("	\"These words are all that's left...");
		System.out.print(" And though we have never met, my only son, I hope you know\n"
				+ " that I would have been there to watch you grow,\n"
				+ " but my call was heard and I did go... now your\n"
				+ " mission lies ahead of you. As it did mine so long ago.\n\n");
		System.out.print("	To help the helpless ones, who all look up to you,\n"
				+ " and to defend them to the end.\n\n");
		System.out.print("	Ride like the wind, fight proud, my son...\n"
				+ " ...you are the Defender!\"\n\n");
		System.out.print("	You wake up in your bed, a storm is raging in the night\n"
				+ " outside. The skies continue to crackle, while you\n"
				+ " think about the strange dream. Was this really your\n"
				+ " father? He is said to have fallen in battle during\n"
				+ " the defence of you village, some even called him the\n"
				+ " last Defender.\n\n\n");
		
	}
	
}
