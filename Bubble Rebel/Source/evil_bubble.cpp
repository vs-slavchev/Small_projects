
#include "evil_bubble.h"

Evil_bubble::Evil_bubble()
{
    SetMembers();
}

void Evil_bubble::SetMembers()
{

    x = 550;
    y = 240;
    circle_color = makecol( 255, 0, 0 );
    redness = 0;
    incr_redness = 1;
    bubbles_collected = 0;
    anim_frame = 0;
    is_breathing = true;
    alive = true;
	maxTrailTimer = 4;
	trailTimer = maxTrailTimer;

	for( int i = 4; i >= 0; i-- )
	{
			trailArr[i][0] = x;
			trailArr[i][1] = y;
	}

}

void Evil_bubble::Move( Bubble * bubble, int scrnwdth, int scrnhght )
{

    Update_anim_frame(); // UPDATE THE ANIMATION FRAME

	ControlTrail(); // CONTROL THE TRAIL OF PARTICLES

	// CONTROL THE COLOR OF THE EVIL BUBBLE
    redness += incr_redness;
    if( redness > 250 )
    incr_redness = -0.09f;
    if( redness < 0 )
    incr_redness = 0.09f;

    circle_color = makecol( 255, redness, redness ); // UPDATE THE COLOR

	// CALCULATE THE DISTANCE TO THE GOAL, THE LITTLE BUBBLE
    float margin_x = bubble -> GetX() - x;
    float margin_y = bubble -> GetY() - y;

    if( margin_x < 0 )
    margin_x *= -1;
    if( margin_y < 0 )
    margin_y *= -1;

	// MOVE TOWARDS THE LITTLE BUBBLE
    if( margin_x > margin_y )
    {
        margin_y /= margin_x;
        margin_x = 1;
    }
    else if ( margin_y > margin_x )
    {
        margin_x /= margin_y;
        margin_y = 1;
    }
    if( bubble -> GetX() > x)
    x += margin_x/2;
    else
    x -= margin_x/2;

	// CONTROL BREATHING
    if( bubble -> GetY() > y )
    {
         y += margin_y/2;
         is_breathing = true;
    }
    else
    {
         y -= margin_y/2;
         is_breathing = false;
    }

	// PREVENT FROM GOING THROUGH THE FLOOR, BUT ALLOW TO GO THE CEILING AND THE WALLS
	if( y > scrnhght - 20 - 8 - 32 - bubbles_collected*10 )
	{
		y = scrnhght - 20 - 8 - 32 - bubbles_collected*10;
	}

}

Evil_bubble * Evil_bubble::GetEvil_bubbleAddr()
{
    return this;
}

















