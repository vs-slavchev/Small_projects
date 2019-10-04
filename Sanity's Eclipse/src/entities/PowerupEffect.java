package entities;

public class PowerupEffect {

	/* variables used to define the type and bonuses of the power-up */
	private boolean invulnerabilityShield;
	private boolean scatter;
	private boolean upgrWeapon;
	private boolean bonusLife;
	private int rapidFire;
	private double bonusVelocity;
	private boolean coin;

	private int timer;
	private boolean active = true;

	@SuppressWarnings("incomplete-switch")
	public PowerupEffect(String powerupType) {
		timer = 10;
		switch (powerupType) {
		case "scatter":
			scatter = true;
			break;
		case "invulnerabilityShield":
			invulnerabilityShield = true;
			break;
		case "rapidFire":
			rapidFire = -100;
			timer = 400;
			break;
		case "upgrWeapon":
			upgrWeapon = true;
			break;
		case "bonusVelocity":
			bonusVelocity = 700.0;
			timer = 450;
			break;
		case "bonusLife":
			bonusLife = true;
			break;
		case "coin":
			coin = true;
			break;
		}
	}

	public void update() {
		timer--;
		if (timer <= 0) {
			active = false;
		}
	}

	public boolean isBonusLife() {
		return bonusLife;
	}

	public boolean isInvulnerabilityShield() {
		return invulnerabilityShield;
	}

	public boolean isScatter() {
		return scatter;
	}

	public int getRapidFire() {
		return rapidFire;
	}

	public boolean isUpgrWeapon() {
		return upgrWeapon;
	}

	public double getBonusVelocity() {
		return bonusVelocity;
	}

	public boolean isCoin() {
		return coin;
	}

	public boolean getActive() {
		return active;
	}

	public void setActive(boolean active) {
		this.active = active;
	}

}
