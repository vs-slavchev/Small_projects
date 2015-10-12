
#include "game_sys.h"

#define BLUE makecol( 0, 162, 132 )
#define RED makecol( 255, 0, 0 )

Game_sys::Game_sys( int give_scrnwdth, int give_scrnhght )
{

    screenwidth = give_scrnwdth;
    screenheight = give_scrnhght;

    buffer = 0;

    backgrounds = 0;
    bgmusic = 0;
    s_samples = 0;
    playerSprites = 0;
    evilBubbleSprites = 0;
    force_to_play_timer = 0;

}

void Game_sys::InitializeAllegro()
{

    allegro_init(); // INITIALIZE ALLEGRO
    install_keyboard();
    install_sound( DIGI_AUTODETECT, MIDI_AUTODETECT, 0 );
    set_color_depth(32);

    set_gfx_mode( GFX_AUTODETECT_WINDOWED, screenwidth, screenheight, 0, 0 ); // SET THE GRAPHICS MODE

    buffer = create_bitmap( screenwidth, screenheight ); // CREATE THE BUFFER

	set_window_title( "Bubble Rebel" ); // SET THE WINDOW TITLE

}

void Game_sys::DrawBackground()
{

    stretch_blit( (BITMAP*)backgrounds[1].dat, buffer, 0, 0, 640, 480, 100, 0, screenwidth, screenheight );

}

void Game_sys::LoadDatafiles()
{
	//LOAD ALL THE DATAFILES
    backgrounds = LoadDatafile( "Datafiles/backgrounds.dat" );
    bgmusic = LoadDatafile( "Datafiles/bgmusic.dat" );
    s_samples = LoadDatafile( "Datafiles/samples.dat" );
    playerSprites = LoadDatafile( "Datafiles/playerSprites.dat" );
    evilBubbleSprites = LoadDatafile( "Datafiles/evilBubbleSprites.dat" );

    interfaceFont = LoadFont("Fonts/interfaceFont.pcx");
    titleFont = LoadFont("Fonts/titlesFont.pcx");

}

DATAFILE * Game_sys::LoadDatafile( char * filename ) // FUNCTION FOR EASY AND SAFE DATAFILE LOADING
{

        DATAFILE * result = load_datafile( filename );
        if( !result )
        {

            set_gfx_mode( GFX_TEXT, 0, 0, 0, 0 );
            allegro_message( "Could not load datafile: %s", filename );
            exit( EXIT_FAILURE );

        }

        return result;
}

FONT * Game_sys::LoadFont( char * fontname ) // FUNCTION FOR EASY AND SAFE FONT LOADING
{

        FONT * result = load_font( fontname, 0, 0 );
        if( !result )
        {

            set_gfx_mode( GFX_TEXT, 0, 0, 0, 0 );
            allegro_message( "Could not load font: %s", fontname );
            exit( EXIT_FAILURE );

        }

        return result;

}

void Game_sys::UnloadDatafilesAndCleanUp() // FUNCTION FOR DEALLOCATIONG THE MEMORY
{

    unload_datafile( backgrounds );
    backgrounds = 0;

    unload_datafile( bgmusic );
    bgmusic = 0;

    unload_datafile( s_samples );
    s_samples = 0;

    unload_datafile( playerSprites );
    playerSprites = 0;

    unload_datafile( evilBubbleSprites );
    evilBubbleSprites = 0;

    destroy_font( interfaceFont );
    destroy_font( titleFont );

}

BITMAP * Game_sys::GetBufferAddr()
{
    return buffer;
}

DATAFILE * Game_sys::GetPlayerSpritesAddr()
{
    return playerSprites;
}

DATAFILE * Game_sys::GetEvilBubbleSprites()
{
    return evilBubbleSprites;
}

DATAFILE * Game_sys::GetSampleAddr()
{
    return s_samples;
}

void Game_sys::BlitToScreen( bool player_alive ) // BLIT THE BUFFER TO THE SCREEN
{
    if( player_alive )
    {
    blit( buffer, screen, 0, 0, 0, 0, screenwidth, screenheight );
    clear_bitmap( buffer );
    }
}

void Game_sys::WelcomeScreen() // LOOP FOR THE INTRO
{

    while( !key[KEY_B] )
    {

        blit( (BITMAP*)backgrounds[0].dat, buffer, 0, 0, 0, 0, screenwidth, screenheight );

        textprintf_centre_ex( buffer, titleFont, screenwidth/2, screenheight-120, RED,
                             -1, "Bubble Rebel by Veselin Slavchev" );
        textprintf_centre_ex( buffer, titleFont, screenwidth/2, screenheight-80, RED,
                             -1, "Press 'B' to play!" );

        blit( buffer, screen, 0, 0, 0, 0, screenwidth, screenheight );
        clear_bitmap( buffer );

    }

}

void Game_sys::ExitScreen( Player * player, Evil_bubble * evilBubble ) // SHOW THE SCORE AND RESTART THE GAME
{

    if(  !player -> Get_alive() )
    {
        force_to_play_timer += 0.02f;

        clear_to_color( buffer, makecol( 63, 72, 204 ) );

        textprintf_centre_ex( buffer, titleFont, screenwidth/2, screenheight/2 - 50, makecol( 63, 251, 0 ),
                             -1, "Your score: %i", ( player -> Get_bubbles_collected() ) );

        textprintf_centre_ex( buffer, titleFont, screenwidth/2, screenheight/2 + 50, makecol( 63, 251, 0 ),
                             -1, "please wait..." );
        BlitToScreen( !player -> Get_alive() );

        if( force_to_play_timer > 7 )
        {
			// RESET THE PLAYER, THE EVIL BUBBLE AND THE RESET TIMER
            player -> SetMembers();
            evilBubble -> SetMembers();
            force_to_play_timer = 0;
        }

    }

}

void Game_sys::DrawInterface( Player * player, int evil_bubbles )
{

    rectfill( buffer, 0, 0, 100, screenheight, BLUE );
    rect( buffer, 3, 3, 97, screenheight - 3, makecol( 0, 108, 155 ) );

    textprintf_centre_ex( buffer, interfaceFont, 50, 50, RED, -1, "Bubbles:" );
    textprintf_centre_ex( buffer, interfaceFont, 50, 70, RED, -1, "Your : Evil's" );
    textprintf_centre_ex( buffer, interfaceFont, 50, 85, RED, -1, "%i : %i", player -> Get_bubbles_collected(), evil_bubbles );

    int breath_bar_color;
    if( player -> Get_current_breath() < 70 )
    breath_bar_color = makecol( 255, 0, 0 );
    else
    breath_bar_color = makecol( 0, 255, 0 );
    rectfill( buffer, 20, 200 + player -> Get_max_breath() - player -> Get_current_breath(), 80, 200 + player -> Get_max_breath(), breath_bar_color );
    rect( buffer, 20, 199 , 80, 201 + player -> Get_max_breath(), makecol( 0, 255, 0 ) );


}

int Game_sys::GetWidth()
{
    return screenwidth;
}

int Game_sys::GetHeight()
{
    return screenheight;
}

void Game_sys::PlayMusic()
{
    play_midi( (MIDI*)bgmusic[0].dat, 1 );
    set_volume( 255, 100 );
}





