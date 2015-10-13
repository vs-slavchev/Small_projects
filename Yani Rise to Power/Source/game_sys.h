#ifndef GAME_SYS_H_INCLUDED
#define GAME_SYS_H_INCLUDED

#include <allegro.h>

#include "player.h"
#include "rectangle.h"


class Game_sys
{

public:
	Game_sys();
	~Game_sys();
	void Update(); // in gameplay
	void Draw(); // in gamplay
	bool GetDone();
	void LoadFiles(); // loads the images and the music
	void UpdateSplashNStory(); // shows and goes through the splash and story
	int GetGameState();
	void DrawCrntScreen(); // draws the current story slide
	void DrawUpgradeInfoScrn();
	void MakeTextBgr(); // draws the background for the text in the slides
	void LoadVideoSettings(); // reads from a txt file the video settings
	void ConfigureMusic(); // decides which song should be played and stopped

    DATAFILE * Load_Datafile( const char * filename );
    BITMAP * Load_image( const char * filename );
    FONT * Load_custFont( const char * filename );
    SAMPLE * Load_custSample( const char * filename );
    MIDI * Load_custMidi( const char * filename );



private:
	BITMAP * buffer;

	bool done;
	int title_x;
	int title_y;
	bool fullscrn;
	int gameWindowWidth, gameWindowHeight;

	Player player;
	Baklava * baklArr[5];

	DATAFILE * imagesdatafile;

	FONT * titleFont;
	FONT * interfaceFont;
	FONT * normalFont;
	FONT * bigFont;

	MIDI * introMusic; // made by marto
	MIDI * gameplayMusic;

	SAMPLE * pickUp;
	SAMPLE * hurt;


	int upgradeCount; // stores the numer of upgrades
	bool upgradeSeen; // whether the upgrade screen has been seen (space pressed)
	int gameState; // 1-splash&story, 2-game, 3-story good end, 4-bad ending
	float splashCounter; // timer for the splach
	int crntScreenCount; // stores the numer of the current screen
	bool doneGameplay; // after gameplay is done its time for the einding

};

/*
index ---- name
0 - playerspr
1 - baklspr
2 - gamebackground
3 - upgradesspr
4 - 1
12 - 9
*/


#endif // GAME_SYS_H_INCLUDED
