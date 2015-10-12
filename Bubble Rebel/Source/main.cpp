
/*              BUBBLE REBEL
        MADE BY VESELIN RUSLANOV SLAVCHEV
    USES THE ALLEGRO 4.2.3 GAME PROGRAMMING LIBRARY - alleg.sourceforge.net */


#include <allegro.h>
#include <cmath>
#include <ctime>
#include <cstdlib>

#include "game_sys.h"
#include "basic_char.h"
#include "player.h"
#include "evil_bubble.h"
#include "bubble.h"

volatile long counter = 0; // FPS CONTROL
void IncrementControl() { counter++; }

int main()
{

    Game_sys game( 1280, 720 );
    game.InitializeAllegro();

    game.LoadDatafiles();

    game.WelcomeScreen();

    Player player;
    Evil_bubble evilBubble;
    Bubble bubble1( 320, 400 );

    LOCK_VARIABLE( counter ); // FPS CONTROL
    LOCK_FUNCTION( IncrementControl );
    install_int_ex( IncrementControl, BPS_TO_TIMER(90) );

    game.PlayMusic();

    while( !key[KEY_ESC] ) // GAME LOOP
    {
        while( counter > 0 ) // FPS
        {
           player.Move( game.GetWidth(), game.GetHeight(), game.GetSampleAddr() );
           evilBubble.Move( bubble1.GetBubbleAddr(), game.GetWidth(), game.GetHeight() );
           bubble1.Move( game.GetHeight() );

           player.CollideWithBubble( bubble1.GetBubbleAddr(), game.GetWidth(), game.GetHeight(), game.GetSampleAddr() );
           evilBubble.CollideWithBubble( bubble1.GetBubbleAddr(), game.GetWidth(), game.GetHeight(), game.GetSampleAddr() );
           player.CollideWith_Evil_Bubble( evilBubble.GetEvil_bubbleAddr(), game.GetSampleAddr() );

           game.ExitScreen( player.GetPlayerAddr(), evilBubble.GetEvil_bubbleAddr() ); // SHOW SCORE AND RESTART

            counter -= 1;
        }

    // DRAW EVERYTHING TO THE BUFFER
    game.DrawBackground();
	evilBubble.DrawTrail( game.GetBufferAddr() );
	player.DrawTrail( game.GetBufferAddr() );
    player.Draw( game.GetPlayerSpritesAddr(), game.GetBufferAddr() );
    evilBubble.Draw( game.GetEvilBubbleSprites(), game.GetBufferAddr() );
    bubble1.Draw( game.GetPlayerSpritesAddr(), game.GetBufferAddr() );
	game.DrawInterface( player.GetPlayerAddr(), evilBubble.Get_bubbles_collected() );

    game.BlitToScreen( player.Get_alive() ); // BLIT THE BUFFER TO THE SCREEN

    } // CLOSE GAME LOOP

    game.UnloadDatafilesAndCleanUp(); // CLEAN UP

    return 0;
} END_OF_MAIN()







