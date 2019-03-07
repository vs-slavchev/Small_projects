#include <allegro.h>
#include <ctime>
#include <cstdlib>
#include <iostream>
#include <string>

#include "citizen.h"
#include "npc.h"
#include "unit.h"

Citizen::Citizen()
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

void Citizen::SetUp( int giveNpcType)
{

    npcType = giveNpcType;
    switch( npcType )
    {
        case 1:
        x = 55;
        y = 791;
        npcActive = 1;
        break;
        case 2:
        x = 583;
        y = 723;
        npcActive = 1;
        break;
        case 3:
        x = 1216;
        y = 1092;
        npcActive = 1;
        break;
        case 4:
        x = 1293;
        y = 508;
        npcActive = 1;
        break;
        case 5:
        x = 853;
        y = 138;
        npcActive = 1;
        break;
        case 6:
        x = 1238;
        y = 171;
        npcActive = 1;
        break;
        case 7:
        x = 1652;
        y = 814;
        npcActive = 1;
        break;
        case 8:
        x = 1757;
        y = 651;
        npcActive = 1;
        break;
        case 9:
        x = 1736;
        y = 177;
        npcActive = 1;
        break;
        case 11:
        x = 300;
        y = 300;
        npcActive = 1;
        break;
        case 1000:
        x = 400;
        y = 400;
        npcActive = 1;
        break;
        default: // inactive; no actual npc
        x = 0;
        y = 0;
        npcActive = 0;
        break;

    }

}


void Citizen::Move( int blockSizeL, int mapSizeXL, int mapSizeYL )
{

    if( actState == -1 && npcActive ) // can move
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

void Citizen::Update()
{
    if( npcActive )
    {

    colRect.colx = x + 2;
    colRect.coly = y + 1;
    colRect.colw = x + 30;
    colRect.colh = y + 32;

    directionTimer += 0.005f;

    }

}

void Citizen::Draw( DATAFILE * charsprite, BITMAP * bBuffer, int playerXL, int playerYL, int scrnw, int scrnh )
{

    if( npcActive )
    {

    if( ! ( ( x < playerXL - scrnw ) || ( x > playerXL + scrnw ) || ( y < playerYL  - scrnh ) || ( y > playerYL + scrnh ) ) )
    { // if npc is not near the player npc won't be drawn

    if( direction == 4) // npc is standing still
    masked_blit( (BITMAP *)charsprite[npcType - 1].dat, bBuffer, (int)frame * 32, 0 * 32, x, y, 32, 32);
    else
    masked_blit( (BITMAP * )charsprite[npcType - 1].dat, bBuffer, (int)frame * 32, direction * 32, x, y, 32, 32);
    }

    }

}



void Citizen::CollideWNpc( Rectangle colRectNpc, int prevxNpc, int prevyNpc, int * xnpc, int * ynpc )
{

        if( npcActive )
        {

        if( colRect.colx < colRectNpc.colw
       && colRect.colw > colRectNpc.colx
       && colRect.coly < colRectNpc.colh
       && colRect.colh > colRectNpc.coly )
        {

            x = prevx;
            y = prevy;
            *xnpc = prevxNpc;
            *ynpc = prevyNpc;

        }

        }

}

void Citizen::CollideWPlayer( Rectangle colRectPl, Rectangle facingRect, int * xL, int * yL,
                          int prevxL, int prevyL, int * nearbyNpcType, bool * isNearbyNpc,
                          bool * isTalking, int playerDirection )
{

    if( npcActive )
    {

    if( colRectPl.colx - 64 < colRect.colw
       && colRectPl.colw +64 > colRect.colx
       && colRectPl.coly - 64 < colRect.colh
       && colRectPl.colh + 64 > colRect.coly )
    {

        actState = 0;

    } else
        actState = -1;

    if( colRectPl.colx < colRect.colw
       && colRectPl.colw > colRect.colx
       && colRectPl.coly < colRect.colh
       && colRectPl.colh > colRect.coly )
    {

        *xL = prevxL;
        *yL = prevyL;

    }

     if( facingRect.colx < colRect.colw
       && facingRect.colw > colRect.colx
       && facingRect.coly < colRect.colh
       && facingRect.colh > colRect.coly )
       {

            *nearbyNpcType = npcType;
            *isNearbyNpc = true;

            if( *isTalking )
            {

            switch( playerDirection )
                {

                 case 0:
                direction = 3; // npc faces the player
                break;
                 case 1:
                direction = 2; // npc faces the player
                break;
                 case 2:
                direction = 1; // npc faces the player
                break;
                 case 3:
                direction = 0; // npc faces the player
                break;
                 default:
                direction = 0;
                break;

                }

            }

        }
    }

}

int * Citizen::GetActStateAddr()
{
    return &actState;
}









