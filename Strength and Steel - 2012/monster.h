#ifndef MONSTER_H_INCLUDED
#define MONSTER_H_INCLUDED

#include <string>

#include "npc.h"
#include "unit.h"


class Monster : public Npc
{

    public:
    Monster();
    void SetUp( int giveMonType);
    void Move( int blockSizeL, int mapSizeXL, int mapSizeYL );
    void Draw( DATAFILE * charsprite, BITMAP * bBuffer, int playerXL, int playerYL, int scrnw, int scrnh );
    void Update();
    int * GetActStateAddr();

    //private:
    //int actState;


};


#endif // MONSTER_H_INCLUDED
