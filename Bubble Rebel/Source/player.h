#ifndef PLAYER_H_INCLUDED
#define PLAYER_H_INCLUDED

#include "evil_bubble.h"
#include "basic_char.h"

class Player : public Basic_char
{
    public:
    Player();
    void Move( int scrnwdth, int scrnhght, DATAFILE * s_samples );
    void CollideWith_Evil_Bubble( Evil_bubble * evilBubble, DATAFILE * s_samples );
    Player * GetPlayerAddr();
    int Get_max_breath();
    int Get_current_breath();
    bool Get_alive();
    void SetMembers();
    void PlayBubbleDieSample( DATAFILE * s_sample );

    private:
    float velocity_x;
    float velocity_y;
    float vel_modifier;
    int max_breath_bar;
    float current_breath_bar;
    float breath_modifier;
    float friction_x;

};

#endif // PLAYER_H_INCLUDED
