#ifndef NPC_H_INCLUDED
#define NPC_H_INCLUDED

#include <allegro.h>
#include "rectangle.h"
#include "unit.h"

class Npc : public Unit
{

    public:
    Rectangle GetRect();
    int GetNpcType();
    int * GetAdrDirection();
    bool GetNpcActive();


    protected:
    int direction;
    float frame;
    float directionTimer;
    int npcType;
    int actState;
    bool npcActive;

};

#endif // NPC_H_INCLUDED
