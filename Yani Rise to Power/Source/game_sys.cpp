
#include "game_sys.h"
#include <iostream>
#include <fstream>

//#define gameWindowWidth 1280 //640
//#define gameWindowHeight 960 //480

#define BLACK makecol( 0, 0, 0 )
#define RED makecol( 255, 20, 20 )
#define GREEN makecol( 0, 190, 0 )
#define BLUE makecol( 0, 0, 255 )
#define WHITE makecol( 255, 255, 255 )
#define GREY makecol( 200, 200, 200 )

    Game_sys::Game_sys()
    {

    LoadVideoSettings();

	done = false;
	title_x = 100;
	title_y = 100;

	upgradeCount = 0;
	upgradeSeen = 1;
	gameState = 1;
	splashCounter = 0.01f;
	crntScreenCount = 1;
	doneGameplay = false;


	allegro_init();

	install_keyboard();
	install_timer();
	set_color_depth( 32 );

	if( fullscrn )
	set_gfx_mode( GFX_AUTODETECT, gameWindowWidth, gameWindowHeight, 0, 0 ); // _FULLSCREEN ?
	else
	set_gfx_mode( GFX_AUTODETECT_WINDOWED, gameWindowWidth, gameWindowHeight, 0, 0 );

    if( install_sound(DIGI_AUTODETECT,MIDI_AUTODETECT,NULL) != 0 )
	{
	  allegro_message("ERROR: Couldn't initialize sound hardware!");
	}

	buffer = create_bitmap( 640, 480 );


	for( int i = 0; i < 5; i++ )
	{
		baklArr[i] = new Baklava( i );
	}


	titleFont = Load_custFont( "Fonts/titleFont.pcx" );
	interfaceFont = Load_custFont( "Fonts/interfaceFont.pcx" );
	normalFont = Load_custFont( "Fonts/normalFont.pcx" );
	bigFont = Load_custFont( "Fonts/bigfont36.pcx" );

}

	Game_sys::~Game_sys()
	{

		destroy_bitmap( buffer );
		destroy_font( titleFont );
		destroy_font( interfaceFont );
		destroy_font( normalFont );
		destroy_font( bigFont );
		destroy_midi( introMusic );
		destroy_midi( gameplayMusic );
		destroy_sample( pickUp );
		destroy_sample( hurt );

		for( int i = 0; i < 5; i++ )
		{
			delete baklArr[i];
			baklArr[i] = 0;
		}

		unload_datafile( imagesdatafile );
        imagesdatafile = 0;

	}

	void Game_sys::Update()
	{

		if( key[KEY_ESC] )
			done = true;

		if( upgradeSeen )
        {


			if( key[KEY_DOWN] )
				player.Move( 0 );
			else if( key[KEY_UP] )
				player.Move( 3 );
			if( key[KEY_LEFT] )
				player.Move( 1 );
			else if( key[KEY_RIGHT] )
				player.Move( 2 );

			player.Update();

			if( player.GetAlive() < 1 )
				gameState = 4; // bad ending

			for( int i = 0; i < 5; i++ )
			{
			player.CollideWBaklava( baklArr[i], &upgradeCount, &upgradeSeen, &doneGameplay, hurt, pickUp );
			baklArr[i]->Move();
			baklArr[i]->Update();
			}

        }else
        {
            if( key[KEY_SPACE] )
            upgradeSeen = true;
        }

			if( doneGameplay )
				gameState = 3;

	}

	void Game_sys::UpdateSplashNStory()
	{

		if( key[KEY_ESC] )
			done = true;

			splashCounter += 0.03;

			if( splashCounter >= 0 && splashCounter < 5 )
				crntScreenCount = 1;
			else if( splashCounter >= 5 && splashCounter < 10 )
				crntScreenCount = 2;
			else if( splashCounter >= 10 && splashCounter < 20 )
				crntScreenCount = 3;
			else if( splashCounter >= 20 && splashCounter < 35 )
				crntScreenCount = 4;
			else if( splashCounter >= 35 && splashCounter < 43 )
				crntScreenCount = 5;
			else if( splashCounter >= 43 && splashCounter < 50 )
				crntScreenCount = 6;
			else if( splashCounter >= 50 && splashCounter < 62 )
                crntScreenCount = 11;
			else if( splashCounter > 62 && splashCounter < 100 )
			{
				gameState = 2;
				splashCounter = 100;
			}
			else if( splashCounter >= 100 && splashCounter < 990 && gameState == 4 )
				crntScreenCount = 10;
			else if( splashCounter >= 100 && splashCounter < 120 )
				crntScreenCount = 7;
			else if( splashCounter >= 120 && splashCounter < 140 )
				crntScreenCount = 8;
			else if( splashCounter >= 140 && splashCounter < 170 )
				crntScreenCount = 9;

	}

	void Game_sys::Draw()
	{

            stretch_blit((BITMAP*)imagesdatafile[2].dat, buffer, 0, 0, 300, 240, 0, 0, 600, 480);

			for( int i = 0; i < 5; i++ )
			baklArr[i] -> Draw( (BITMAP*)imagesdatafile[1].dat, buffer );

			player.Draw( (BITMAP*)imagesdatafile[0].dat, buffer );
			player.DrawInterface( (BITMAP*)imagesdatafile[3].dat, interfaceFont, buffer );

			if( !upgradeSeen )
			{
				DrawUpgradeInfoScrn();
			}

			stretch_blit( buffer, screen, 0, 0, 640, 480, 0, 0, gameWindowWidth, gameWindowHeight );
			clear_to_color( buffer, makecol( 0, 0, 0 ) );

	}

	void Game_sys::DrawCrntScreen()
	{

			switch( crntScreenCount)
			{
			case 1:
			rectfill( buffer, 0, 0, 320, 200, BLACK);
			textprintf_centre_ex( buffer, titleFont, 320, 170, WHITE, -1, "Any resemblance to real");
			textprintf_centre_ex( buffer, titleFont, 320, 200, WHITE, -1, "people or events is");
			textprintf_centre_ex( buffer, titleFont, 320, 230, WHITE, -1, "purely coincidental.");
			break;
			case 2:
			rectfill( buffer, 0, 0, 320, 200, BLACK);
			textprintf_centre_ex( buffer, titleFont, 320, 150, RED, -1, "VANDALSOFT");
			textprintf_centre_ex( buffer, titleFont, 320, 190, WHITE, -1, "presents");
			textprintf_centre_ex( buffer, bigFont, 320, 250, RED, -1, "Yani: Rise to Power");
			break;
			case 3:
			stretch_blit( (BITMAP*)imagesdatafile[5].dat, buffer, 0, 0, 160, 120, 0, 0, 640, 480 );
			textprintf_centre_ex( buffer, titleFont, 320, 170, BLACK, -1, "In a land without justice... tortured by oppression...");
			textprintf_centre_ex( buffer, titleFont, 320, 200, BLACK, -1, "one boy would stand tall against the evil... and become");
			textprintf_centre_ex( buffer, titleFont, 320, 230, BLACK, -1, "a legend... in the name of righteousness!");
			break;
			case 4:
			MakeTextBgr();
			stretch_blit( (BITMAP*)imagesdatafile[6].dat, buffer, 0, 0, 160, 70, 0, 200, 640, 280 );
			textprintf_centre_ex( buffer, titleFont, 320, 50, GREEN, -1, "Y: Stop corrupting this land, you monster!");
			textprintf_centre_ex( buffer, titleFont, 320, 80, RED, -1, "V: NEVER!");
			textprintf_centre_ex( buffer, titleFont, 320, 110, GREEN, -1, "Y: Then you will face my wrath!");
			textprintf_centre_ex( buffer, titleFont, 320, 140, RED, -1, "V: Do you not realise you can't defeat me?");
			break;
			case 5:
			MakeTextBgr();
			stretch_blit( (BITMAP*)imagesdatafile[7].dat, buffer, 0, 0, 160, 70, 0, 200, 640, 280 );
			textprintf_centre_ex( buffer, titleFont, 320, 50, GREEN, -1, "Y: What?! My blade is broken?!");
			textprintf_centre_ex( buffer, titleFont, 320, 80, RED, -1, "V: Go eat more baklava and then face me! HAHAHA!");
			break;
			case 6:
			MakeTextBgr();
			stretch_blit( (BITMAP*)imagesdatafile[8].dat, buffer, 0, 0, 160, 70, 0, 200, 640, 280 );
			textprintf_centre_ex( buffer, titleFont, 320, 80, GREEN, -1, "Y: No... I have failed...");
			break;
			case 7:
			MakeTextBgr();
			stretch_blit( (BITMAP*)imagesdatafile[9].dat, buffer, 0, 0, 160, 70, 0, 200, 640, 280 );
			textprintf_centre_ex( buffer, titleFont, 320, 20, GREEN, -1, "Y: We meet again Vandal!");
			textprintf_centre_ex( buffer, titleFont, 320, 50, RED, -1, "V: Oh it's you again. Didn't I tell you to eat baklava?");
			textprintf_centre_ex( buffer, titleFont, 320, 80, RED, -1, "You are weak and puny!");
			textprintf_centre_ex( buffer, titleFont, 320, 110, GREEN, -1, "Y: Wrong! I have looked back at my land's past,");
			textprintf_centre_ex( buffer, titleFont, 320, 140, GREEN, -1, "my ancestors' culture and my people's faith! I now");
			textprintf_centre_ex( buffer, titleFont, 320, 170, GREEN, -1, "feel my true strength and I wield holy steel!");
			break;
			case 8:
			MakeTextBgr();
			stretch_blit( (BITMAP*)imagesdatafile[10].dat, buffer, 0, 0, 160, 70, 0, 200, 640, 280 );
			textprintf_centre_ex( buffer, titleFont, 320, 50, RED, -1, "V: It cannot be... this sacred blade... and the blessing!");
			textprintf_centre_ex( buffer, titleFont, 320, 80, RED, -1, "You truly are a heir of your ancestors and you hold");
			textprintf_centre_ex( buffer, titleFont, 320, 110, RED, -1, "your culture's power! Before such a great warrior I");
			textprintf_centre_ex( buffer, titleFont, 320, 140, RED, -1, "accept defeat. I will leave your land and your people");
			textprintf_centre_ex( buffer, titleFont, 320, 170, RED, -1, "and I will vanish forever.");
			break;
			case 9:
			stretch_blit( (BITMAP*)imagesdatafile[11].dat, buffer, 0, 0, 160, 120, 0, 0, 640, 480 );
			textprintf_centre_ex( buffer, titleFont, 320, 50, BLACK, -1, "And so peace was restored to this land. It's people");
			textprintf_centre_ex( buffer, titleFont, 320, 80, BLACK, -1, "prospered and a valuable lesson was learnt. Only");
			textprintf_centre_ex( buffer, titleFont, 320, 110, BLACK, -1, "those who know who they are and believe in themselves");
			textprintf_centre_ex( buffer, titleFont, 320, 140, BLACK, -1, "can succeed in their quest.");
			break;
			case 10:
			stretch_blit( (BITMAP*)imagesdatafile[12].dat, buffer, 0, 0, 160, 120, 0, 0, 640, 480 );
			textprintf_centre_ex( buffer, titleFont, 320, 50, BLACK, -1, "With the only hero defeated the fate of this land");
			textprintf_centre_ex( buffer, titleFont, 320, 80, BLACK, -1, "grew darker and darker... no faith... no hope...");
			break;
			case 11:
			stretch_blit( (BITMAP*)imagesdatafile[4].dat, buffer, 0, 0, 160, 120, 0, 0, 640, 480 );
			textprintf_centre_ex( buffer, titleFont, 320, 50, BLUE, -1, "Your objective: Collect all the artefacts of the");
			textprintf_centre_ex( buffer, titleFont, 320, 80, BLUE, -1, "land and eat baklava to become strong enough to");
			textprintf_centre_ex( buffer, titleFont, 320, 110, BLUE, -1, "defeat the villain! Be careful not to eat bigger");
			textprintf_centre_ex( buffer, titleFont, 320, 140, BLUE, -1, "pieces than you can digest, as the tremendous");
			textprintf_centre_ex( buffer, titleFont, 320, 170, BLUE, -1, "ammounts of sugar will kill you!");
			textprintf_centre_ex( buffer, titleFont, 320, 230, WHITE, -1, "A game by:");
			textprintf_centre_ex( buffer, bigFont, 320, 280, BLACK, -1, "Veselin Slavchev");
			textprintf_centre_ex( buffer, titleFont, 320, 350, WHITE, -1, "and");
			textprintf_centre_ex( buffer, bigFont, 320, 380, BLACK, -1, "^^@[®]70o0o2");
			break;
			}

			stretch_blit( buffer, screen, 0, 0, 640, 480, 0, 0, gameWindowWidth, gameWindowHeight );
			clear_to_color( buffer, makecol( 0, 0, 0 ) );

	}

	void Game_sys::MakeTextBgr()
	{
        rectfill( buffer, 0, 0, 640, 200, GREY );
	}

	bool Game_sys::GetDone()
	{
		return done;
	}

	void Game_sys::LoadFiles()
	{
	    imagesdatafile = Load_Datafile( "Images/imagesdatafile.dat" );
	    introMusic = Load_custMidi( "Sound/yani_intro_140bpm-gm.mid" );
	    gameplayMusic = Load_custMidi( "Sound/gameplay_music.mid" );
	    pickUp = Load_custSample( "Sound/pickup_baklava.wav" );
	    hurt = Load_custSample( "Sound/hurt.wav" );
	}

	int Game_sys::GetGameState()
	{
		return gameState;
	}

	void Game_sys::DrawUpgradeInfoScrn()
	{

		rectfill( buffer, 50, 140, 560, 300, makecol( 0, 179, 179 ) );
		rect( buffer, 50, 140, 560, 300, makecol( 0, 100, 100 ) );

		char textline1[256];
		char textline2[256];


		switch( player.GetUpgradeCount() )
		{
		case 1:
            sprintf( textline1, "You have acquired the Purple Chaplet!");
            sprintf( textline2, "You now have one more life.");
			break;
		case 2:
            sprintf( textline1, "You have equipped a Red Shirt!");
            sprintf( textline2, "You can now eat a little bit bigger pieces of baklava.");
			break;
		case 3:
            sprintf( textline1, "You have tasted Turkish Delight!");
            sprintf( textline2, "You are now on sugar rush and move faster.");
			break;
		case 4:
			sprintf( textline1, "You have equipped a Fez!");
            sprintf( textline2, "You can now eat a little bit bigger pieces of baklava.");
            break;
		case 5:
			sprintf( textline1, "You have acquired a Hookah!");
            sprintf( textline2, "Now you move twice as fast." );
            break;
		case 6:
			sprintf( textline1, "You have grown a Black Moustache!");
            sprintf( textline2, "You can now eat almost all baklava pieces.");
            break;
		case 7:
			sprintf( textline1, "You have been blessed by the Hodja!");
            sprintf( textline2, "The Hodja grants you one more life.");
            break;
		case 8:
			sprintf( textline1, "You have acquired Yani's Sacred Scimitar!");
            sprintf( textline2, "You can now eat all kinds of baklava!");
            break;
		default:
			break;

		}

		blit( (BITMAP*)imagesdatafile[3].dat, buffer, 0, (player.GetUpgradeCount()-1)*20, 290, 160, 20, 20 );
		textprintf_centre_ex( buffer, normalFont, 310, 200, BLACK, -1, textline1 );
		textprintf_centre_ex( buffer, normalFont, 310, 220, BLACK, -1, textline2 );
		textprintf_centre_ex( buffer, normalFont, 310, 270, BLACK, -1, "press space to continue" );

	}

	BITMAP * Game_sys::Load_image( const char * filename )
	{

	    BITMAP * result = load_bitmap( filename, 0 );

	    if( !result )
	    {
	        set_gfx_mode( GFX_TEXT, 0 ,0 , 0, 0 );
	        printf( "Could not load image: %s", filename );
	        exit(0);
	    }
	    return result;

	}

	DATAFILE * Game_sys::Load_Datafile( const char * filename )
    {

    DATAFILE * result = load_datafile( filename );

     if( !result )
        {
            set_gfx_mode( GFX_TEXT, 0, 0, 0, 0 );
            allegro_message( "Could not load datafile: %s", filename );
            exit(0);
        }
        return result;

    }

    FONT * Game_sys::Load_custFont( const char * filename )
    {

        FONT * result = load_font( filename, 0, 0 );

	    if( !result )
	    {
	        set_gfx_mode( GFX_TEXT, 0 ,0 , 0, 0 );
	        printf( "Could not load font: %s", filename );
	        exit(0);
	    }
	    return result;

    }

    SAMPLE * Game_sys::Load_custSample( const char * filename )
    {

        SAMPLE * result = load_sample( filename );

	    if( !result )
	    {
	        set_gfx_mode( GFX_TEXT, 0 ,0 , 0, 0 );
	        printf( "Could not load sample: %s", filename );
	        exit(0);
	    }
	    return result;

    }

    MIDI * Game_sys::Load_custMidi( const char * filename )
    {

        MIDI * result = load_midi( filename );

	    if( !result )
	    {
	        set_gfx_mode( GFX_TEXT, 0 ,0 , 0, 0 );
	        printf( "Could not load midi: %s", filename );
	        exit(0);
	    }
	    return result;

    }

    void Game_sys::LoadVideoSettings()
    {

        std::ifstream inFile("videoSettings.txt");

        if( inFile )
        {
            std::string garbage;
            inFile >> garbage >> fullscrn;
            inFile >> garbage >> gameWindowWidth;
            inFile >> garbage >> gameWindowHeight;
            inFile.close();
        } else
        {
            set_gfx_mode( GFX_TEXT, 0, 0, 0, 0 );
            allegro_message( "Could not load \"videoSettings.txt\"" );
            exit(0);
        }

    }

    void Game_sys::ConfigureMusic()
    {

        switch( gameState ){
        case 1:
        set_volume( 255, 100 );
        play_midi( introMusic, 1 );
        break;
        case 2:
        stop_midi();
        play_midi( NULL, 0 );
        play_midi( gameplayMusic, 1 );
        break;
        case 3:
        stop_midi();
        play_midi( introMusic, 1 );
        break;
        case 4:
        stop_midi();
        play_midi( introMusic, 1 );
        break;
        default:
        stop_midi();
        break;
        }

    }






