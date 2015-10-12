#ifndef GAME_SYS_H_INCLUDED
#define GAME_SYS_H_INCLUDED

#include <allegro.h>
#include "player.h"

class Game_sys
{
    public:
    Game_sys( int give_scrnwdth, int give_scrnhght );
    void InitializeAllegro();
    void DrawBackground();
    void LoadDatafiles();
    DATAFILE * LoadDatafile( char * filename );
    FONT * LoadFont( char * fontname );
    void UnloadDatafilesAndCleanUp();
    BITMAP * GetBufferAddr();
    DATAFILE * GetPlayerSpritesAddr();
    DATAFILE * GetEvilBubbleSprites();
    DATAFILE * GetSampleAddr();
    void BlitToScreen( bool player_alive );
    void WelcomeScreen();
    void ExitScreen( Player * player, Evil_bubble * evilBubble );
    void DrawInterface( Player * player, int evil_bubbles);
    int GetWidth();
    int GetHeight();
    bool Get_done_playing();
    void PlayMusic();

    private:
    BITMAP * buffer;
    int screenwidth;
    int screenheight;
    DATAFILE * backgrounds;
    DATAFILE * bgmusic;
    DATAFILE * s_samples;
    DATAFILE * playerSprites;
    DATAFILE * evilBubbleSprites;
    FONT * interfaceFont;
    FONT * titleFont;
    float force_to_play_timer;

};

#endif // GAME_SYS_H_INCLUDED
