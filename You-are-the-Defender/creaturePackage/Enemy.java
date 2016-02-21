package creaturePackage;


public class Enemy {
	
	private String name;
	private String weapon;
	private String armor;
	private int id, damage, health; // no need for maxhealth
	
	public Enemy( int id ){
		
		this.id = id;
		if( this.id <= 25 ){ //if not a boss autofill stats
		
		this.damage = 10 + this.id;
		this.health = 20 +this.id*2;
		}
		
		switch( this.id ){
		case 1:
			this.name = " werewolf";
			this.weapon = " sharp claw";
			this.armor = " thick furry hide";
			break;
		case 2:
			this.name = " bandit";
			this.weapon = " cutlass";
			this.armor = " light leather armor";
			break;
		case 3:
			this.name = " mage";
			this.weapon = " magic arrow";
			this.armor = " crimson vest";
			break;
		case 4:
			this.name = " skeleton";
			this.weapon = " rusty sword";
			this.armor = " broken iron armor";			
			break;
		case 5:
			this.name = " necromancer";
			this.weapon = " bone dagger";
			this.armor = " black robes";						
			break;
		case 6:
			this.name = " cave troll";
			this.weapon = " giant bone club";
			this.armor = " fur armor";						
			break;
		case 7:
			this.name = " walking corpse";
			this.weapon = " rusted war axe";
			this.armor = " ragged clothes";						
			break;
		case 8:
			this.name = " demon";
			this.weapon = " long claw";
			this.armor = " thick scaly hide";						
			break;
		case 9:
			this.name = " cultist warrior";
			this.weapon = " short iron sword";
			this.armor = " chain iron armor";						
			break;
		case 10:
			this.name = " cultist";
			this.weapon = " cursed dagger";
			this.armor = " bloody robes";						
			break;
		case 11:
			this.name = " cultist zealot knight";
			this.weapon = " steel greatsword";
			this.armor = " steel armor";
			break;
		case 12:
			this.name = " cultist warlock";
			this.weapon = " staff of soul trapping";
			this.armor = " rune engraved robes";
			break;
		case 13:
			this.name = " risen skeletal worker";
			this.weapon = " pickaxe";
			this.armor = " cloth scraps";
			break;
		case 14:
			this.name = " plagued abomination";
			this.weapon = " spiked club";
			this.armor = " hardened skin";
			break;
		case 15:
			this.name = " gargoyle";
			this.weapon = " rocky talon";
			this.armor = " stone skin";
			break;
		case 16:
			this.name = " plains giant";
			this.weapon = " flat rock";
			this.armor = " belt made of shields";
			break;
		case 17:
			this.name = " demon taskmaster";
			this.weapon = " steel whip";
			this.armor = " mithril shell";
			break;
		case 18:
			this.name = " flame demon";
			this.weapon = " burning spear";
			this.armor = " red obsidian chestplate";
			break;
		case 19:
			this.name = " death knight champion";
			this.weapon = " thorium bladebreaker";
			this.armor = " deathforged helm";
			break;
		case 20:
			this.name = " thunder shaman";
			this.weapon = " rock smasher";
			this.armor = " steelstorm shield";	
			break;
		case 21:
			this.name = " apocalypse guard";
			this.weapon = " vengeful trident";
			this.armor = " dragonscale vest";
			break;
		case 22:
			this.name = " centaur invader";
			this.weapon = " flamethorn broadaxe";
			this.armor = " bronze scarab plate";
			break;
		case 23:
			this.name = " hellcaller";
			this.weapon = " cursed decapitator";
			this.armor = " crystalshard cuirass";
			break;
		case 24:
			this.name = " bane torturer";
			this.weapon = " meathook";
			this.armor = " pyerite helm";
			break;
		case 25:
			this.name = " beholder";
			this.weapon = " pain gaze";
			this.armor = " magic shell";
			break;
			
			
			// boss and rare enemies - manual hp and dmg setup
		case 26:
			this.name = " minotaur";
			this.weapon = " adamantite polearm";
			this.armor = " thick skin";
			this.damage = 15;
			this.health = 50;
			break;
		/*case 27:
			name = " beholder";
			weapon = " pain gaze";
			armor = " magic shell";
			break;
		case 25:
			name = " beholder";
			weapon = " pain gaze";
			armor = " magic shell";
			break;
		case 25:
			name = " beholder";
			weapon = " pain gaze";
			armor = " magic shell";
			break;
		 	*/

		default:
			this.name = " stalker";
			this.weapon = " soulblade";
			this.armor = " cobalt barrier";
			break;
			
		}
		
	}
	public int getid()
	{	return this.id;	}
		
	public String getName()
	{	return this.name;	}
	
	public String getWeapon()
	{	return this.weapon;	}
	
	public String getArmor()
	{	return this.armor;	}

	public int getDamage()
	{	return this.damage;	}
	
	public int getHealth()
	{	return this.health;	}
	
	public void takeDmg( int dmg ){
		this.health -= dmg;
	}	
	
}
