package creaturePackage;

import itemPackage.EquipItemFactory;
import itemPackage.Inventory;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.concurrent.ForkJoinTask;

import ExceptionsPackage.InvalidGameInputException;
import ExceptionsPackage.TileException;
import mainPackage.GameMap;
import mainPackage.GameUtil;
import mainPackage.TextManager;

public class Player {

	private int x, y, prevx, prevy;
	private static int health, basemaxhealth, maxhealth;
	private int numKills, damage, basedamage;
	private int totaldmgdealt, totalhplost;
	private int praycd;
	private ArrayList<Buff> buffs = new ArrayList<>();
	private static int randomNum;

	public Player() {

		try {
			Inventory.initInventory();
		} catch (InvalidGameInputException e) {
			System.out.println(e.getMessage());
		}
		GameMap.initGameMap();

		this.prevx = this.x = 13;
		this.prevy = this.y = 11;

		// statistics trackers set to 0
		this.numKills = this.totaldmgdealt = this.totalhplost = 0;
		this.praycd = 0;
		basemaxhealth = GameUtil.getrandom(130, 150);
		calculateMaxhealth();
		health = maxhealth;
		this.basedamage = 18 + GameUtil.getrandom(0, 2);
	}

	private void travel(final int input) throws InvalidGameInputException {

		GameUtil.advanceinTime();
		this.prevy = this.y;
		this.prevx = this.x;
		switch (input) {
		case 1:
			this.x--;
			break;
		case 2:
			this.y--;
			break;
		case 3:
			this.x++;
			break;
		case 4:
			this.y++;
			break;
		default:
			throw new InvalidGameInputException(
					"Travel input not in range [1,4].");
		}
	}

	private void goToPrevCoords() {
		this.x = this.prevx;
		this.y = this.prevy;
	}

	private void combat(final int giveid) {

		Enemy enemyObj = new Enemy(giveid);

		if (giveid > 25) {
			doTurnBasedCombat(enemyObj);
			return;
		}

		if (giveid >= 9 && giveid <= 12) { // cultists int he monastery of muon;
											// different description text

			System.out
					.print(" You walk quietly under the tall ceiling of the monastery\n"
							+ " as you are seen by a"
							+ enemyObj.getName()
							+ ".\n");

			// 1v1
			if (doTurnBasedCombat(enemyObj)) {
				System.out.print(" The cult has one less follower now.\n\n");
				Inventory.receiveLoot(giveid);
				this.numKills++;
			}
		}
		int scenario = GameUtil.getrandom(1, 5);

		switch (scenario) {

		case 1:
			System.out.print(" You encounter a" + enemyObj.getName() + "!\n");

			if (doTurnBasedCombat(enemyObj)) {
				System.out
						.print(" You easily finish the wounded enemy off.\n\n");
				Inventory.receiveLoot(giveid);
				this.numKills++;
			}
			break;
		case 2:
			System.out.print(" You are ambushed by a" + enemyObj.getName()
					+ "!\n");
			System.out.print(" The" + enemyObj.getName() + "'s"
					+ enemyObj.getWeapon() + " hits\n"
					+ " you and you begin to bleed. You loose "
					+ enemyObj.getDamage() + " health.\n");
			takeDamage(enemyObj.getDamage());
			if (health <= 0)
				break;

			if (doTurnBasedCombat(enemyObj)) {
				System.out.print(" You relentlessly kill your opponent!\n\n");
				Inventory.receiveLoot(giveid);
				this.numKills++;
			}
			break;
		case 3:
			System.out
					.print(" You come across a group of"
							+ enemyObj.getName()
							+ "s!\n"
							+ " You try to keep your distance as you are outnumbered, but they\n"
							+ " sence your presence and quickly decide to look for you. You manage\n");

			String[] randomEscape = {
					" to hide behind a rock and live another day.\n\n",
					" to climb a tree and survive.\n\n",
					" to hide in the tall grass nearby.\n\n",
					" to blend in the dark shadows and remain undetected.\n\n",
					" to throw a small rock to distract and misdirect them.\n\n" };
			// stores the index of the random outcome/message
			int randomEscapeIndex = GameUtil.getrandom(0,
					randomEscape.length - 1);
			System.out.print(randomEscape[randomEscapeIndex]);
			break;
		case 4:
			System.out
					.print(" You find marks on the soil and sence a strange odour.\n"
							+ " The curiosity leads you to an abandoned but still warm campfire.\n"
							+ " Suddenly a wooden branch cracks! You are quickly tied\n"
							+ " in a net and suspended in mid-air! Two"
							+ enemyObj.getName()
							+ "s\n"
							+ " show up and look at thier prey. The ropes fail to sustain your\n"
							+ " weight and you fall on one of the"
							+ enemyObj.getName() + "s.\n");

			// 1v1
			if (doTurnBasedCombat(enemyObj)) {
				System.out.print(" You emerge as the victor!\n\n");
				Inventory.receiveLoot(giveid);
				this.numKills += 2;
			}
			break;
		default:
			System.out
					.print(" You spot a laying body in the distance and carefully\n"
							+ " approach it. It is the corpse of a"
							+ enemyObj.getName()
							+ "!\n"
							+ " As you kick it to make sure it's dead nothing happens.\n"
							+ " Suddenly a"
							+ enemyObj.getWeapon()
							+ " hits you and you are\n"
							+ " wounded for "
							+ enemyObj.getDamage() + " damage.");

			// 1v1, enemy is almost dead
			enemyObj.takeDmg(20); // weakest enemy has 23hp
			takeDamage(enemyObj.getDamage());
			if (health <= 0)
				break;

			if (doTurnBasedCombat(enemyObj)) {
				System.out.print(" Full of rage, you demolish the"
						+ enemyObj.getName() + "'s\n" + enemyObj.getArmor()
						+ " and deliver the finishing blow!\n\n");
				Inventory.receiveLoot(giveid);
				this.numKills++;
			}
			break;
		}

	}

	private boolean doTurnBasedCombat(Enemy enemyObj) {

		String choiseStance = " Choose the way you wish to combat in this situation:\n"
				+ " [1] Agressive\n" + " [2] Defensive\n" + " [3] Balanced\n";

		if (enemyObj.getid() <= 25) { // normal enemy; escape is allowed

			System.out.print(choiseStance);
			System.out.print(" [4] Try to escape/avoid fighting\n");

			GameUtil.validateInput(1, 4);

		} else { // enemy is boss; escape not an option

			System.out.print(choiseStance);
			GameUtil.validateInput(1, 3);

		}
		System.out.println(" Combat log: ");

		int outcome;

		while (health > 0 && enemyObj.getHealth() > 0) {

			outcome = GameUtil.getrandom(0, 100);

			int situation = GameUtil.getInput();

			// set to balanced stance; in case of failure to escape
			int playerHitPercentInterval = 25;
			int playerMissPercentInterval = playerHitPercentInterval + 25;
			int enemyHitPercentInterval = playerMissPercentInterval + 25;

			switch (situation) {
			case 1:
				playerHitPercentInterval = 40;
				playerMissPercentInterval = playerHitPercentInterval + 10;
				enemyHitPercentInterval = playerMissPercentInterval + 40;
				break;
			case 2:
				playerHitPercentInterval = 10;
				playerMissPercentInterval = playerHitPercentInterval + 40;
				enemyHitPercentInterval = playerMissPercentInterval + 10;
				break;
			case 3:
				// already set to balanced; do nothing
				break;
			default:
				if (outcome < 50) {
					System.out.print(" You managed to escape! ");
					return false;
				}
				System.out.print(" You failed to escape! ");
				situation = 3; // switch to balanced, if failed to escape
				break;
			}

			if (outcome < playerHitPercentInterval) {
				System.out.println(" You hit the" + enemyObj.getName()
						+ " for " + this.damage + " damage!");
				attackEnemy(enemyObj);
			} else if (outcome < playerMissPercentInterval) {
				System.out
						.println(" You missed the" + enemyObj.getName() + "!");
			} else if (outcome < enemyHitPercentInterval) {
				System.out.println(" The" + enemyObj.getName()
						+ " managed to hit you for " + enemyObj.getDamage()
						+ " damage !");
				takeDamage(enemyObj.getDamage());
			} else {
				System.out
						.println(" The" + enemyObj.getName() + " missed you!");
			}

			if (health < 20) { // automatically drink potion if on low health
				drinkPotion();
			}

		}
		if (health > 0) {
			return true;
		}
		return false;
	}

	private void takeDamage(final int takeDmg) {
		health -= takeDmg;
		this.totalhplost += takeDmg;
	}

	private void attackEnemy(Enemy enemyObj) {
		enemyObj.takeDmg(this.damage);
		this.totaldmgdealt += this.damage;
	}

	@SuppressWarnings("static-method")
	private void visitInn() {

		if (Inventory.getGoldcoins() >= 4) {
			System.out
					.print(" Innkeeper:\n"
							+ " 	- \"Welcome! Let me show you your room. By resting you regain\n"
							+ " your full health and strength.\"\n");
			Inventory.addToGoldcoins(-4);
			health = maxhealth;
			GameUtil.advanceEightHoursSleep(); // sleep for 8 hours

		} else {
			System.out
					.print(" Innkeeper:\n"
							+ " 	- \"Welcome! What? You don't seem to have enough gold coins\n"
							+ " to rest at our inn. I am sorry, but we require 4 gold coins.\n"
							+ " Come again when you can afford it.\"\n");
		}
	}

	private void visitTavern() {

		System.out.print(" Bartender:\n"
				+ " 	- \"You have come to do some gambling, eh? The fellow\n"
				+ " at the left corner table has the dice ready. Good luck!\n"
				+ " Make sure you try some of my fine drinks!\"\n");

		System.out.print(" [1] Approach gambler.\n" + " [2] Order a drink.\n"
				+ " [3] Leave tavern.\n");

		GameUtil.validateInput(1, 3);

		int inputTavern = GameUtil.getInput();

		if (inputTavern == 3)
			return; // leave

		if (inputTavern == 2) {
			System.out.print("\n Choose a drink:\n"
					+ " [1] Stout - costs 3 gold.\n"
					+ " [2] Ironwood ale - costs 6 gold.\n"
					+ " [3] Shieldfall mead - costs 9 gold.\n"
					+ " [4] Dauthi brew - costs 12 gold.\n");

			GameUtil.validateInput(1, 4);

			if (Inventory.getGoldcoins() < inputTavern * 3) { // each brew costs
																// 3 times its
				// input code
				System.out.println(" You do not have enough gold coins!");
				//System.out.printf("%d", getTotalgoldcoins());
				return;
			}

			Inventory.addToGoldcoins(inputTavern * 3);

			this.buffs.add(new Buff(inputTavern)); // input is the id of the
													// buff
													// in the buff constructor
			printBuffs();
		} else {

			do {
				System.out.println(" Old gambler:\n"
						+ " 	- \"Arrgh, how many coins ye wish to wager?\"\n"
						+ " Current gold: " + Inventory.getGoldcoins());

				GameUtil.validateInput(0, Inventory.getGoldcoins());
				int yRoll; // your
				int oRoll; // opponent's

				do {
					yRoll = GameUtil.getrandom(1, 6);
					oRoll = GameUtil.getrandom(1, 6);
					System.out.println(" You roll " + yRoll);
					System.out.println(" Opponent rolls " + oRoll);
					if (yRoll == oRoll)
						System.out
								.println(" Nobody is the winner, you both roll again.");
				} while (yRoll == oRoll);

				if (yRoll > oRoll) {
					Inventory.receiveGold(GameUtil.getInput());
					System.out.println(" You won " + GameUtil.getInput()
							+ " gold coins! You now have: "
							+ Inventory.getGoldcoins() + " gold.");
				} else if (yRoll < oRoll) {
					Inventory.addToGoldcoins(-GameUtil.getInput());
					System.out.println(" You just lost " + GameUtil.getInput()
							+ " gold coins! Current gold: "
							+ Inventory.getGoldcoins());
				}

				System.out.print(" [1] Play again.\n" + " [2] Leave tavern.");

				GameUtil.listenForInput();
			} while (GameUtil.getInput() == 1); 
			/*
			 * input is not very valid, but player wants to gamble some more;
			 * not checked if not [2]
			 */
		}
	}

	private void talk(final int input) throws InvalidGameInputException, TileException {
		GameUtil.advanceinTime();

		if (GameMap.getTile(this.x, this.y) < 10
				&& GameMap.getTile(this.x, this.y) > 12) {
			System.out.println(" You are not in a city or a village.");
			return;
		}

		switch (input) {
		case 1:
			//cityId is 0-2; there are 3 cities
			Inventory.visitMerchant(GameMap.getTile(this.x, this.y) - 10);
			break;
		case 2:
			visitInn();
			break;
		case 3:
			visitTavern();
			break;
		case 4:
			findQuest();
			break;
		default:
			throw new InvalidGameInputException(
					"Talk to people input not in range [1,4].");
		}
	}

	public static void drinkPotion() {

		GameUtil.advanceinTime();

		if (Inventory.getPotions() > 0) {
			randomNum = GameUtil.getrandom(10, 30);// 10-30
			if (maxhealth - health < randomNum) { // preventing hp overflow,
													// checked elsewhere too
				randomNum = maxhealth - health;
			}
			Inventory.addToPotions(-1);
			health += randomNum;

			System.out.printf(
					" Potion healed you for %d. Current health: %d / %d%n",
					randomNum, health, maxhealth);
		} else {
			System.out.println(" You have no potions to drink.");
		}
	}

	private void printBuffs() {

		if (this.buffs.size() <= 0) {
			return;
		}

		System.out.println(" Your current status effects:");
		for (Buff buff : this.buffs) {
			System.out.println(buff.getFormatedDescr());
		}
	}

	public void gameLoop() throws InvalidGameInputException, TileException {

		while (health > 0) { // game loop && game is not finished

			printInfo();
			if (health <= 0)
				break;

			System.out
					.print(" Choose an action:\n [1] Travel\n [2] Talk to people\n [3] Inventory\n [4] Pray.\n");
			GameUtil.validateInput(1, 4);

			switch (GameUtil.getInput()) {
			case 1: // travel
				System.out
						.print("\n Travel:\n [1] West\n [2] South\n [3] East\n [4] North\n");
				GameUtil.validateInput(1, 4);

				travel(GameUtil.getInput());
				break;
			case 2: // talk to people
				if (!isInCity()) { // checks weather we are in a city and can
									// actually talk to people
					System.out.println(" You are currently not in a city and there are no people around!");
					break;
				}
				System.out.print(" Talk to people:\n [1] A merchant\n [2] Rest at an inn for 4 gold coins\n [3] Enter the tavern\n [4] Quests (accept/return)\n");
				GameUtil.validateInput(1, 4);
				talk(GameUtil.getInput());
				break;
			case 3: // inventory
				Inventory.printInventory();
				break;
			default:
				pray();
				break;
			} // close switch
		}

		// TODO add break for the while loop for successfully finishing the game

		GameUtil.endGame(this);
	}

	private void pray() {

		if (this.praycd > 0) {
			System.out
					.println(" You prayed too recently. You will be able to pray again later.");
			return;
		}

		this.praycd = 24; // set pray on cd
		int outcome = GameUtil.getrandom(0, 5);
		int amount = 0; // amount of the effect of the gods' answer

		switch (outcome) {
		case 1: // get healed
			amount = GameUtil.getrandom(10, 40);
			System.out.println(" The godess of life heals you for " + amount
					+ " points!");
			health += amount;
			if (health > maxhealth)
				health = maxhealth;
			break;
		case 2: // get buffed
			System.out.println(" The god of war blessed your "
					+ Inventory.getWeapon().getName() + " for 15 hours!");
			this.buffs.add(new Buff(5));
			break;
		case 3: // get buffed
			System.out
					.println(" The godess of sleep granted you 30 additional maximum health for 20 hours!");
			this.buffs.add(new Buff(6));
			break;
		case 4: // get smitten
			amount = GameUtil.getrandom(10, 40);
			System.out.println(" The god of death decided to smite you for "
					+ amount + " damage!");
			health -= amount;
			this.totalhplost += amount;
			break;
		case 5: // get cursed
			System.out.println(" The godess of peace cursed your "
					+ Inventory.getWeapon().getName() + " for 10 hours!");
			this.buffs.add(new Buff(7));
			break;
		case 6: // get cursed
			System.out.println(" The god of fear made you feeble and decreased your maximum health by 30 for 15 hours!");
			this.buffs.add(new Buff(8));
			break;
		default: // ignore
			System.out.println(" The gods ignored your prayer.");
			break;
		}

		if (health > maxhealth) {
			health = maxhealth;
		}

		for (int i = 0; i < this.buffs.size(); i++) {
			if (this.buffs.get(i).getDurationRemaining() < 1) {
				this.buffs.remove(i);
			}
		}

		printBuffs();
	}

	private void updateStats() {

		if (this.praycd > 0) { // tick the praycd if on cooldown (CD)
			this.praycd--;
		}

		calculateDamage();
		calculateMaxhealth();
	}

	private void calculateDamage() {
		int buffBonus = 0;
		for ( Buff buff : buffs){
			buffBonus += buff.getBonusdamage();
		}
			
		// updating the class variable damage
		this.damage = this.basedamage
				+ buffBonus
				+ Inventory.getWeapon().getDamage()
				+ Inventory.getArmor().getDamage()
				+ Inventory.getAmulet().getDamage();
	}

	@SuppressWarnings("static-method")
	private void calculateMaxhealth() {
		int buffBonus = 0;
		for ( Buff buff : buffs){
			buffBonus += buff.getBonushealth();
		}
		// updating the class variable maxhealth
		maxhealth = basemaxhealth 
				+ buffBonus
				+ Inventory.getWeapon().getHealth()
				+ Inventory.getArmor().getHealth()
				+ Inventory.getAmulet().getHealth();
	}

	public int getHealth() {
		return health;
	}

	public int getNumKills() {
		return this.numKills;
	}

	public int getTotalgoldcoins() {
		return Inventory.getTotalgoldcoins();
	}

	public int getTotaldmgdealt() {
		return this.totaldmgdealt;
	}

	public int getTotalhplost() {
		return this.totalhplost;
	}

	private boolean isInCity() { // coords of all the cities
		if ((this.x == 11 && this.y == 10) || (this.x == 13 && this.y == 4)
				|| (this.x == 4 && this.y == 5)
				|| (this.x == 4 && this.y == 11)) {
			return true;
		}
		return false;
	}

	private void printInfo() throws TileException {

		updateStats();

		// Debugging help
		// System.out.printf(" DEBUG coord [ %d ]:[ %d ]; totalhplost: %d; dmgdealt: %d; numKills: %d%n",
		// x, y, totalhplost, totaldmgdealt, numKills);

		System.out.printf(" Your current health is: %d / %d.%n", health,
				maxhealth);
		GameUtil.printTimeInfo();

		int tileId = GameMap.getTile(this.x, this.y);
		TextManager.printInfoByTileId(tileId);

		switch (tileId) {
		case 2: // mountain is inaccessible, go to prev coords and PrintInfo
				// again for new coords
			goToPrevCoords();
			printInfo();
			break;
		case 3: // ocean
			goToPrevCoords();
			printInfo();
			break;
		case 4:
			// all monsters
			combat(GameUtil.getrandom(1, 25)); // combat has empty descr string
			break;
		case 5:
			// 1-7 E1
			combat(GameUtil.getrandom(1, 7));
			break;
		case 6:
			// 4-9 E2
			combat(GameUtil.getrandom(4, 9));
			break;
		case 7:
			// 9-12 E3 - cultists
			combat(GameUtil.getrandom(9, 12));
			break;
		case 8:
			// 13-16 E4
			combat(GameUtil.getrandom(13, 16));
			break;
		case 33:
			// 17-20 E5
			combat(GameUtil.getrandom(17, 20));
			break;
		case 34:
			// 20-26 E6
			combat(GameUtil.getrandom(20, 26));
			break;
		case 9:
			goToPrevCoords();
			printInfo();
			break;
		case 14:
			System.out
					.print(" You are standing next to your hut. You have prepared\n"
							+ " everything you will need for the journey. A map and some potions\n"
							+ " are contained in your backpack. With your trusty\n"
							+ " "
							+ Inventory.getWeapon().getName()
							+ " in hands and your "
							+ Inventory.getArmor().getName()
							+ "\n you await to shake the hand of fate like the dusk\n"
							+ " awaiting dawn.\n\n");
			break;
		case 16:
			goToPrevCoords();
			printInfo();
			break;
		case 22:
			if (Inventory.getMainInventory().contains("Nakdor's Hoof")
					|| Inventory.getMainInventory().contains(
							"Key to the Monastery of Muon")) {
				System.out.print(" The corpse of the magnutaur is laying on\n"
						+ " the cold ground.\n");
			} else {
				TextManager.printTextByIndex(1);

				combat(26);
				if (health <= 0) {
					break;
				}
				TextManager.printTextByIndex(2);

				System.out.print(" You receive item: Nakdor's Hoof.\n\n");
				Inventory.getMainInventory().add("Nakdor's Hoof");
				this.numKills++;
			}
			break;
		case 26:
			if (Inventory.getMainInventory().contains("Ezavor's Chalice")
					|| Inventory.getMainInventory().contains(
							"The Crystalforged Medallion")) {
				System.out
						.print(" The marvelous puzzle room is dim and quiet.\n");
			} else
				TextManager.printTextByIndex(3);
			break;
		case 27:
			if (Inventory.getMainInventory().contains("Ezavor's Chalice")) {
				TextManager.printTextByIndex(4);
			} else
				TextManager.printTextByIndex(5);
			Inventory.getMainInventory().add("Ezavor's Chalice");
			break;
		default:
			// some tiles dont have text
			// default case is blank on purpose
			break;
		}
	}

	private void findQuest() throws InvalidGameInputException, TileException {

		switch (GameMap.getTile(this.x, this.y)) {

		case 10:
			if (Inventory.getMainInventory().contains("Nakdor's Hoof")) {
				TextManager.printTextByIndex(6);
				Inventory.receiveGold(70);
				Inventory.getMainInventory().remove(1);
				Inventory.getMainInventory()
						.add("Key to the Monastery of Muon");
			} else if (Inventory.getMainInventory().contains(
					"Key to the Monastery of Muon")) {
				TextManager.printTextByIndex(7);
			} else
				TextManager.printTextByIndex(8);
			break;
		case 11:
			if (Inventory.getMainInventory().contains("Ezavor's Chalice")) {
				TextManager.printTextByIndex(9);
				Inventory.setAmulet(EquipItemFactory.createEquipItem(32));

			} else if (Inventory.getAmulet().getName()
					.equals("The Crystalforged Medallion")) {
				TextManager.printTextByIndex(10);
			} else {
				TextManager.printTextByIndex(11);
			}
			break;
		case 12:
			break;
		default:
			throw new InvalidGameInputException("Quest not found! x= " + this.x
					+ "; y= " + this.y + "; tileID= "
					+ GameMap.getTile(this.x, this.y));
		}

	}

}
