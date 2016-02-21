package itemPackage;

/* This class is a superclass for EquipItem.
 * Junk items are useless vendor trash items.
 */
public class JunkItem {

	protected String name;
	protected int value, id;
	// list of 21 junk item names
	private static String[] junkItemNames = {"Pristine leather", "Broken armor scraps",
		"Smashed skull trophy", "Broken hilt", "Demonic idol",
		"Jade gem", "Jade gem", "Chipped crystal", "Broken arrow",
		"Small iron ingot", "Bronze ingot", "Broken dagger", 
		"Malachite figurine", "Small lustrous pearl", "Leather straps",
		"Small blue stone", "Molten candle", "Basillisk scale",
		"Dauthy mountain salt", "Patch of fine fur", "Bird feather"};
	
	public JunkItem( int id ) {
		if ( id >= junkItemNames.length){
			this.id = 0;
		}else{
			this.id = id;
		}
		// arbitrary way of calculating the value, higher id items are more valuable
		this.value = (9 + this.id) / 3;
		this.name = junkItemNames[this.id];
	}
	
	public JunkItem(){
		this.name = "empty";
		this.value = this.id = 0;
	}
	
	public int getValue()
	{	return this.value;	}

	public String getName()
	{	return this.name;	}
}







