package mainPackage;
import creaturePackage.Player;

public class Defender {

	public static void main(String[] args) {
		GameUtil.printStory();
		try {
			(new Player()).gameLoop();
		} catch (Exception e) {
			System.out.println(e.getMessage());
		}
	}
}

/*
 *  TODO:
 * 	path from Darkmist to the monastery
 * 	the monastery of muon
 *  final boss
 *
 */