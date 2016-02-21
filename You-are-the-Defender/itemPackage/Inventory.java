package itemPackage;

import java.util.Stack;
import java.util.TreeSet;

import ExceptionsPackage.InvalidGameInputException;
import creaturePackage.Player;
import mainPackage.GameUtil;

public class Inventory {
	
	private static int goldcoins, totalgoldcoins, potions;
	private static EquipItem weapon, armor, amulet;
	private static TreeSet<String> mainInventory = new TreeSet<>();
	private static Stack<JunkItem> junkInventory = new Stack<>();
	
	public static void initInventory() throws InvalidGameInputException{
		potions = 3;
		totalgoldcoins = goldcoins = 8;
		
		weapon = EquipItemFactory.createEquipItem(GameUtil.getrandom(1, 5));
		armor = EquipItemFactory.createEquipItem(GameUtil.getrandom(16, 20));
		amulet = EquipItemFactory.createEquipItem(31);

		mainInventory.add("Old map");
	}
	
	public static void printInventory() {

		System.out.println(" \tItems in your backpack:");
		System.out.println(" " + goldcoins + " gold coins");

		if (potions > 0) {
			if (potions == 1)
				System.out.printf(" %d Healing Potion ( [1] to drink )%n",
						potions);
			else
				System.out.printf(" %d Healing Potions ( [1] to drink )%n",
						potions);
		}

		for (String mainInventoryitem : mainInventory) { // list all mainInventory slots, if not
											// empty
			if (!mainInventoryitem.equals("empty"))
				System.out.println(" " + mainInventoryitem);
		}

		for (JunkItem jitem : junkInventory) { // list all junkInventory slots,
												// if not empty
			if (jitem != null)
				System.out.println(" " + jitem.getName());
		}

		System.out.println("\n\tEquipped items:\n" +
			" Weapon: " + weapon.getName() +
			"\n Armor: " + armor.getName() +
			"\n Amulet: " + amulet.getName() +
			"\n [2] close backpack");

		GameUtil.validateInput(1, 2);

		switch (GameUtil.getInput()) {
		case 1:
			Player.drinkPotion();
			break;
		default:
			break;
		}
	}

	public static void visitMerchant(final int cityId) throws InvalidGameInputException { // cityId [0-2]

		System.out.print(" The well-dressed bearded merchant greets you:\n"
				+ " 	-\"Good day, young man! I offer the best\n"
				+ " weapons and armor in town! I also have some\n"
				+ " potions. I will buy any old equipment that you\n"
				+ " cannot carry on your journey, if it is in good\n"
				+ " shape of course. Ha-ha!\"");
		System.out.print("\n\n Available gold coins: " + goldcoins
				+ "\n Your armor worth in gold: " + armor.getValue()
				+ "\n Your weapon worth in gold: " + weapon.getValue()
				+ "\n\n [1] Buy a potion for 5 gold coins.\n");

		/*
		 * each city merchant sells only 2 types of weapons and armor; 1st city
		 * sells first 2 buyable weapons and armor. 2nd city sells 2nd and 3rd
		 * buyable weapons and armor. 3rd (last) city sells 3rd and 4th buyable
		 * weapons and armor.
		 */
		for (int i = 0; i < 2; i++) {
			EquipItem tempItem = EquipItemFactory.createEquipItem(EquipItem.getWeaponIdOffset() + cityId + i);
			System.out.print(" [" + (2 + i)	+ "] Buy a "
					+ tempItem.getName() + " for "
					+ tempItem.getValue() + " gold coins.\n");
		}
		for (int i = 0; i < 2; i++) {
			EquipItem tempItem2 = EquipItemFactory.createEquipItem(EquipItem.getArmorIdOffset() + cityId + i);
			System.out.print(" [" + (4 + i)	+ "] Buy a "
					+ tempItem2.getName() + " for "
					+ tempItem2.getValue() + " gold coins.\n");
		}
		System.out.print(" [6] Sell all useless items for " + calcJunkValue()
				+ " gold coins.\n" + " [7] Leave shop.");

		GameUtil.validateInput(1, 11);

		String noGold = " You do not have enough gold coins!"; // prepare string

		if (GameUtil.getInput() == 1) { // buy potion for 5 gold

			if (goldcoins >= 5) {
				potions++;
				goldcoins -= 5;
				System.out.println(" Potion bought for 5 gold coins!");
			}else {
				System.out.println(noGold);
			}

		} else if (GameUtil.getInput() == 6) { // sell junk

			if (calcJunkValue() <= 0) {
				System.out.println(" You don't have any useless items of value to sell.");
			}
			receiveGold(calcJunkValue()); // receive gold coins
			System.out.println(" Items sold for " + calcJunkValue()
					+ " gold coins.");
			while (junkInventory.size() > 0) // remove junk items
			{
				junkInventory.pop();
			}

		}
		if (GameUtil.getInput() == 7) { // exit

			System.out.println(" You exit the shop without buying anything.");

		} else if (GameUtil.getInput() == 2 || GameUtil.getInput() == 3) { // buy
																			// weapon

			EquipItem merchantWeapon = EquipItemFactory.createEquipItem(GameUtil.getInput()
					+ EquipItem.getWeaponIdOffset() + cityId);
			if (goldcoins + weapon.getValue() >= merchantWeapon.getValue()) {
				goldcoins -= (merchantWeapon.getValue() - weapon.getValue());
				weapon = merchantWeapon;
				System.out.println(" You bought " + weapon.getName() + " for "
						+ weapon.getValue() + " gold coins!");
			} else {
				System.out.println(noGold);
				System.out.printf("%d", getTotalgoldcoins());
			}

		} else if (GameUtil.getInput() == 4 || GameUtil.getInput() == 5) { // buy
																			// armor

			EquipItem merchantArmor = EquipItemFactory.createEquipItem(GameUtil.getInput()
					+ EquipItem.getArmorIdOffset() + cityId);
			if (goldcoins + armor.getValue() >= merchantArmor.getValue()) {
				goldcoins -= merchantArmor.getValue() - armor.getValue();
				armor = merchantArmor;
				System.out.println(" You bought " + armor.getName() + " for "
						+ armor.getValue() + " gold coins!");
			} else
				System.out.println(noGold);
		}
	}
	
	public static void receiveLoot(final int id) {
		int randomNum = id / 2 + GameUtil.getrandom(0, 10);
		receiveGold(randomNum);
		System.out.println(" You loot " + randomNum + " gold coins.");
		randomNum = GameUtil.getrandom(0, 8);
		if (randomNum == 0) {
			potions++;
			System.out.println(" You loot a potion.");
		}

		randomNum = GameUtil.getrandom(0, 30);
		receiveItems(randomNum);
	}
	
	private static void receiveItems(final int num) {
		if (junkInventory.size() >= 10) {
			System.out.println(" You dont have free space in your backpack!\n");
			return;
		}

		junkInventory.push(new JunkItem(num));
		System.out.println(" You loot: " + junkInventory.peek().getName() + ".\n");
	}

	public static void receiveGold(final int receivedgold) {
		goldcoins += receivedgold;
		totalgoldcoins += receivedgold;
	}
	
	private static int calcJunkValue() {
		
		int result = 0;
		for (JunkItem jitem : junkInventory) {
			if (jitem != null)
				result += jitem.getValue();
		}
		return result;
	}

	public static int getGoldcoins() {
		return goldcoins;
	}
	
	public static void addToGoldcoins(int addGc){
		goldcoins += addGc;
	}

	public static int getTotalgoldcoins() {
		return totalgoldcoins;
	}

	public static int getPotions() {
		return potions;
	}
	
	public static void addToPotions(int addPotions){
		potions += addPotions;
	}

	public static EquipItem getWeapon() {
		return weapon;
	}

	public static EquipItem getArmor() {
		return armor;
	}

	public static EquipItem getAmulet() {
		return amulet;
	}
	
	public static void setAmulet(EquipItem newAmulet) {
		amulet = newAmulet;
	}

	public static TreeSet<String> getMainInventory() {
		return mainInventory;
	}

	public Stack<JunkItem> getJunkInventory() {
		return junkInventory;
	}
	

}
