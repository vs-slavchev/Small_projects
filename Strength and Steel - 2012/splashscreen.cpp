#include <allegro.h>
#include "splashscreen.h"

SplashScreen::SplashScreen()
{

    ready = false;
    redness = -60;
    phase = 1;
    redlineX = 0;

}

bool SplashScreen::GetReady()
{
    return ready;
}

void SplashScreen::ShowSplashScreen( BITMAP * buffer, DATAFILE * splashscreen, int width, int height )
{

    if( key[KEY_Z] )
    ready = true;

    if( redness > 0 )
    {
        rectfill( buffer, width/2 - 400, height/2 - 300, width/2 + 395, height/2 + 80, makecol( redness, 0, 0 ) );
        rectfill( buffer, width/2 - 400, height/2 + 80, width/2 + 395, height/2 + 295, makecol( 0, 0, redness ) );
    }

    rectfill( buffer, width/2 - 400 + redlineX, height/2 - 300, width/2 - 400 + redlineX + 30, height/2 - 300 +380, makecol( 255, 120, 120 ) );
    rectfill( buffer, width/2 - 400 + redlineX, height/2 + 80, width/2 - 400 + redlineX + 30, height/2 +295, makecol( 120, 120, 255 ) );

    masked_blit( (BITMAP *)splashscreen[0].dat, buffer, 0, 0, width/2 - 400, height/2 - 300, 800, 600 );

    if( phase == 1 )
    {
        redness += 0.8f;
        if( redness > 254 )
        {
            phase = 2;
            redness = 255;
        }

    }else if( phase == 2 )
    {
        redlineX += 5;

        if( redlineX > 750 )
        {
            phase = 3;
            redlineX = 0;
        }

    }else if( phase == 3 )
    {
        redness -= 1.6f;
        if( redness < 1 )
        ready = true;
    }


}





