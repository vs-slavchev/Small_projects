package mainPackage;

import ExceptionsPackage.TileException;


/*
 * Class is used to store most of the text in the game.
 */
public class TextManager {

	public static void printInfoByTileId(int tileId)
			throws TileException {
		if (tileId < 1 || tileId > 100) {
			throw new TileException(
					"Text info for tile not present in TextManager. tileID= "
							+ tileId);
		}
		switch (tileId) {
		case 1:
			System.out.print(" You are in the plains.");
			break;
		case 2:
			System.out.print(" The steep rocky mountain wall does not allow you to pass trough,\n"
							+ " you are forced to go back to your previous location.\n");
			break;
		case 3:
			System.out.print(" You look at the calm ocean and go back to your previous location.\n");
			break;
		case 9:
			System.out.print(" You look at the shimmering waters of the dark lake\n"
							+ " and go back to your previous location.\n");
			break;
		case 10:
			System.out.print(" You are in the city of Shieldfall.\n"
					+ " It is a well protected old city known for\n"
					+ " its endurance against sieges. A fountain is\n"
					+ " to be seen in the center of the city square.\n"
					+ " Here you can visit an inn, trade at a shop,\n"
					+ " gamble in the tavern or just ask the townsfolk\n"
					+ " for quests and ways to help them.\n");
			break;
		case 11:
			System.out.print(" You are in the Darkmist village.\n"
					+ " Here you can visit an inn, trade at a shop,\n"
					+ " gamble in the tavern or just ask the people\n"
					+ " for quests and ways to help them.\n");
			break;
		case 12:
			System.out.print(" You are in the city of Morannon.\n"
					+ " A great hollow tree, standing tall for\n"
					+ " centuries, guarding the elven people.\n"
					+ " Here you can visit an inn, trade at a shop,\n"
					+ " gamble in the tavern or just ask the people\n"
					+ " for quests and ways to help them.\n");
			break;
		case 13:
			System.out.print(" You are in the Stormsteel shire.\n"
					+ " Here you can visit an inn, trade at a shop,\n"
					+ " gamble in the tavern or just ask the people\n"
					+ " for quests and ways to help them.\n");
			break;
		case 15:
			System.out.print(" To the west you can see the Great Cothowl Gate.\n"
							+ " The massive metal gates were closed and locked ages ago\n"
							+ " to prevent a devastating invasion.\n");
			break;
		case 16:
			System.out.print(" The Great Cothowl Gate is closed and locked. You\n"
							+ " can't pass trough and you return to your previuos location.\n"
							+ " There is a pass to the south.\n");
			break;
		case 17:
			System.out.print(" To the east you can see the Darkmist village huddled\n"
							+ " in the mountains. Smoke emerges from the little chimneys\n"
							+ " and crawls up the steep mountain.\n");
			break;
		case 18:
			System.out.print(" To the west the city of Shieldfall can be seen\n"
							+ " in the distance. Its stone walls still stand tall\n"
							+ " after many sieges.\n");
			break;
		case 19:
			System.out.print(" There is a cave entrance to the far south.\n");
			break;
		case 20:
			System.out.print(" You stand in front of the cave entrance to your\n"
							+ " south. There is a deathly stench in the air.\n");
			break;
		case 21:
			System.out.print(" The cave's walls are wet and water can be heard.\n"
							+ " Some bones and an old rusty sword are laying on the ground.\n"
							+ " The cave continues to the east.\n");
			break;
		case 23:
			System.out.print(" There is a path to the east.\n");
			break;
		case 24:
			System.out.print(" The path continues to the south.\n");
			break;
		case 25:
			System.out.print(" Some sort of light can be seen in the cave to the south.\n"
							+ " There are two mossy stone statues guarding the entrance: a horse\n"
							+ " and a wizard holding a staff. Around is very quiet.\n");
			break;
		case 29:
			System.out.print(" You stand before the Monastery of Muon. It was once\n"
							+ " a holy shrine and a stronghold of hope. Now cultists,\n"
							+ " necromancers and evil souls haunt its grey forsaken\n"
							+ " halls. The entrance is to the west.\n");
			break;
		case 28:
			System.out.print(" A grey silhouette of a building emerges to the west.\n");
			break;
		case 30:
			System.out.print(" A silhouette of a city or a fortress emerges to\n"
							+ " the west.\n");
			break;
		case 31:
			System.out.print(" There is a path to the west.\n");
			break;
		case 32:
			System.out.print(" A path leads to the north.\n");
			break;
		case 35:
			System.out.print(" You are in a valley.");
			break;
		default:
			// some tiles just don't have a description, but are still valid;
			// using this default case is expected and not an error
			break;
		}
	}

	public static void printTextByIndex(int index)
			throws TileException {

		switch (index) {
		case 1:
			System.out.print(" There are carefully placed torches around a path. As you\n"
							+ " approach silently, some chains clank and a cold wind blows.\n"
							+ " A deep voice is heard:\n\t\"Who do you think you are?\"\n"
							+ " A fire blaze lights up the end of the cave, a tall strong\n"
							+ " figure of a strange creature is standing next to some chests,\n"
							+ " overflowing with tresures. The beast has four legs. The lower body\n"
							+ " of a bull, but the torso of a man. The foe's hands hold\n"
							+ " a long heavy polearm, probably made out of pure adamantite.\n\n"
							+ " Suddenly he shouts violently and slams his weapon to the ground\n"
							+ " to intimidate you.\n");
			break;
		case 2:
			System.out.print(" The beast's corpse thumps on the wet ground and\n"
							+ " his giant polearm clanks off the little pebbles.\n\n");
			break;
		case 3:
			System.out.print(" You are in a small hall. Many adventurers have tried to\n"
							+ " solve the puzzle to open the marble doors and enter the next room.\n"
							+ " The only thing reminding of them are the sitting skeletons\n"
							+ " still waiting for the trap door to open and release them from their\n"
							+ " prison. Is the next room full of gold and gems? Are there more puzzles?\n"
							+ " You look at the marked stone plates on the floor. They remind you of the\n"
							+ " pattern on your necklace, given to you by your father. You solve the\n"
							+ " contraption by entering the same signs as indicated by your small iron\n"
							+ " chain. The marble doors open and grant you passage to the west.\n");
			break;
		case 4:
			System.out.print(" The mystical room is pitch black. There is\n"
					+ " no light source to illuminate it.\n");
			break;
		case 5:
			System.out.print(" The next room contains a single object. In the center\n"
							+ " of the spherical hall there is a crystal chalice. The walls of\n"
							+ " the otherwise dark room are coloured by magnificent moving spots\n"
							+ " of bright light. You step forward and grab the heavy artefact.\n"
							+ " Its colours shift violently as you feel its temperature change\n"
							+ " frequently. You leave the room as complete darkness engulfs it.\n\n"
							+ " Received item: Ezavor's Chalice.\n\n");
			break;
		case 6:
			System.out.print(" City Guard:\n"
							+ " 	- \"You really did it! I felt there was something special\n"
							+ " about you! As a reward the people of Shieldfall give\n"
							+ " you 70 gold coins and the Key to the Monastery of\n"
							+ " Muon!\"\n");
			break;
		case 7:
			System.out.print(" Welcome back, hero! How go your adventures?\n");
			break;
		case 8:
			System.out.print(" City Guard:\n"
							+ " 	- \"So you want the key to the main gates of the\n"
							+ " Monastery of Muon? You must prove yourself worthy!\n"
							+ " You can't just get the key and run off. So here is\n"
							+ " your quest: Nakdor the Plunderer is attacking small\n"
							+ " villages, travellers or just townsfolk around the city.\n"
							+ " He and his bandit clan are a treath to us and he must be\n"
							+ " stopped! Now you know what to do and I will tell you where\n"
							+ " to go. To the south-southeast there is a cave. That's all\n"
							+ " we know.\"\n");
			break;
		case 9:
			System.out.print(" Village High Priest:\n"
							+ " As you walk towards the priest with the glowing\n"
							+ " chalice in your hands the clouds above the houses\n"
							+ " begin to vanish. Once again bird songs fill the hearts\n"
							+ " of the people with hope. A crowd gathers. As you hand\n"
							+ " the artefact over to the priest he blesses you and\n"
							+ " begins to speak of your noble adventure. All of the\n"
							+ " villagers will know and remember who saved their\n"
							+ " home and gave them a bright future.\n"
							+ " 	- \"I give you the Crystalforged Medallion.\n"
							+ " It is said, that whoever owns it, has the ability\n"
							+ " to block tremendous strikes. May it serve you well.\"\n");
			break;
		case 10:
			System.out.print(" Our people will never forget you great heroic\n"
					+ " deed! How may we be of any help?\n");
			break;
		case 11:
			System.out.print("  Village cleric:\n"
							+ " 	- \"Our village was once prospering. People would\n"
							+ " come to train in the ancient arts of war, others would\n"
							+ " visit the once famous market, full of artefacts and other\n"
							+ " rare items. There were also some that came to pray at our\n"
							+ " holy shrine - one of the few in all the land. But time\n"
							+ " changes everything, doesn't it? The land shifted and the\n"
							+ " marshes appeared. Noone wanted to travel to here and\n"
							+ " the isolation engulfed us. Even the air that we breathe\n"
							+ " changed. Most of us are sick and we never get better.\n"
							+ " \tThe runes on the old now forgotten shrine\n"
							+ " mention a mithical chalice, locked away in a maze,\n"
							+ " to be used in the name of good when the time is right.\n"
							+ " Our priest sometimes tries to send brave souls or\n"
							+ " foolish mercenaries to get the chalice but none succeed.\n"
							+ " I suppose you can also try. The entrance is to the south.\n"
							+ " You will recognize it by the old statues.\"\n");
			break;
		default:
			throw new TileException(
					"Text info by index not present in TextManager. index= "
							+ index);
		}
	}

}
