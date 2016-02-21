package creaturePackage;
// Buff class is both positive and negative status effects
public class Buff {

	private int bonusdamage, bonushealth, durationRemaining;
	private String description;
	
	
	public Buff(int id){
		
		switch(id){
		case 1: //stout
			this.bonusdamage = 1;
			this.bonushealth = 5;
			this.durationRemaining = 20;
			this.description = "Stout";
			break;
		case 2: //ironwood ale
			this.bonusdamage = 2;
			this.bonushealth = 8;
			this.durationRemaining = 25;
			this.description = "Ironwood ale";
			break;
		case 3: //shieldfall mead
			this.bonusdamage = 4;
			this.bonushealth = 8;
			this.durationRemaining = 30;
			this.description = "Shieldfall mead";
			break;
		case 4: //dauthi brew
			this.bonusdamage = 7;
			this.bonushealth = 10;
			this.durationRemaining = 35;
			this.description = "Dauthi brew";
			break;
		case 5:
			this.bonusdamage = 7;
			this.bonushealth = 0;
			this.durationRemaining = 15;
			this.description = "God of war blessing";
			break;
		case 6:
			this.bonusdamage = 0;
			this.bonushealth = 30;
			this.durationRemaining = 20;
			this.description = "Godess of sleep blessing";
			break;
		case 7:
			this.bonusdamage = -10;
			this.bonushealth = 0;
			this.durationRemaining = 10;
			this.description = "Godess of peace curse";
			break;
		case 8:
			this.bonusdamage = 0;
			this.bonushealth = -30;
			this.durationRemaining = 15;
			this.description = "God of fear curse";
			break;
		default:
			this.bonusdamage = 0;
			this.bonushealth = 0;
			this.durationRemaining = 0;
			this.description = "broken buff";
			break;
		}
	}

	public int getBonusdamage() {
		return this.bonusdamage;
	}

	public int getBonushealth() {
		return this.bonushealth;
	}

	public int getDurationRemaining() {
		return this.durationRemaining;
	}
	
	public String getDescription() {
		return " " + this.description;
	}
	
	public String getFormatedDescr(){ // return formated buff description to be easily printable
		StringBuilder sb = new StringBuilder();
		sb.append(" " + getDescription() + ": ");
		if( this.bonusdamage > 0 ){
			sb.append(getBonusdamage() + " bonus damage; ");
		}
		if( this.bonushealth > 0 ){
			sb.append(getBonushealth() + " bonus maximum health");
		}
		sb.append(" for " + getDurationRemaining()  + " hours.");
		return sb.toString();
	}
}
