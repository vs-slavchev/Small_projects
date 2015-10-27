package dotaPaperScissors;

public class Match implements Runnable {
	private GameService player1Service;
	private GameService player2Service;
	//used to synch start for both players
	private boolean matchStarted = false;
	//if a player disconnects the match thread ends execution
	private boolean matchFinished = false;

	public Match(GameService player1) {
		this.player1Service = player1;
		new Thread(player1Service).start();
		System.out.println("Waiting for another player to connect...");
		player1Service.sendMessageToClient("Waiting for another player to connect...");
	}

	public void addPlayer2(GameService player2ServiceForeign) {
		if (this.player2Service == null) {
			this.player2Service = player2ServiceForeign;
			new Thread(this.player2Service).start();
			System.out.println("player2Service thread started!");
			player2Service.sendMessageToClient("You joined a match!");
			System.out.println("Match created!");
			try {
				Thread.sleep(1000);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
			new Thread(this).start();
			System.out.println("Match thread started!");
		}
	}

	@Override
	public void run() {
		while (!matchFinished) {
			updateRound();
		}
		System.out.println("Match finished!");
	}

	public void updateRound() {
		if (!matchStarted) {
			player1Service.setReadyForNextRound(true);
			player2Service.setReadyForNextRound(true);
			matchStarted = true;
		}
		if (!player1Service.getHeroName().equals("") && !player2Service.getHeroName().equals("")) {
			String p1 = player1Service.getHeroName();
			String p2 = player2Service.getHeroName();
			if (p1.equals(p2)) {
				sendMessageToAll("One hero can't be in two places at once, this is not LoL.");
			} else if ((p1.equals("sb") && p2.equals("pugna")) || ((p1.equals("pugna") && p2.equals("sb")))) {
				sendMessageToAll("Barathrum bashes pugna to death. Ez 17% ");
			} else if ((p1.equals("sb") && p2.equals("lina")) || ((p1.equals("lina") && p2.equals("sb")))) {
				sendMessageToAll("Lina laguna blazes the space cow to oblivion and rekts his spirit. huehue ");
			} else if ((p1.equals("lina") && p2.equals("pugna")) || ((p1.equals("pugna") && p2.equals("lina")))) {
				sendMessageToAll("Pugna sets up his nether wards and then sucks"
								+ " the living life out of poor Lina... :( ");
			} else {
				sendMessageToAll("Someone selected an invalid hero!");
			}

			player1Service.setHeroName("");
			player2Service.setHeroName("");
			player1Service.setReadyForNextRound(true);
			player2Service.setReadyForNextRound(true);
		}
		
		if (player1Service.getHeroName().equals("quit")){
			player1Service.setConnected(false);
			player2Service.sendMessageToClient("other_quit");
			player2Service.setConnected(false);
			System.out.println("player1 has quit");
			matchFinished = true;
		} else if (player2Service.getHeroName().equals("quit")){
			player2Service.setConnected(false);
			player1Service.sendMessageToClient("other_quit");
			player1Service.setConnected(false);
			System.out.println("player2 has quit");
			matchFinished = true;
		}
	}

	/* The message is appended to the front of the next message to
	 * be sent to both clients.
	 */
	private void sendMessageToAll(String msg) {
		player1Service.addToMessageBufferToClient(msg);
		player2Service.addToMessageBufferToClient(msg);
	}

	public boolean matchReady() {
		return (player1Service != null) && (player2Service != null);
	}

}
