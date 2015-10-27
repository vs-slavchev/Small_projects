package dotaPaperScissors;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.Stack;

public class GameServer {
	public static final int PORT = 8888;
	private Stack<Match> matchesStack= new Stack<>();

	public static void main(String[] args) throws IOException {
		new GameServer().play();
	}

	public void play() throws IOException {
		@SuppressWarnings("resource")
		ServerSocket serverSocket = new ServerSocket(PORT);
		System.out.println("Started GamingServer at port " + PORT);
		System.out.println("Waiting for clients to connect...");

		while (true) {
			@SuppressWarnings("resource")
			Socket socket = serverSocket.accept();
			System.out.println("Client connected.");
			makeMatch(new GameService(socket));
		}
	}

	public void makeMatch(GameService service) {
		if (!matchesStack.isEmpty() && !matchesStack.peek().matchReady()){
			matchesStack.peek().addPlayer2(service);
		} else {
			matchesStack.push(new Match(service));
		}
	}
}
