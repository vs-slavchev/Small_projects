#include <allegro.h>
#include <iostream>
#include <fstream>
#include <string>

#include "game.h"
#include "rectangle.h"

#define BLACK makecol( 0, 0, 0 )
#define RED makecol( 255, 0, 0 )

System::System()
{

    screenwidth = 640;
    screenheight = 480;

}

System::System( int scrnw, int scrnh, bool fullscrn)
{

    screenwidth = scrnw;
    screenheight = scrnh;
    fullscreen = fullscrn;

}

void System::Setup()
{

    allegro_init();
    install_keyboard();
    install_timer();
    install_mouse();
    install_sound( DIGI_AUTODETECT, MIDI_AUTODETECT, 0);
    set_color_depth( 32 );

    if( !fullscreen )
    {
        GFXResult = set_gfx_mode(GFX_AUTODETECT_WINDOWED, screenwidth, screenheight, 0, 0);
    } else
        GFXResult = set_gfx_mode(GFX_AUTODETECT, screenwidth, screenheight, 0, 0);

        if( GFXResult != 0 )
        {
                set_gfx_mode(GFX_TEXT,0,0,0,0);
                allegro_message("Could not set up GFX_MODE!");
                exit(EXIT_FAILURE);
        }

    currScrn = create_bitmap( screenwidth, screenheight );
    clear_bitmap( currScrn );

    gameState = 1;
    selMenuItem = 1;
    mapArray = 0;
    scrnshotCounter = 1;

    mapRow = 1;
    mapColumn = 1;
    maxmapRow = 10;
    maxmapColumn = 10;

    mapArray = (int **)malloc( 100 * sizeof( int * ) );

	// each row is a 1D array
	for( int i = 0; i < 100; i++ )
	    *(mapArray + i ) = (int *)malloc( 100 * sizeof( int ) );

}

void System::FreeMapArray()
{
    for( int i = 0; i < 100; i++ )
	    free( *(mapArray + i ) );

	    free( mapArray );
}

void System::GiveWidthHeight( int scrnw, int scrnh)
{

    screenwidth = scrnw;
    screenheight = scrnh;

}

int System::GetWidth()
{

    return screenwidth;

}

int System::GetHeight()
{

    return screenheight;

}

void System::InitMap( int blockSizeL )
{

    blockSize = blockSizeL;
    doneLoadingMap = false;

}

void System::LoadMap()
{

    char mapName[256];
    sprintf( mapName, "Maps/MapC%02dR%02d.txt", mapColumn, mapRow );

    int loadCounterX = 0, loadCounterY = 0;
    std::ifstream openfile( mapName );
    if( openfile.is_open() )
    {

        openfile >> mapSizeX;
        openfile >> mapSizeY;
        while( !openfile.eof() )
        {

            openfile >> map[loadCounterX][loadCounterY];
            loadCounterX++;
            if( loadCounterX >= mapSizeX )
            {

                loadCounterY++;
                loadCounterX = 0;

            }

        }

    }else
    {

        allegro_message("Could not locate %s", mapName );
        doneLoadingMap = true;

    }

    EqualizeMap();

}

void System::DrawMap( BITMAP * buffer, DATAFILE * tileSet, bool layer, int playerXL, int playerYL ) //layer 0 - bg, layer 1 - foregr
{

    if( layer == 0 ) // draw background layer
    {

        int tileFrame = 0;

    for( int i = 0; i < mapSizeX; i++ )
    {

        for( int j = 0; j < mapSizeY; j++ )
        {
            if( ! ( ( i * blockSize + 2 * blockSize < cameraX ) || ( i * blockSize - blockSize > cameraX + screenwidth ) ||
               ( j * blockSize + 2 * blockSize < cameraY ) || ( j * blockSize - blockSize > cameraY + screenheight ) ) )
               {

            tileFrame = map[i][j];

            if( ( tileFrame > 329 ) && ( tileFrame < 350 ) ) // if 2-layered tile (1st), draw bg layer only
            {
                tileFrame -=  20;
            }


            int l = 0;
            for( int k = 20; k < 340; k += 10, l++ )
            {
                if( tileFrame < k )
                {
                    blit( (BITMAP * )tileSet[0].dat, buffer, ( tileFrame - ( k - 10 ) ) * blockSize, l * blockSize, i * blockSize, j * blockSize, blockSize, blockSize );
                    break;
                }
            }

            if ( tileFrame > 349 ) //for trees' bg
            blit( (BITMAP * )tileSet[0].dat, buffer, 9 * blockSize, 4 * blockSize, i * blockSize, j * blockSize, blockSize, blockSize );
            }// close if statemant

        }// close for loop

    }// close for loop

    }else // draw foreground layer
    {

        int tileFrame = 0;

    for( int i = 0; i < mapSizeX; i++ )
    {

        for( int j = 0; j < mapSizeY; j++ )
        {
            if( ! ( ( i * blockSize + blockSize < cameraX ) || ( i * blockSize - blockSize > cameraX + screenwidth ) ||
               ( j * blockSize + blockSize < cameraY ) || ( j * blockSize - blockSize > cameraY + screenheight ) ) )
               {

            tileFrame = map[i][j];

            if( tileFrame > 329 && tileFrame < 340 )
                masked_blit( (BITMAP * )tileSet[0].dat, buffer, ( tileFrame - 330 ) * blockSize, 32 * blockSize,  i * blockSize, j * blockSize, blockSize, blockSize );

            if( tileFrame > 339 && tileFrame < 350 )
                masked_blit( (BITMAP * )tileSet[0].dat, buffer, ( tileFrame - 340 ) * blockSize, 33 * blockSize,  i * blockSize, j * blockSize, blockSize, blockSize );

            for( int k = 350; k < 430; k += 10 )
            {

                if( ( tileFrame > ( k - 1 ) ) && ( tileFrame < ( k + 10 ) ) )
                {
                    masked_blit( (BITMAP * )tileSet[0].dat, buffer, ( tileFrame - k ) * blockSize, ( k/10 - 1 ) * blockSize,  i * blockSize, j * blockSize, blockSize, blockSize );
                    //break;
                }

            }
               }

        }

    }

    }

}

  void System::BlitToScreen( BITMAP * buffer, int playerX, int playerY )
  {
      cameraX = ( playerX - ( screenwidth / 2 ) );
      cameraY = ( playerY - ( screenheight / 2 ) );

      if( cameraX < 0 )
      cameraX = 0;
      if( cameraY < 0 )
      cameraY = 0;
      if( cameraX > ( mapSizeX * blockSize - screenwidth ))
      cameraX = ( mapSizeX * blockSize - screenwidth );
      if( cameraY > ( mapSizeY * blockSize - screenheight ))
      cameraY = ( mapSizeY * blockSize - screenheight );

      blit(buffer, screen, cameraX, cameraY, 0, 0, screenwidth, screenheight );





      // capture screenshot
       prevKeyPress = keyPress;

    for( int i = 0; i < KEY_MAX; i++ )
    {

        if( key[i] )
        {

            keyPress = i;
            break;

        }else
        keyPress = 0;

    }

       if( KeyPressed( KEY_F10 ) || KeyPressed( KEY_PRTSCR ))
       {

        char namearr[255];
        sprintf( namearr, "Screenshots/Screenshot%05d.bmp", scrnshotCounter );
        scrnshotCounter++;

        blit(buffer, currScrn, cameraX, cameraY, 0, 0, screenwidth, screenheight );
        save_bitmap( namearr, currScrn, 0 );
        clear_bitmap( currScrn );

       } else if( KeyPressed( KEY_F12 ) )
        save_bitmap("Screenshots/scrnshot_wholemap.bmp", buffer, 0 );

  }

  System::~System()
  {
              destroy_bitmap( currScrn );
  }

BITMAP * System::CreateBuffer()
{

    BITMAP * Buffer = create_bitmap( ( mapSizeX * blockSize ), ( mapSizeY * blockSize ) );
    return Buffer;

}

int System::GetBlockSize()
{
    return blockSize;
}

int System::GetMapSizeX()
{
    return mapSizeX;
}

int System:: GetMapSizeY()
{
    return mapSizeY;
}

bool  System::KeyPressed( int keyValue )
{

    if( keyPress == keyValue && prevKeyPress != keyValue )
    return true;
    return false;

}

int System::MouseKeyPressed()
{
    if( prevMouseState != currMouseState )
    {
        if( mouse_b & 1 )
        return 1;
        else if( mouse_b & 2 )
        return 2;
    }
    else
    return 0;
}

void System::UseMainMenu()
{

    prevMouseState = currMouseState;

    if( mouse_b & 1 )
    currMouseState = 1;
    else if( mouse_b & 2 )
    currMouseState = 2;
    else currMouseState = 0;


    prevKeyPress = keyPress;

    for( int i = 0; i < KEY_MAX; i++ )
    {

        if( key[i] )
        {

            keyPress = i;
            break;

        }else
        keyPress = 0;

    }

    if( KeyPressed( KEY_UP ))
    {
        if( selMenuItem > 1 )
        selMenuItem -= 1;
        else if( selMenuItem == 1 )
        selMenuItem = 5;
    } else if( KeyPressed( KEY_DOWN ))
    {
        if( selMenuItem < 5 ) // 5 menu items !
        selMenuItem += 1;
        else if( selMenuItem == 5 )
        selMenuItem = 1;
    }



    if( KeyPressed( KEY_ENTER ) )
    {

        switch( selMenuItem )
        {

            case 1:
            gameState = 2; // Play
            break;
            case 2:
            gameState = 3; // Load saved game
            break;
            case 3:
            gameState = 4; // Options
            break;
            case 4:
            gameState = 5; // Credits
            break;
            case 5:
            gameState = 0; // Exit
            break;
            default:
            gameState = 0; // Exit
            break;


        }

    }

}

void System::DrawMainMenu( BITMAP * buffer, FONT * fFont, DATAFILE * steelLogo )
{
    clear_to_color( buffer, makecol( 0, 128, 64 ) );

    masked_blit( (BITMAP  *)steelLogo[0].dat, buffer, 0, 0, screenwidth/2 - 92, 70, 185, 98 );

    int textColor = makecol( 255, 255, 255 );
    char * textMenuItem;

    for( int i = 1; i < 6; i++ )
    {
        if( selMenuItem == i )
        textColor = makecol( 255, 0, 0 );
        else
        textColor = makecol( 255, 255, 255 );

        switch( i )
        {

            case 1:
            textMenuItem = (char*)"Play";
            break;
            case 2:
            textMenuItem = (char*)"Load saved game";
            break;
            case 3:
            textMenuItem = (char*)"Options";
            break;
            case 4:
            textMenuItem = (char*)"Credits";
            break;
            case 5:
            textMenuItem = (char*)"Exit";
            break;
            default:
            textMenuItem = (char*)"Exit";
            break;

        }

        textprintf_centre_ex( buffer, fFont, ( screenwidth / 2 ), 150 + i * 80, textColor, -1, textMenuItem, 0 );
    }

    blit( buffer, screen, 0, 0, 0, 0, screenwidth, screenheight );

 }


int System::GetGameState()
{
      return gameState;
}

void System::SetGameState( int gameSt )
{
    gameState = gameSt;
}

void System::DestroyCurrScrn()
{
    destroy_bitmap( currScrn );
    currScrn = 0;
}

void System::ShowCredits( BITMAP * buffer, FONT * font, FONT * mainFont )
{

    if( key[KEY_ESC] )
    gameState = 1;

    rectfill( buffer, 0, 0, screenwidth, screenheight, BLACK );

    textprintf_centre_ex( buffer, mainFont, screenwidth/2, 80, RED, -1, "CREDITS");
    textprintf_centre_ex( buffer, mainFont, screenwidth/2, 150, RED, -1, "Programming - Veselin Slavchev");
    textprintf_centre_ex( buffer, mainFont, screenwidth/2, 250, RED, -1, "Design - Veselin Slavchev");
    textprintf_centre_ex( buffer, mainFont, screenwidth/2, 350, RED, -1, "Main menu background by Mirela");
    textprintf_centre_ex( buffer, mainFont, screenwidth/2, 450, RED, -1, "Tilesets and environment art - see 'CREDITS.txt' ");
    textprintf_centre_ex( buffer, font, screenwidth/2, screenheight - 50, RED, -1, "Press Escape to go back to the main menu.");

    // show actual credits
}


int ** System::GetMapAddress()
{
    return mapArray;
}

void System::EqualizeMap()
{

    for( int i = 0; i < mapSizeX; i++ )
    {

	        for( int j = 0; j < mapSizeY; j++ )
	        {
	            *( *( mapArray + i ) + j ) = map[i][j];
	        }

    }



}

void System::ChangeMaps( int * plx, int * ply )
{

    if( *plx < 0 && mapColumn > 1 )
    {
        mapColumn--;

        LoadMap();

        *plx = mapSizeX * blockSize - blockSize;
    }

    if( *plx > mapSizeX * blockSize - blockSize && mapColumn < maxmapColumn )
    {
        mapColumn++;

        LoadMap();

        *plx = 0;
    }

    if( *ply < 0 && mapRow > 1 )
    {
        mapRow--;

        LoadMap();

        *ply = mapSizeY * blockSize - blockSize;
    }

    if( *ply > mapSizeY * blockSize - blockSize && mapRow < maxmapRow )
    {
        mapRow++;

        LoadMap();

        *ply = 0;
    }

}

int System::GetMapColumn()
{
   return mapColumn;
}

int System::GetMapRow()
{
   return mapRow;
}

void System::DrawCursor( BITMAP * buffer, DATAFILE * cursorSpr, int interfaceX, int interfaceY )
{
    masked_blit( (BITMAP*)cursorSpr[0].dat, buffer, 288, 1248, interfaceX+mouse_x, interfaceY+mouse_y, 20, 20 );
}

int System::GetMouseX()
{
    return mouse_x;
}

int System::GetMouseY()
{
    return mouse_y;
}










