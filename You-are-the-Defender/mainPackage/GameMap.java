package mainPackage;

import java.io.IOException;

import ExceptionsPackage.TileException;

public class GameMap {
	
	private static final int MAX_X = 15, MAX_Y = 15; 
	private static int map[][] = new int[MAX_X][MAX_Y];
	
	public static int getTile( int x, int y){
		try{
			if ( x > MAX_X || y > MAX_Y){
				throw new TileException("Requested tile from GameMap not found: indexing out of MapArray bounds.");
			}
			if ( x == 0 || y == 0){
				throw new TileException("Requested tile from GameMap not found: the tile is not initialized properly: x = " + x + "; y = " + y);
			}
		}catch (TileException e){
			System.out.println(e.getMessage());
			try {
				System.in.read();
			} catch (IOException e1) {
				e1.printStackTrace();
			}
			System.exit(0);
		}
		return map[x][y];
	}
	
	public static void initGameMap(){	
		
		for (int i = 0; i <= 12; i++){
			map[0][i] = 2;
			map[1][i] = 2;
		}
		
		map[2][0] = 2;
		map[2][1] = 1;
		map[2][2] = 1;
		map[2][3] = 1;
		map[2][4] = 1;
		map[2][5] = 2;
		map[2][6] = 1;
		map[2][7] = 1;
		map[2][8] = 1;
		map[2][9] = 1;
		map[2][10] = 1;
		map[2][11] = 1;
		map[2][12] = 2;
		
		map[3][0] = 2;
		map[3][1] = 1;
		map[3][2] = 1;
		map[3][3] = 2;
		map[3][4] = 1;
		map[3][5] = 2;
		map[3][6] = 1;
		map[3][7] = 1;
		map[3][8] = 1;
		map[3][9] = 1;
		map[3][10] = 1;
		map[3][11] = 1;
		map[3][12] = 2;
		
		map[4][0] = 2;
		map[4][1] = 1;
		map[4][2] = 1;
		map[4][3] = 2;
		map[4][4] = 1;
		map[4][5] = 1;
		map[4][6] = 1;
		map[4][7] = 1;
		map[4][8] = 1;
		map[4][9] = 2;
		map[4][10] = 1;
		map[4][11] = 1;
		map[4][12] = 2;
		
		map[5][0] = 2;
		map[5][1] = 2;
		map[5][2] = 1;
		map[5][3] = 2;
		map[5][4] = 1;
		map[5][5] = 1;
		map[5][6] = 2;
		map[5][7] = 2;
		map[5][8] = 2;
		map[5][9] = 2;
		map[5][10] = 1;
		map[5][11] = 2;
		map[5][12] = 2;
		
		map[6][0] = 2;
		map[6][1] = 1;
		map[6][2] = 1;
		map[6][3] = 2;
		map[6][4] = 2;
		map[6][5] = 2;
		map[6][6] = 1;
		map[6][7] = 1;
		map[6][8] = 1;
		map[6][9] = 1;
		map[6][10] = 1;
		map[6][11] = 1;
		map[6][12] = 2;
		
		map[7][0] = 2;
		map[7][1] = 1;
		map[7][2] = 2;
		map[7][3] = 1;
		map[7][4] = 1;
		map[7][5] = 1;
		map[7][6] = 1;
		map[7][7] = 1;
		map[7][8] = 1;
		map[7][9] = 1;
		map[7][10] = 1;
		map[7][11] = 1;
		map[7][12] = 2;
		
		map[8][0] = 2;
		map[8][1] = 1;
		map[8][2] = 1;
		map[8][3] = 2;
		map[8][4] = 1;
		map[8][5] = 2;
		map[8][6] = 1;
		map[8][7] = 1;
		map[8][8] = 1;
		map[8][9] = 1;
		map[8][10] = 1;
		map[8][11] = 1;
		map[8][12] = 2;
		
		map[9][0] = 2;
		map[9][1] = 2;
		map[9][2] = 1;
		map[9][3] = 2;
		map[9][4] = 1;
		map[9][5] = 2;
		map[9][6] = 16;
		map[9][7] = 2;
		map[9][8] = 2;
		map[9][9] = 2;
		map[9][10] = 2;
		map[9][11] = 2;
		map[9][12] = 2;
		
		map[10][0] = 2;
		map[10][1] = 2;
		map[10][2] = 29;
		map[10][3] = 9;
		map[10][4] = 2;
		map[10][5] = 23;
		map[10][6] = 15;
		map[10][7] = 24;
		map[10][8] = 24;
		map[10][9] = 24;
		map[10][10] = 24;
		map[10][11] = 2;
		map[10][12] = 2;
		
		map[11][0] = 2;
		map[11][1] = 2;
		map[11][2] = 28;
		map[11][3] = 24;
		map[11][4] = 17;
		map[11][5] = 24;
		map[11][6] = 2;
		map[11][7] = 8;
		map[11][8] = 9;
		map[11][9] = 31;
		map[11][10] = 10;
		map[11][11] = 24;
		map[11][12] = 3;
		
		map[12][0] = 2;
		map[12][1] = 27;
		map[12][2] = 2;
		map[12][3] = 8;
		map[12][4] = 17;
		map[12][5] = 2;
		map[12][6] = 21;
		map[12][7] = 20;
		map[12][8] = 19;
		map[12][9] = 6;
		map[12][10] = 18;
		map[12][11] = 5;
		map[12][12] = 3;
		
		map[13][0] = 2;
		map[13][1] = 26;
		map[13][2] = 25;
		map[13][3] = 19;
		map[13][4] = 11;
		map[13][5] = 2;
		map[13][6] = 22;
		map[13][7] = 2;
		map[13][8] = 6;
		map[13][9] = 5;
		map[13][10] = 30;
		map[13][11] = 14;
		map[13][12] = 3;
		
		map[14][0] = 2;
		map[14][1] = 2;
		map[14][2] = 2;
		map[14][3] = 2;
		map[14][4] = 2;
		map[14][5] = 2;
		map[14][6] = 2;
		map[14][7] = 2;
		map[14][8] = 3;
		map[14][9] = 3;
		map[14][10] = 3;
		map[14][11] = 3;
		map[14][12] = 3;
		
	}
	
	
}
