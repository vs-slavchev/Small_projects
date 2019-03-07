#include <allegro.h>
#include <ctime>
#include <cstdlib>
#include <iostream>
#include <string>

#include "monster.h"
#include "npc.h"
#include "unit.h"

Monster::Monster()
{

    x = 0;
    y = 0;
    prevx = 0;
    prevy = 0;
    direction = 2;
    frame = 2;
    directionTimer = 0;
    srand( time(0) );
    npcType = 0;
    actState = -1; //can move

}

void Monster::SetUp( int giveMonType)
{

    npcType = giveMonType;

    x = npcType * 50;
    y = npcType * 50;

    /* switch( npcType )
    {
        case 1:
        x = 55;
        y = 791;
        break;
        case 2:
        x = 583;
        y = 723;
        break;
        case 3:
        x = 1216;
        y = 1092;
        break;
        case 4:
        x = 1293;
        y = 508;
        break;
        case 5:
        x = 853;
        y = 138;
        break;
        case 6:
        x = 1238;
        y = 171;
        break;
        case 7:
        x = 1652;
        y = 814;
        break;
        case 8:
        x = 1757;
        y = 651;
        break;
        case 9:
        x = 1736;
        y = 177;
        break;
        case 10:
        x = 297;
        y = 104;
        break;
        default:
        x = 50;
        y = 50;
        break;



    } */


}


void Monster::Move( int blockSizeL, int mapSizeXL, int mapSizeYL )
{

    if( actState == -1 ) // can move
    {

    prevx = x;
    prevy = y;

    if( directionTimer > 2 )
    {

     direction = rand() % 5;
     directionTimer = 0;

    }

    switch( direction )
    {

        case 0:
        y++;
        frame += 0.08f;
        if( frame > 2.5 )
        frame = 0;
        break;
        case 1:
        x--;
        frame += 0.08f;
        if( frame > 2.5 )
        frame = 0;
        break;
        case 2:
        x++;
        frame += 0.08f;
        if( frame > 2.5 )
        frame = 0;
        break;
        case 3:
        y--;
        frame += 0.08f;
        if( frame > 2.5 )
        frame = 0;
        break;
        case 4:
        frame = 1;
        break;
        default: // case 4
        frame = 1;
        break;

    }

    if( x < 0 )
    x = 0;
    if( y < 0 )
    y = 0;
    if( x > ( mapSizeXL * blockSizeL - 32 ) )
    x = ( mapSizeXL * blockSizeL - 32 );
     if( y > ( mapSizeYL * blockSizeL - 32 ) )
    y = ( mapSizeYL * blockSizeL - 32 );
    }
}

void Monster::Update()
{

    colRect.colx = x + 2;
    colRect.coly = y + 1;
    colRect.colw = x + 30;
    colRect.colh = y + 32;

    directionTimer += 0.008f;

}

void Monster::Draw( DATAFILE * charsprite, BITMAP * bBuffer, int playerXL, int playerYL, int scrnw, int scrnh )
{
    if( ! ( ( x < playerXL - scrnw ) || ( x > playerXL + scrnw ) || ( y < playerYL  - scrnh ) || ( y > playerYL + scrnh ) ) )
    { // if npc is not near the player npc won't be drawn

    if( direction == 4) // npc is standing still
    masked_blit( (BITMAP *)charsprite[npcType - 1].dat, bBuffer, (int)frame * 32, 0 * 32, x, y, 32, 32);
    else
    masked_blit( (BITMAP * )charsprite[npcType - 1].dat, bBuffer, (int)frame * 32, direction * 32, x, y, 32, 32);
    }

}

int * Monster::GetActStateAddr()
{
    return &actState;
}


