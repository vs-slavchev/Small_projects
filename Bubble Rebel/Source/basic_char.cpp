
#include <cmath>
#include "basic_char.h"

void Basic_char::Draw( DATAFILE * sprites, BITMAP * buffer  )
{

    if ( alive )
    {
    circlefill( buffer, x, y, 32+bubbles_collected*10, circle_color ); // DRAW THE FILLED CIRCLE
	masked_blit( (BITMAP*)sprites[1].dat, buffer, 0, 0, x - 24, 700 - 8, 48, 16); // DRAW SHADOW
    circle( buffer, x, y, 32+bubbles_collected*10, makecol( 64, 186, 217 ) ); // DRAW THE OUTLINE
    masked_blit( (BITMAP*)sprites[0].dat, buffer, (int)anim_frame*64, is_breathing*64, x-32, y-32, 64, 64 ); // DRAW THE FACE
    }
}

void Basic_char::Update_anim_frame() // UPDATE THE ANIMATION FRAME
{

    anim_frame += 0.04f;
    if( anim_frame > 2.5 )
    anim_frame = 0;

}

void Basic_char::CollideWithBubble( Bubble * bubble, int scrnwdth, int scrnhght, DATAFILE * pop ) // CHECK FOR COLLISION WITH THE SMALL BUBBLE
{

    if( alive )
    {

    int distance = 0;

    int margin_x = bubble -> GetX() - x;
    int margin_y = bubble -> GetY() - y;

	// THE MARGIN SHOULD BE POSITIVE
    if( margin_x < 0 )
    margin_x *= -1;
    if( margin_y < 0 )
    margin_y *= -1;

    distance = sqrt( pow( margin_x, 2 ) + pow( margin_y, 2 ) ); // THE DISTANCE BETWEEN THE CENTRES OF THE PLAYER AND THE BUBBLE 

	// IF THE DISTANCE BETWEEN THEIR CENTRES IS SMALLER THAN THE SUM OF THEIR RADII THERE IS A COLLISION
    if( distance < 16 + 32 + bubbles_collected*10 )
    {
        bubble -> Respawn( scrnwdth, scrnhght );
        bubbles_collected++;
        play_sample( (SAMPLE*)pop[0].dat, 255, 128, 1000, 0 );
    }

    }

}

int Basic_char::GetX()
{
   return x;
}

int Basic_char::GetY()
{
    return y;
}

int Basic_char::Get_bubbles_collected()
{
    return bubbles_collected;
}

void Basic_char::ControlTrail() // CONTROL THE PARTICLES OF THE TRAIL
{

	trailTimer -= 0.09f;
	if( trailTimer < 0 ) // IF THE TIMER IS UP
	{

		trailTimer = maxTrailTimer; // RESET THE TIMER

		for( int i = 0; i <= 3; i++ )
		{
			for( int j = 0; j <= 1; j++ )
			{
				trailArr[i][j] = trailArr[i+1][j]; // THE OLDEST PARTICLE FADES AND A THE OTHERS MOVE ONE PLACE IN THE ARRAY
			}
		}
	
	// THE NEWEST PARTICLE IS AT THE CURRENT X AND Y
	trailArr[4][0] = x;
	trailArr[4][1] = y;

	}

}

void Basic_char::DrawTrail( BITMAP * buffer ) // DRAW THE PARTICLE TRAIL
{

	for( int i = 0; i <= 5; i++ )
	{
		circlefill( buffer, trailArr[i][0], trailArr[i][1], i*5 + trailTimer, circle_color ); // 4TH PARAMETER - THE RADIUS DEPENDS ON THE PLACE IN THE ARRAY
	}

}








