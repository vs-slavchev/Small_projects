
#include "bubble.h"

Bubble::Bubble( int give_x, int give_y )
{

    x = give_x;
    y = give_y;
    bubble_type = 0;
    y_modifier = 0.05f;

    srand( time(0) );

}

void Bubble::Respawn( int scrnwdth, int scrnhght ) // RANDOMIZE THE NEW PLACE, TYPE AND SPEED OF THE LITTLE BUBBLE
{

    x = 100 + 16 + 30 + rand() % ( scrnwdth - (100+16) - 16 - 30 - 30 );
    y = 50 + 16 + 30 + rand() % ( scrnhght - (50+16) - (16+50) - 30 - 30 );

    bubble_type = rand() % 3;
    y_modifier = 1 + rand() % 15;
	y_modifier /= 100;

}

void Bubble::Draw( DATAFILE * playerSprites, BITMAP * buffer )
{

    masked_blit( (BITMAP*)playerSprites[2].dat, buffer, bubble_type*32, 0, x-16, y-16, 32, 32 );

}

Bubble * Bubble::GetBubbleAddr()
{
    return this;
}

void Bubble::Move( int scrnhght )
{

    y -= y_modifier; // SLIGHTLY MOVE UPWARD

    if( y < 20 +16 )
    y = 20 +16;
    if( y > scrnhght - 20 - 16 )
    y = scrnhght - 20 - 16;

}

int Bubble::GetX()
{
    return x;
}

int Bubble::GetY()
{
    return y;
}











