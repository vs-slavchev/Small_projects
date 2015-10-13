
#include "player.h"

#define GAME_WIDTH 640
#define GAME_HEIGHT 480
#define BLACK makecol( 0, 0, 0 )

Player::Player()
{

	x = 350;
	y = 20;
	dir = 0;
	anim_frame = 0;
	anim_frame_modifier = 0.3f;
	speed = 2;

	baklava = 0;
	appearance = 0;
	sugarLevel = 0;
	heart = 1;

}

void Player::Move( int direction )
{

	dir = direction;

	switch( dir )
	{
	case 0:
		y += speed;
		anim_frame += anim_frame_modifier;
		break;
	case 3:
		y -= speed;
		anim_frame += anim_frame_modifier;
		break;
	case 1:
		x -= speed;
		anim_frame += anim_frame_modifier;
		break;
	case 2:
		x += speed;
		anim_frame += anim_frame_modifier;
		break;
	default:
		break;
	}

	if( anim_frame > 3.5 )
		anim_frame = 0;

	if( x < 0 )
		x = 0;
	if( y < 0 )
		y = 0;
	if( x > GAME_WIDTH - 32 - 70 )
		x = GAME_WIDTH - 32 - 70;
	if( y > GAME_HEIGHT - 32 )
		y = GAME_HEIGHT - 32;

}

void Player::Draw( BITMAP * playerSpr, BITMAP * buffer )
{

	masked_blit( playerSpr, buffer, appearance*128 + (int)anim_frame*32, dir*32, x, y, 32, 32 );

}

void Player::Update()
{
	colRect.colx = x;
	colRect.coly = y;
	colRect.colw = x+32;
	colRect.colh = y+32;

}

void Player::CollideWBaklava( Baklava * bakl, int * upgradeCountPtr, bool * upgrSeenPtr, bool * doneGameplay, SAMPLE * hurt, SAMPLE * pickUp )
{

	if( CollisionCheck( bakl->GetColRect() ) )
		{
			bakl->Respawn();
			EatBaklava( bakl->GetId(), upgradeCountPtr, upgrSeenPtr, doneGameplay, hurt, pickUp );
		}

}

bool Player::CollisionCheck( ColRectangle baklRect )
{

	if( colRect.colx < baklRect.colw
		&& colRect.colw > baklRect.colx
		&& colRect.coly < baklRect.colh
		&& colRect.colh > baklRect.coly )
		return 1;

		return 0;
}

void Player::DrawInterface( BITMAP * upgradesSpr, FONT * intrFont, BITMAP * buffer  )
{

	rectfill( buffer, 570, 0, 640, 480, makecol( 0, 179, 179 ) );

	char heartCount[16];
	sprintf( heartCount, "Lives: %i", heart);

	char baklCount[16];
	sprintf( baklCount, "%i/60", baklava ); // used to be %i/50

	char sugarCount[16];
	sprintf( sugarCount, "%i/5", sugarLevel );

	textprintf_ex( buffer, intrFont, 570, 3, BLACK, -1, "Upgrades:" );

	textprintf_ex( buffer, intrFont, 572, 220, BLACK, -1, heartCount );

	textprintf_ex( buffer, intrFont, 575, 260, BLACK, -1, "Baklava:" );
	textprintf_ex( buffer, intrFont, 590, 275, BLACK, -1, baklCount );

	textprintf_ex( buffer, intrFont, 575, 310, BLACK, -1, "Sugar:" );
	textprintf_ex( buffer, intrFont, 590, 325, BLACK, -1, sugarCount );


	int drawUpgrdH = baklava/5;
	if( drawUpgrdH > 8 )
		drawUpgrdH =8;
	else if( drawUpgrdH < 0 )
		drawUpgrdH = 0;

	blit( upgradesSpr, buffer, 0, 0, 595, 30, 20, drawUpgrdH*20 );

}

void Player::EatBaklava( int baklavaId, int * upgradeCountPtr, bool * upgrSeenPtr, bool * doneGameplay, SAMPLE * hurt, SAMPLE * pickUp )
{

	int eatBaklavaLvl = 0;

	if( baklava >= 40 )
		eatBaklavaLvl = 4;
	else if( baklava >= 30 )
		eatBaklavaLvl = 3;
	else if( baklava >= 20 )
		eatBaklavaLvl = 2;
	else if( baklava >= 10 )
		eatBaklavaLvl = 1;

	if( baklava >= 59 )
		*doneGameplay = true;

	if( eatBaklavaLvl >= baklavaId )
	{
		baklava++;

		play_sample( pickUp, 255, ((x+2)/650) * 255, 1000, 0);

			if( baklava >= 30 )
				appearance = 3;
			else if( baklava >= 20 )
				appearance = 2;
			else if( baklava >= 10 )
				appearance = 1;
			else
				appearance = 0;

			if( baklava >= 25 )
				speed = 4;
			else if( baklava >= 15 )
				speed = 3;

			if( baklava == 5 )
				heart++;
			else if ( baklava == 35 )
				heart++;

			if( baklava == 5 || baklava == 10 || baklava == 15 || baklava == 20
				|| baklava == 25 || baklava == 30 || baklava == 35 || baklava == 40 )
			{
				*upgradeCountPtr++;
				*upgrSeenPtr = false;
			}

	}
	else
	{
	    sugarLevel += baklavaId - eatBaklavaLvl;
	    play_sample( hurt, 255, ((x+2)/650) * 255, 1000, 0);
	}


	if( sugarLevel >= 5 )
	{
		heart--;
		sugarLevel = 0;
	}

}

int Player::GetUpgradeCount()
{
	return baklava/5;
}

int Player::GetAlive()
{
	return heart;
}
