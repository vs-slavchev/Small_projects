package game;

public class StateManager {

	public enum States {
		MENU, PLAY
	}

	private States state = States.MENU;
	private static StateManager stateManager;

	public static StateManager getStateManager() {
		if (stateManager == null) {
			stateManager = new StateManager();
		}
		return stateManager;
	}

	private StateManager() {
		// disable constructor
	}

	public States getState() {
		return this.state;
	}

	public void setState(States state) {
		this.state = state;
	}

}