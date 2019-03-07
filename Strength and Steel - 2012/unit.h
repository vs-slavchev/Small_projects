#ifndef UNIT_H_INCLUDED
#define UNIT_H_INCLUDED

#include <string>
#include "rectangle.h"

class Unit
{
    public:
    Unit();
    void TerrainCollision( int **map, int mapSizeX, int mapSizeY, int blockSize,
                            int screenwidth, int screenheight );
    int GetX();
    int GetY();
    int * GetAdrX();
    int * GetAdrY();
    int GetPrevX();
    int GetPrevY();






    protected:
    int x;
    int y;
    int prevx;
    int prevy;
    Rectangle colRect;


};








#endif // UNIT_H_INCLUDED
