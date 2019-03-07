#ifndef NPCMANAGER_H_INCLUDED
#define NPCMANAGER_H_INCLUDED

#include <allegro.h>
#include "citizen.h"
#include "rectangle.h"

class NpcManager
{
    public:
    NpcManager();
    void DeleteNpcArray();
    void SetUpNpcs( int column, int row );
    void CollideAndMoveNpcs(int **map, int mapSizeX, int mapSizeY,
                            int blockSize, Rectangle colRectPl, Rectangle facingRect,
                            int * playerx, int * playery, int playerPrevX,
                            int playerPrevY, int * nearbyNpcType,
                            bool * isNerabyNpc, bool * isTalking, int playerDirection,
                            int interfaceX, int interfaceY , int scrnwidth, int scrnheight );
    void DrawNpcs( DATAFILE * citizenImg, BITMAP * buffer, int playerx, int playery,
                    int width, int heigth );
    void ChangeMaps( int column, int row );


    private:
    Citizen * people[10];
    //bool arrActive;
    int prevcolumn;
    int prevrow;


};








#endif // NPCMANAGER_H_INCLUDED

