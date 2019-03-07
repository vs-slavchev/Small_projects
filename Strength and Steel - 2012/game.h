#ifndef GAME_H_INCLUDED
#define GAME_H_INCLUDED

#include "rectangle.h"
#include <string>

class System
{
  public:
  System();
  System( int scrnw, int scrnh, bool fullscrn);
  ~System();
  void Setup();
  void GiveWidthHeight( int scrnw, int scrnh);
  int GetWidth();
  int GetHeight();
  void InitMap( int blockSizeL );
  void LoadMap();
  void DrawMap( BITMAP * buffer, DATAFILE * tileSet, bool layer, int playerXL, int playerYL ); //layer 0 - bg, layer 1 - foregr
  void BlitToScreen( BITMAP * buffer, int playerX, int playerY );
  BITMAP * CreateBuffer();
  int GetBlockSize();
  int GetMapSizeX();
  int GetMapSizeY();
  bool KeyPressed( int keyValue );
  int MouseKeyPressed();
  void UseMainMenu();
  void DrawMainMenu( BITMAP * buffer, FONT * fFont, DATAFILE * steelLogo );
  int GetGameState();
  void SetGameState( int gameSt );
  void DestroyCurrScrn();
  void ShowCredits( BITMAP * buffer, FONT * font, FONT * mainFont );
  int ** GetMapAddress();
  void EqualizeMap(); // makes the **mapArray be equal to the map[][]
  void FreeMapArray();
  void ChangeMaps( int * plx, int * ply );
  int GetMapColumn();
  int GetMapRow();
  void DrawCursor( BITMAP * buffer, DATAFILE * cursorSpr, int interfaceX, int interfaceY );
  int GetMouseX();
  int GetMouseY();


  private:
  int screenwidth;
  int screenheight;
  bool fullscreen;
  int GFXResult;
  int gameState;
  int selMenuItem;
  int keyPress;
  int prevKeyPress;
  int currMouseState;
  int prevMouseState;
  int blockSize;
  int mapSizeX;
  int mapSizeY;
  int map[100][100];
  int ** mapArray;
  bool doneLoadingMap;
  int cameraX;
  int cameraY;
  BITMAP * currScrn;
  int scrnshotCounter;
  int mapRow;
  int mapColumn;
  int maxmapRow;
  int maxmapColumn;

};

#endif // GAME_H_INCLUDED
