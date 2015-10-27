package dotaPaperScissors;

import java.io.IOException;
import java.io.PrintWriter;
import java.net.Socket;
import java.util.Scanner;

public class GameService implements Runnable {

	private Socket socket;
	private Scanner networkingIN;
	private PrintWriter networkingOUT;
	private volatile String heroName = "";
	private volatile boolean readyForNextRound = false;
	private volatile boolean connected = true;
	private String buffer = "";

	public GameService(Socket socket) {
		this.socket = socket;
		try {
			networkingIN = new Scanner(socket.getInputStream());
			networkingOUT = new PrintWriter(socket.getOutputStream(), true);
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	@Override
	public void run() {
		while (connected) {
			if (readyForNextRound) {
				networkingOUT.println(buffer + "<br>" +
						"Select your hero: sb/lina/pugna or quit");
				heroName = networkingIN.nextLine().trim();
				buffer = "";
				readyForNextRound = false;
			}
		}
		try {
			socket.close();
		} catch (IOException e) {
			e.printStackTrace();
		}

	}

	public void sendMessageToClient(String msg) {
		networkingOUT.println(msg);
	}
	
	/* The frontMsg is appended to the front of the next message to
	 * be sent to a client. The buffer is emptied after the
	 * message has been sent.
	 */
	public void addToMessageBufferToClient(String frontMsg) {
		buffer = frontMsg;
	}

	public String getHeroName() {
		return heroName;
	}

	public synchronized void setHeroName(String heroName) {
		this.heroName = heroName;
	}

	public synchronized void setReadyForNextRound(boolean readyForNextRound) {
		this.readyForNextRound = readyForNextRound;
	}
	
	public synchronized void setConnected(boolean connected) {
		this.connected = connected;
	}
}
