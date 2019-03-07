#ifndef CITIZEN_H_INCLUDED
#define CITIZEN_H_INCLUDED

#include <string>

#include "npc.h"
#include "unit.h"


class Citizen : public Npc
{

    public:
    Citizen();
    void SetUp( int giveNpcType);
    void Move( int blockSizeL, int mapSizeXL, int mapSizeYL );
    void Draw( DATAFILE * charsprite, BITMAP * bBuffer, int playerXL, int playerYL, int scrnw, int scrnh );
    void Update();
    void CollideWNpc( Rectangle colRectNpc, int prevxNpc, int prevyNpc, int * xnpc, int * ynpc );
    void CollideWPlayer( Rectangle colRectPl, Rectangle facingRect, int * xL, int * yL,
                          int prevxL, int prevyL, int * nearbyNpcType, bool * isNearbyNpc,
                          bool * isTalking, int playerDirection );
    int * GetActStateAddr();

    //private:
    //int actState;


};







#endif // CITIZEN_H_INCLUDED
