
#include <cmath>
#include "player.h"
#include "evil_bubble.h"

Player::Player()
{
    SetMembers();
}

void Player::SetMembers()
{

    x = 180;
    y = 650;
    velocity_x = 0;
    velocity_y = -3.2f;
    vel_modifier = 0.01f;
    breath_modifier = 0.8f;
    max_breath_bar = 300;
    current_breath_bar = 300;
    alive = true;
    is_breathing = true;
    bubbles_collected = 0;
    circle_color = makecol( 255, 255, 255 );
    friction_x = 0.02f;
	anim_frame = 0;
	maxTrailTimer = 4;
	trailTimer = maxTrailTimer;

	for( int i = 0; i <= 4; i++ )
	{
			trailArr[i][0] = x;
			trailArr[i][1] = y;
	}

}

void Player::Move( int scrnwdth, int scrnhght, DATAFILE * s_samples )
{
    if( alive )
    {

	ControlTrail(); // CONTROL THE TRAIL PARTICLES

    if( key[KEY_ESC] )
    {
         alive = false;
         PlayBubbleDieSample( s_samples );
    }

    Update_anim_frame(); // UPDATE THE ANIMATION FRAME

    y += velocity_y;
    x += velocity_x;

    if( key[KEY_SPACE] )
    {
        velocity_y -= vel_modifier;

        current_breath_bar -= breath_modifier;
        is_breathing = false;
    }else
    {
        velocity_y += vel_modifier;
        current_breath_bar += breath_modifier;
        is_breathing = true;
    }

    if( key[KEY_LEFT] )
    {
        velocity_x -= vel_modifier;
    }else if( key[KEY_RIGHT] )
    {
        velocity_x += vel_modifier;
    }else
    {
        if( velocity_x > 0 )
        velocity_x -= friction_x;
        else if( velocity_x  < 0 )
        velocity_x += friction_x;
    }

	// CONTROL THE BREATH
    if( current_breath_bar > max_breath_bar )
    current_breath_bar = max_breath_bar;
    if( current_breath_bar < 0 )
    {
        alive = false;
        PlayBubbleDieSample( s_samples );
    }

	// PLAYER BOUNCES OFF THE WALLS
    if( x < 100 + 32 + bubbles_collected*10 )
    {
        x = 100 + 32 + bubbles_collected*10;
        velocity_x = velocity_x/-2;
    }
    if( x > scrnwdth - 32 - bubbles_collected*10 )
    {
         x = scrnwdth - 32 - bubbles_collected*10;
         velocity_x = velocity_x/-2;
    }

	// PLAYER DIES WHEN TOUCHING THE FOOR OR THE CEILING
    if( y < 20 + 32 + bubbles_collected*10 || y > scrnhght - 20 - 32 - bubbles_collected*10 )
    {
        alive = false;
        PlayBubbleDieSample( s_samples );
    }

    }

}

void Player::CollideWith_Evil_Bubble( Evil_bubble * evilBubble, DATAFILE * s_samples )
{
    if( alive )
    {

    long distance = 0;

    int margin_x = evilBubble -> GetX() - x;
    int margin_y = evilBubble -> GetY() - y;

	// THE MARGIN SHOULD BE POSITIVE
    if( margin_x < 0 )
    margin_x *= -1;
    if( margin_y < 0 )
    margin_y *= -1;

    distance = sqrt( pow( margin_x, 2 ) + pow( margin_y, 2 ) ); // THE DISTANCE BETWEEN THE CENTRES OF THE PLAYER AND THE EVILBUBBLE 

	// IF THE DISTANCE BETWEEN THEIR CENTRES IS SMALLER THAN THE SUM OF THEIR RADII THERE IS A COLLISION
    if( distance < 32 + evilBubble -> Get_bubbles_collected()*10 + 32 + bubbles_collected*10 )
    {
        alive = false;
        PlayBubbleDieSample( s_samples );
    }

    }

}

Player * Player::GetPlayerAddr()
{
    return this;
}

int Player::Get_max_breath()
{
    return max_breath_bar;
}

int Player::Get_current_breath()
{
    return (int)current_breath_bar;
}

bool Player::Get_alive()
{
    return alive;
}

void Player::PlayBubbleDieSample( DATAFILE * s_sample )
{
    play_sample( (SAMPLE*)s_sample[1].dat, 255, 128, 1000, 0 );
}













