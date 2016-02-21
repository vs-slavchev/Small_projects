package itemPackage;

import ExceptionsPackage.InvalidGameInputException;


public class EquipItemFactory {
	
	public static EquipItem createEquipItem(int id) throws InvalidGameInputException{

			switch (id) {

			// weapons 1-15
			case 1:
				return new EquipItem(id, "old greatsword", 1, 0, 5);
			case 2:
				return new EquipItem(id, "iron claymore", 1, 0, 5);
			case 3:
				return new EquipItem(id, "steel waraxe", 1, 0, 5);
			case 4:
				return new EquipItem(id, "bronze broadsword", 1, 0, 5);
			case 5:
				return new EquipItem(id, "bloody axe", 1, 0, 5);
			case 6:
				return new EquipItem(id, "polished broadsword", 8, 0, 15);
			case 7:
				return new EquipItem(id, "cristaline rapier", 17, 0, 28);
			case 8:
				return new EquipItem(id, "stormsteel broadaxe", 28, 0, 75);
			case 9:
				return new EquipItem(id, "mithril greathammer", 45, 0, 135);
			case 10:
				return new EquipItem(id, "lightwielder edge", 50, 10, 85);
			case 11:
				return new EquipItem(id, "deathwielder blade", 65, 0, 20);
			case 12:
				return new EquipItem(id, "butcher", 75, 5, 55);
			case 13:
				return new EquipItem(id, "soulblade", 80, 15, 250);
			case 14:
				return new EquipItem(id, "smasher", 88, 0, 115);
			case 15:
				return new EquipItem(id, "bludgeon", 95, 0, 130);

			// armor 16-30
			case 16:
				return new EquipItem(id, "linked mail", 0, 2, 8);
			case 17:
				return new EquipItem(id, "copper armor", 0, 2, 8);
			case 18:
				return new EquipItem(id, "iron chestguard", 0, 2, 8);
			case 19:
				return new EquipItem(id, "tin chestplate", 0, 2, 8);
			case 20:
				return new EquipItem(id, "bronze platemail", 0, 2, 8);
			case 21:
				return new EquipItem(id, "reinforced chestplate", 0, 15, 15);
			case 22:
				return new EquipItem(id, "dragonscale chestpiece", 0, 45, 28);
			case 23:
				return new EquipItem(id, "runed thorium battleplate", 0, 95, 75);
			case 24:
				return new EquipItem(id, "lightforged cuirass", 0, 153, 135);
			case 25:
				return new EquipItem(id, "carapace", 10, 120, 140);
			case 26:
				return new EquipItem(id, "frozenscale hauberk", 5, 130, 125);
			case 27:
				return new EquipItem(id, "darkruned razorplate", 12, 95, 150);
			case 28:
				return new EquipItem(id, "folorn wardenplate", 0, 165, 140);
			case 29:
				return new EquipItem(id, "dragon ribcage", 5, 175, 135);
			case 30:
				return new EquipItem(id, "redemption regalia", 0, 158, 162);

			// other items 30-35
			case 31:
				return new EquipItem(id, "Small iron chain", 0, 0, 10);
			case 32:
				return new EquipItem(id, "Crystalforged Medallion", 0, 30, 25);
			case 33:
				return new EquipItem(id, "pendant", 0, 45, 35);
			case 34:
				return new EquipItem(id, "choker", 10, 62, 140);
			case 35:
				return new EquipItem(id, "locket", 0, 85, 188);

			default:
				throw new InvalidGameInputException("Failure creating equip-item: id= " + id);
			}				
	}
	

}
