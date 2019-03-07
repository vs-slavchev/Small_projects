#ifndef GAME_ITEM_H_INCLUDED
#define GAME_ITEM_H_INCLUDED

#include <allegro.h>
#include <ctime>
#include <cstdlib>
#include <iostream>
#include <fstream>
#include <string>

class Game_item
{
    public:
    Game_item();
    Game_item( int give_item_type, int give_item_id );
    void SetUpItem();
    void GiveTypeID( int give_item_type, int give_item_id );
    void Draw_icon( BITMAP * buffer, DATAFILE * icon_set, int dest_x, int dest_y );
    void Draw_tooltip( BITMAP * buffer, FONT * interfaceFont, int interfaceX, int interfaceY );
    int ReturnStat( int statNum );


    private:
    char item_name[128];
    int item_type; // 1-10  // num 1
    int item_id; // 1-10    // num 2
    int min_dmg;    //num 3
    int max_dmg;    // num 4
    int bonus_armor;    // num 5
    int bonus_max_health;   // num 6
    int bonus_max_mana;     // num 7
    int bonus_vitality;     // num 8
    int bonus_strength;     // num 9
    int bonus_soul_power;   // num 10
    int bonus_Rprecision;   // num 11

};








#endif // GAME_ITEM_H_INCLUDED
