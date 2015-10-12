#ifndef BUBBLE_H_INCLUDED
#define BUBBLE_H_INCLUDED

#include <allegro.h>

class Bubble
{
    public:
    Bubble( int give_x, int give_y );
    void Respawn( int scrnwdth, int scrnhght );
    void Draw( DATAFILE * playerSprites, BITMAP * buffer );
    Bubble * GetBubbleAddr();
    void Move( int scrnhght );
    int GetX();
    int GetY();



    private:
    int x;
    float y;
    float y_modifier;
    int bubble_type; // 0 - 2





};

#endif // BUBBLE_H_INCLUDED
