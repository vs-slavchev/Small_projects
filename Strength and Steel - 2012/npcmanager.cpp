#include <allegro.h>
#include <iostream>

#include "npcmanager.h"
#include "unit.h"
#include "citizen.h"

NpcManager::NpcManager()
{
        for( int i = 0; i < 10; i++ )
        people[i] = 0;
}

void NpcManager::SetUpNpcs( int column, int row )
{
    for( int i = 0; i < 10 ; i++ )
    {
        //if( ( people[i] == 0 ) )
        //{
        people[i] = new Citizen;
        //}

        people[i] -> SetUp( ( ( ( row - 1 )*100 + column*10 ) - 9 ) + i );
    }
}

void NpcManager::DeleteNpcArray()
{
    for( int i = 0; i < 10; i++ )
    {
    delete people[i];
    people[i] = 0;
    }
}

void NpcManager::CollideAndMoveNpcs( int **map, int mapSizeX, int mapSizeY,
                         int blockSize, Rectangle colRectPl, Rectangle facingRect,
                         int * playerx, int * playery, int playerPrevX,
                         int playerPrevY, int * nearbyNpcType,
                         bool * isNerabyNpc, bool * isTalking, int playerDirection,
                         int interfaceX, int interfaceY, int scrnwidth, int scrnheight )
{
    //if( arrActive )
    //{

    for( int i = 0; i < 10; i++ )
    {
        if( people[i] -> GetNpcActive() )
        {

        if( !( ( people[i]->GetX() + blockSize < interfaceX ) || ( people[i]->GetX() > interfaceX + scrnwidth ) ||
           ( people[i]->GetY() + blockSize < interfaceY ) || ( people[i]->GetY() > interfaceY + scrnheight ) ) ) //if npc is not in the screen
        {

        people[i] -> Update();
        people[i] -> TerrainCollision( map, mapSizeX, mapSizeY, blockSize, scrnwidth, scrnheight );
        people[i] -> CollideWPlayer( colRectPl, facingRect, playerx, playery, playerPrevX,
                                    playerPrevY, nearbyNpcType, isNerabyNpc, isTalking, playerDirection );

        for( int j = 0; j < 10; j++ ) // npcs collide with eachother
        {
            if( i != j ) // npc doesn't collide with itself
            people[i] -> CollideWNpc( people[j] -> GetRect(), people[j] -> GetPrevX(),
                        people[j] -> GetPrevY(), people[j] -> GetAdrX(), people[j] -> GetAdrY() );
        }

        people[i] -> Move( blockSize, mapSizeX, mapSizeY );

        }

        //}
        //std::cout<<"end of coll"<<std::endl;
    }

    }

}

void NpcManager::DrawNpcs( DATAFILE * citizenImg, BITMAP * buffer, int playerx, int playery,
                         int width, int heigth )
{
    //if( arrActive )
    //{

        for( int i = 0; i < 10; i++ )
        {
            if( people[i] -> GetNpcActive() )
            {

            people[i] -> Draw( citizenImg, buffer, playerx, playery,
                            width, heigth );
            }
        }

    //}
}

void NpcManager::ChangeMaps( int column, int row )
{

    if( column != prevcolumn || row != prevrow )
    {

    for( int i = 0; i < 10; i++ )
    {

        people[i] -> SetUp( ( ( ( row - 1 )*100 + column*10 ) - 9 ) + i );

    }

    }

    prevcolumn = column;
    prevrow = row;

}












