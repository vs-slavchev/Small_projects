#include <allegro5/allegro_primitives.h>

#include "Terrain.h"

Terrain::Terrain()
{
    map = new bool * [SCREENWIDTH];
    for (int i = 0; i < SCREENWIDTH; ++i)
    {
        map[i] = new bool [SCREENHEIGHT];
    }

    for (int i = 0; i < SCREENWIDTH; i++)
    {
        for (int j = 0; j < SCREENHEIGHT; j++)
        {
            map[i][j] = false;
        }
    }
    int x, y;
    for (int k = NUMBER_WOOD; k > 0; k--)
    {
        do
        {
            x = 1 + rand() % (Terrain::SCREENWIDTH -2);
            y = 1 + rand() % (Terrain::SCREENHEIGHT -2);
        }
        while (map[x][y] == true);
        map[x][y] = true;
    }
}

Terrain::~Terrain()
{
    for (int i = 0; i < SCREENHEIGHT; ++i)
    {
        delete [] map[i];
    }
    delete [] map;
}

int Terrain::countPieces()
{
    int result = 0;
    for (int i = 0; i < SCREENWIDTH; i++)
    {
        for (int j = 0; j < SCREENHEIGHT; j++)
        {
            if (map[i][j])
            {
                result++;
            }
        }
    }
    return result;
}

void Terrain::drawMap()
{
    for (int i = 0; i < SCREENWIDTH; i++)
    {
        for (int j = 0; j < SCREENHEIGHT; j++)
        {
            if (map[i][j])
            {
                al_draw_pixel(i, j, al_map_rgb(255, 255, 0));
            }
        }
    }
}

bool ** Terrain::getMap()
{
    return map;
}
