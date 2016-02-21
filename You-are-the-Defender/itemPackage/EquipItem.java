package itemPackage;


public class EquipItem extends JunkItem {
	
	private int damagebonus, healthbonus;
	private static final int weaponIdOffset = 4; // 2nd merchant option + 4 offset = 6 Id for 1st buyable weapon
	private static final int armorIdOffset = 17; // 4th merchant option + 17 offset = 21 Id for 1sr buyable armor
	
	public EquipItem(int id, String name, int damagebonus, int healthbonus, int value){
		this.id = id;
		this.name = name;
		this.damagebonus = damagebonus;
		this.healthbonus = healthbonus;
		this.value = value;
	}
	
	public int getItemType(){ 
		if( this.id >= 0 && this.id<= 15 ){
			return 1; // weapon
		}
		else if( this.id <= 30 ){
			return 2; // armor
		}
		else{
			return 3; // other
		}
	}
	
	public int getDamage()
	{ 	return this.damagebonus;	}
	
	public int getHealth()
	{ 	return this.healthbonus;	}

	public static int getArmorIdOffset() {
		return armorIdOffset;
	}

	public static int getWeaponIdOffset() {
		return weaponIdOffset;
	}	
	
}