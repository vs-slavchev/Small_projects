#ifndef BASIC_CHAR_H_INCLUDED
#define BASIC_CHAR_H_INCLUDED

#include <allegro.h>
#include "bubble.h"

class Basic_char
{
    public:
    void Draw( DATAFILE * sprites, BITMAP * buffer );
    void Update_anim_frame();
    void CollideWithBubble( Bubble * bubble, int scrnwdth, int scrnhght, DATAFILE * pop );
    int GetX();
    int GetY();
    int Get_bubbles_collected();
	void ControlTrail();
	void DrawTrail( BITMAP * buffer );

    protected:
    float x;
    float y;
    float anim_frame;
    bool is_breathing;
    int bubbles_collected;
    int circle_color;
    bool alive;
	int trailArr[5][2];
	float trailTimer;
	float maxTrailTimer;

};

#endif // BASIC_CHAR_H_INCLUDED
