#ifndef PLAYER_H_INCLUDED
#define PLAYER_H_INCLUDED

#include <allegro.h>
#include <cstdio>

#include "rectangle.h"
#include "baklava.h"

class Player
{
public:
	Player();
	void Move( int direction );
	void Draw( BITMAP * playerSpr, BITMAP * buffer );
	void Update();
	void CollideWBaklava( Baklava * bakl, int * upgradeCountPtr, bool * upgrSeenPtr, bool * doneGameplay, SAMPLE * hurt, SAMPLE * pickUp );
	bool CollisionCheck( ColRectangle baklRect );
	void DrawInterface( BITMAP * upgradesSpr, FONT * intrFont, BITMAP * buffer );
	void EatBaklava( int baklavaId, int * upgradeCountPtr, bool * upgrSeenPtr, bool * doneGameplay, SAMPLE * hurt, SAMPLE * pickUp );
	int GetUpgradeCount();
	int GetAlive();

private:
	float x;
	float y;
	int dir; // direction
	float anim_frame;
	float anim_frame_modifier; // the number to be added to anim_frame
	float speed; // move speed
	ColRectangle colRect;

	int baklava; // the number of collected baklavas
	int appearance; // with moustache, fez, red shirt or none
	int sugarLevel;
	int heart; // lives


};

#endif // PLAYER_H_INCLUDED
