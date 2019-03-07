
#include "npc.h"

Rectangle Npc::GetRect()
{
      return colRect;
}

int Npc::GetNpcType()
{
      return npcType;
}

int * Npc::GetAdrDirection()
{
        return &direction;
}

bool Npc::GetNpcActive()
{
    return npcActive;
}











