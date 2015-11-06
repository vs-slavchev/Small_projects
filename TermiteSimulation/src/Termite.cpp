#include <ctime>
#include <cstdlib>
#include <iostream>
#include <allegro5/allegro_primitives.h>

#include "Termite.h"
#include "Terrain.h"

#define RIGHT 0
#define UP 1
#define LEFT 2
#define DOWN 3

Termite::Termite()
{
    x = rand() % Terrain::SCREENWIDTH;
    y = rand() % Terrain::SCREENHEIGHT;
    changeDirection();
}

void Termite::changeDirection()
{
    direction = rand() % 4;
    framesUntillDirectionChange = rand() % 300;
}

void Termite::update(bool ** map)
{
    if (hasPiece)
    {
        switch(direction)
        {
        case RIGHT:
            if (map[x+1][y])
            {
                if (dropPiece(map, x, y))
                {
                    direction = LEFT;
                }
                else if (dropPiece(map, x, y-1))
                {
                    direction = LEFT;
                }
                else if (dropPiece(map, x, y+1))
                {
                    direction = LEFT;
                }
            }
            break;
        case UP:
            if (map[x][y-1])
            {
                if (dropPiece(map, x, y))
                {
                    direction = DOWN;
                }
                else if (dropPiece(map, x-1, y))
                {
                    direction = DOWN;
                }
                else if (dropPiece(map, x+1, y))
                {
                    direction = DOWN;
                }
            }
            break;
        case LEFT:
            if (map[x-1][y])
            {
                if (dropPiece(map, x, y))
                {
                    direction = RIGHT;
                }
                else if (dropPiece(map, x, y-1))
                {
                    direction = RIGHT;
                }
                else if (dropPiece(map, x, y-1))
                {
                    direction = RIGHT;
                }
            }
            break;
        case DOWN:
            if (map[x][y+1])
            {
                if (dropPiece(map, x, y))
                {
                    direction = UP;
                }
                else if (dropPiece(map, x-1, y))
                {
                    direction = UP;
                }
                else if (dropPiece(map, x+1, y))
                {
                    direction = UP;
                }
            }
            break;
        }
    }
    else // if the termite doesn't have a piece
    {
        if (map[x][y])
        {
            map[x][y] = false;
            hasPiece = true;
            changeDirection();
        }
    }
}

bool Termite::dropPiece(bool ** map, int x, int y)
{
    if (!map[x][y])
    {
        map[x][y] = true;
        framesUntillDirectionChange = 10;
        hasPiece = false;
        return true;
    }
    return false;
}

void Termite::move()
{
    if (x <= 1)
    {
        direction = RIGHT;
    }
    else if (x >= Terrain::SCREENWIDTH -2)
    {
        direction = LEFT;
    }
    if (y <= 1)
    {
        direction = DOWN;
    }
    else if (y >= Terrain::SCREENHEIGHT -2)
    {
        direction = UP;
    }

    switch(direction)
    {
    case RIGHT:
        x++;
        break;
    case UP:
        y--;
        break;
    case LEFT:
        x--;
        break;
    case DOWN:
        y++;
        break;
    default:
        break;
    }

    framesUntillDirectionChange--;
    if (framesUntillDirectionChange <= 0)
    {
        changeDirection();
    }
}

void Termite::draw()
{
    // if the termite is holding a piece then its color is red, otherwise green
    ALLEGRO_COLOR color = hasPiece ? al_map_rgb(255, 0, 0) : al_map_rgb(0, 255, 0);
    al_draw_pixel(x, y, color);
}

bool Termite::getHasPiece()
{
    return hasPiece;
}
