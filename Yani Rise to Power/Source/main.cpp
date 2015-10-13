#include <allegro.h>
#include <fstream>

#include "game_sys.h"
#include "player.h"
#include "rectangle.h"
#include "baklava.h"

volatile long counter = 0;
void incrctrl() { counter++; }

int main()
{
	Game_sys game;

	LOCK_VARIABLE( counter ); // FPS control
	LOCK_FUNCTION( incrctrl );
	install_int_ex( incrctrl, BPS_TO_TIMER( 30 ) );

	game.LoadFiles();
	game.ConfigureMusic();

	while( !game.GetDone() && game.GetGameState() == 1 ) // splash screen and story
	{
        while( counter > 0 )
        {
		game.UpdateSplashNStory();
		counter -= 1;
        }
		game.DrawCrntScreen();
	}

	game.ConfigureMusic();

	while( !game.GetDone() && game.GetGameState() == 2 ) // gameplay
	{
        while( counter > 0 )
        {
		game.Update();
		counter -= 1;
        }
		game.Draw();
	}

	game.ConfigureMusic();

	while( !game.GetDone() && game.GetGameState() == 3 ) // story good end
	{
        while( counter > 0 )
        {
		game.UpdateSplashNStory();
		counter -= 1;
        }
		game.DrawCrntScreen();
	}

	while( !game.GetDone() && game.GetGameState() == 4 ) // story bad end
	{
        while( counter > 0 )
        {
		game.UpdateSplashNStory();
		counter -= 1;
        }
		game.DrawCrntScreen();
	}


	return 0;
}
END_OF_MAIN();
