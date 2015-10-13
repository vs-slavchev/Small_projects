#ifndef BAKLAVA_H_INCLUDED
#define BAKLAVA_H_INCLUDED

#include <allegro.h>

#include <ctime>
#include <cstdlib>

#include "rectangle.h"

class Baklava
{
public:
	Baklava( int giveid );
	void Move();
	void Draw( BITMAP * baklSpr, BITMAP * buffer );
	ColRectangle GetColRect();
	void Respawn();
	void Update();
	int GetId();

protected:
	float x, y;
	int id; // id is related to size and sugarness
	int dir;
	ColRectangle colRect;
	int dir_timer; // after the timer goes off the direction is changed and timer is reset
	float speed; // move speed; bigger baklava moves slower

};

#endif // BAKLAVA_H_INCLUDED
