#include <allegro.h>
#include <fstream>
#include <iostream>
#include <string>

#include "game.h"
#include "player.h"
#include "rectangle.h"
#include "npc.h"
#include "citizen.h"
#include "itemmanager.h"
#include "projectile.h"
#include "splashscreen.h"
#include "unit.h"
#include "npcmanager.h"
//#include "monster.h"
#include "game_item.h"


volatile long counter = 0;
void incrctrl() { counter++;}

int main()
{

    System game( 960, 640, 0 ); // best at 960:640
    game.Setup();

    LOCK_VARIABLE( counter );
    LOCK_FUNCTION( incrctrl );
    install_int_ex( incrctrl, BPS_TO_TIMER(90) );

    game.InitMap( 32 );
    game.LoadMap();
    BITMAP * buffer = game.CreateBuffer();

    SplashScreen splashScreen;

    ItemMngr itemManager;

    itemManager.LoadEVERYTHING(); // load image datafiles

    Player player( 100, 200, 2, 2); // parameters( x, y, direction, frame )

    player.CreateProjectilesArray();

    NpcManager citizenManager;
    citizenManager.SetUpNpcs( game.GetMapColumn(), game.GetMapRow() );

    while( !splashScreen.GetReady() ) //splashscreen
    {
        while( counter > 0 ) // fps control
          {
            splashScreen.ShowSplashScreen( buffer, itemManager.GetSplashScreen(), game.GetWidth(), game.GetHeight() );
            counter -= 1;
          }
       game.BlitToScreen( buffer, 0, 0 );
    }

    itemManager.UnloadSplashScreenDatafile(); // unload the splashscreen as it is no longer needed

while( game.GetGameState() != 0 ) // if the game is running
{
    while( game.GetGameState() == 1 ) // main menu loop
    {
        game.UseMainMenu();
        game.DrawMainMenu( buffer, itemManager.GetMenuFont(), itemManager.GetMenuImg() );
    }


    while( game.GetGameState() == 2 ) // play loop
    {

    while( counter > 0 ) //fps control
          {

            player.UpdateColRect();

            game.ChangeMaps( player.GetAdrX(), player.GetAdrY() );
            citizenManager.ChangeMaps( game.GetMapColumn(), game.GetMapRow() );

            citizenManager.CollideAndMoveNpcs( game.GetMapAddress(), game.GetMapSizeX(), game.GetMapSizeY(),
                                           game.GetBlockSize(), player.GetRect(), player.GetFacingRect(),
                                           player.GetAdrX(), player.GetAdrY(), player.GetPrevX(),
                                           player.GetPrevY(), player.GetNearbyNpcTypeAddr(),
                                           player.GetIsNearbyNpcAddr(), player.GetIsTalkingAddr(),
                                           player.GetDirection(), player.GetInterfaceX(),
                                           player.GetInterfaceY(), game.GetWidth(), game.GetHeight() );

            player.TerrainCollision( game.GetMapAddress(), game.GetMapSizeX(), game.GetMapSizeY(),
                                     game.GetBlockSize(), game.GetWidth(), game.GetHeight() );
            player.Move( game.GetBlockSize(), game.GetMapSizeX(), game.GetMapSizeY() );
            player.CastSpells();
            player.Regenerate();
            player.MoveProjectiles( game.GetWidth(), game.GetHeight() );
            player.UseInterface( game.GetMouseX(), game.GetMouseY () );


            if( key[KEY_ESC] )
            game.SetGameState( 1 ); // main menu

            counter -= 1;

          }

    // start of drawing phase
    clear_bitmap( buffer );
    game.DrawMap( buffer, itemManager.GetSystemImg(), 0, player.GetX(), player.GetY() ); // draw background layer
    player.Draw( itemManager.GetPlayerImg() , buffer );
    player.DrawProjectiles( itemManager.GetProjectileImg(), buffer );
    citizenManager.DrawNpcs( itemManager.GetCitizenImg(), buffer, player.GetX(), player.GetY(),
                         game.GetWidth(), game.GetHeight() );

    game.DrawMap( buffer, itemManager.GetSystemImg(), 1, player.GetX(), player.GetY() ); // draw foreground layer

    player.DrawInterface( buffer, itemManager.GetInterfaceImg(), game.GetWidth(), game.GetHeight(), game.GetBlockSize(),
                         game.GetMapSizeX(), game.GetMapSizeY(), itemManager.GetInterfaceFont(),
                         game.GetMouseX(), game.GetMouseY() );

    game.DrawCursor( buffer, itemManager.GetSystemImg(), player.GetInterfaceX(), player.GetInterfaceY() );
    game.BlitToScreen( buffer, player.GetX(), player.GetY() );

    } // close play loop

    while( game.GetGameState() == 5 ) // credits
    {
    game.ShowCredits( buffer, itemManager.GetInterfaceFont(), itemManager.GetCreditsFont() );
    game.BlitToScreen( buffer, 0, 0 );
    }

} // close big while loop


player.DestroyProjectiles(); // delete projectiles array

game.DestroyCurrScrn(); // delete screenshot bitmap
game.FreeMapArray(); // free the malloc-ated mapArray
destroy_bitmap( buffer );

citizenManager.DeleteNpcArray();

    return 0;
}
END_OF_MAIN()


/* TO DO LIST:

----------npc manager;
----------put font functions into the itemmanager class;
----------map;
----------map collision;
-----moving trough maps;
monsters;
collision b/n monsters and projectiles;
melee attack;
options menu;
load saved game option from the main menu;
sound manager and sound;
bird ambient sounds;
visual and sound effects after casting different spells;
more spells and abilities;
talents - 3 trees: offensive, defensive and utility;
hotkey bar with all the abilities + spellbook ( for info and hotkey binding );
---items;
main menu background image & menu items font;


*/











