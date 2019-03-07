#include <allegro.h>
#include <ctime>
#include <cstdlib>
#include <iostream>
#include <string>

#include "game_item.h"

#define BLACK makecol( 0, 0, 0 )
#define BLUE makecol( 0, 0, 255 )
#define TOOLTIP_BORDER 470
#define TEXTBASE_Y 170


Game_item::Game_item()
{
    item_id = 0;
    item_type = 0;
}

Game_item::Game_item( int give_item_type, int give_item_id )
{

    item_id = give_item_id;
    item_type = give_item_type;

    SetUpItem();

}

void Game_item::GiveTypeID( int give_item_type, int give_item_id )
{
    item_id = give_item_id;
    item_type = give_item_type;

    SetUpItem();
}

void Game_item::SetUpItem()
{

    switch( item_type )
    {

        case 1: // SWORD

        switch( item_id )
        {
            case 1:
            sprintf( item_name, "Father's Old Sword" );
            min_dmg = 5;
            max_dmg = 9;
            bonus_max_health = 8;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 3;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 2:
            sprintf( item_name, "Lightwielder the Greatblade" );
            min_dmg = 12;
            max_dmg = 19;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 1;
            bonus_strength = 7;
            bonus_soul_power = 5;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 3:
            sprintf( item_name, "Stormsteel Champion" );
            min_dmg = 23;
            max_dmg = 34;
            bonus_max_health = 0;
            bonus_max_mana = 18;
            bonus_vitality = 0;
            bonus_strength = 12;
            bonus_soul_power = 0;
            bonus_Rprecision = 8;
            bonus_armor = 0;
            break;

            case 4:
            sprintf( item_name, "Yani's Blessed Scimitar of Justice" );
            min_dmg = 39;
            max_dmg = 55;
            bonus_max_health = 0;
            bonus_max_mana = 31;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 12;
            bonus_Rprecision = 16;
            bonus_armor = 0;
            break;

            case 5:
            sprintf( item_name, "Broadsword of the Mountain Giant" );
            min_dmg = 57;
            max_dmg = 76;
            bonus_max_health = 42;
            bonus_max_mana = 0;
            bonus_vitality = 2;
            bonus_strength = 16;
            bonus_soul_power = -11;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 6:
            sprintf( item_name, "Razor's Will" );
            min_dmg = 82;
            max_dmg = 101;
            bonus_max_health = 47;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 13;
            bonus_soul_power = 0;
            bonus_Rprecision = 28;
            bonus_armor = 0;
            break;

            case 7:
            sprintf( item_name, "Hungering Soulblade of the Serpentrider" );
            min_dmg = 103;
            max_dmg = 134;
            bonus_max_health = 12;
            bonus_max_mana = 59;
            bonus_vitality = -1;
            bonus_strength = 24;
            bonus_soul_power = 8;
            bonus_Rprecision = 6;
            bonus_armor = 0;
            break;

            case 8:
            sprintf( item_name, "Claymore of Lunar Purity" );
            min_dmg = 142;
            max_dmg = 181;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 2;
            bonus_strength = 25;
            bonus_soul_power = 38;
            bonus_Rprecision = -3;
            bonus_armor = 0;
            break;

            case 9:
            sprintf( item_name, "Deathwielder the Runeblade" );
            min_dmg = 190;
            max_dmg = 238;
            bonus_max_health = 61;
            bonus_max_mana = 55;
            bonus_vitality = 0;
            bonus_strength = 37;
            bonus_soul_power = 0;
            bonus_Rprecision = 22;
            bonus_armor = 0;
            break;

            case 10:
            sprintf( item_name, "Angelic Greatsword of Divinity" );
            min_dmg = 256;
            max_dmg = 312;
            bonus_max_health = 32;
            bonus_max_mana = 100;
            bonus_vitality = 2;
            bonus_strength = 50;
            bonus_soul_power = 34;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            default:
            sprintf( item_name, "Strange Item" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

        }
    break;

    case 2: // AXE

        switch( item_id )
        {
            case 1:
            sprintf( item_name, "Woodchopper" );
            min_dmg = 6;
            max_dmg = 8;
            bonus_max_health = 7;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 4;
            bonus_armor = 0;
            break;

            case 2:
            sprintf( item_name, "Vengeful Broadaxe" );
            min_dmg = 13;
            max_dmg = 18;
            bonus_max_health = 0;
            bonus_max_mana = 14;
            bonus_vitality = 0;
            bonus_strength = 3;
            bonus_soul_power = 8;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 3:
            sprintf( item_name, "Crystalforged Beheader" );
            min_dmg = 24;
            max_dmg = 32;
            bonus_max_health = 26;
            bonus_max_mana = 5;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 13;
            bonus_armor = 0;
            break;

            case 4:
            sprintf( item_name, "Cleaver of Memories" );
            min_dmg = 42;
            max_dmg = 52;
            bonus_max_health = 15;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 18;
            bonus_soul_power = 0;
            bonus_Rprecision = 6;
            bonus_armor = 0;
            break;

            case 5:
            sprintf( item_name, "Flamethorn Bladebreaker" );
            min_dmg = 61;
            max_dmg = 72;
            bonus_max_health = 23;
            bonus_max_mana = 0;
            bonus_vitality = 1;
            bonus_strength = 9;
            bonus_soul_power = 19;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 6:
            sprintf( item_name, "Decapitator of Betrayal" );
            min_dmg = 87;
            max_dmg = 96;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 21;
            bonus_soul_power = 0;
            bonus_Rprecision = 21;
            bonus_armor = 0;
            break;

            case 7:
            sprintf( item_name, "Abyss Sunderer" );
            min_dmg = 109;
            max_dmg = 128;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 15;
            bonus_soul_power = 0;
            bonus_Rprecision = 32;
            bonus_armor = 0;
            break;

            case 8:
            sprintf( item_name, "Dragon Protector Reaver" );
            min_dmg = 148;
            max_dmg = 175;
            bonus_max_health = 60;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 39;
            bonus_soul_power = 0;
            bonus_Rprecision = 27;
            bonus_armor = 0;
            break;

            case 9:
            sprintf( item_name, "Retaliator of Unholy Might" );
            min_dmg = 201;
            max_dmg = 227;
            bonus_max_health = 0;
            bonus_max_mana = 21;
            bonus_vitality = 0;
            bonus_strength = 26;
            bonus_soul_power = 0;
            bonus_Rprecision = 45;
            bonus_armor = 0;
            break;

            case 10:
            sprintf( item_name, "Hris the Honed Battleaxe" );
            min_dmg = 269;
            max_dmg = 299;
            bonus_max_health = 100;
            bonus_max_mana = 0;
            bonus_vitality = 2;
            bonus_strength = 0;
            bonus_soul_power = 23;
            bonus_Rprecision = 50;
            bonus_armor = 0;
            break;

            default:
            sprintf( item_name, "Strange Item" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

        }
    break;

    case 3: // MISC

        switch( item_id )
        {
            case 1:
            sprintf( item_name, "Mace of Folorn Visions" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 2:
            sprintf( item_name, "Snakebite the Cursed Hexblade" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 3:
            sprintf( item_name, "Greatstaff of the Lizard" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 4:
            sprintf( item_name, "Searing Whip" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 5:
            sprintf( item_name, "Prowler Claws" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 6:
            sprintf( item_name, "Thunderlord Trident" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 7:
            sprintf( item_name, "Wicked Sacrificial Dagger" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 8:
            sprintf( item_name, "The Dragon Staff" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 9:
            sprintf( item_name, "Smasher of Howling Agony" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 10:
            sprintf( item_name, "Avelp's Lightforged Warhammer" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            default:
            sprintf( item_name, "Strange Item" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

        }
    break;

    case 4: // BOW

        switch( item_id )
        {
            case 1:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 2:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 3:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 4:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 5:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 6:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 7:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 8:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 9:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 10:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            default:
            sprintf( item_name, "Strange Item" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

        }
    break;

    case 5: // HELM

        switch( item_id )
        {
            case 1:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 2:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 3:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 4:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 5:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 6:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 7:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 8:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 9:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 10:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            default:
            sprintf( item_name, "Strange Item" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

        }
    break;

    case 6: // CHESTPIECE

        switch( item_id )
        {
            case 1:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 2:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 3:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 4:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 5:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 6:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 7:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 8:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 9:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 10:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            default:
            sprintf( item_name, "Strange Item" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

        }
    break;

    case 7: // GLOVES

        switch( item_id )
        {
            case 1:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 2:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 3:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 4:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 5:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 6:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 7:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 8:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 9:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 10:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            default:
            sprintf( item_name, "Strange Item" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

        }
    break;

    case 8: // BOOTS

        switch( item_id )
        {
            case 1:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 2:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 3:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 4:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 5:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 6:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 7:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 8:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 9:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 10:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            default:
            sprintf( item_name, "Strange Item" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

        }
    break;

    case 9: // CONSUMABLE

        switch( item_id )
        {
            case 1:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 2:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 3:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 4:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 5:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 6:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 7:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 8:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 9:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 10:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            default:
            sprintf( item_name, "Strange Item" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

        }
    break;

    case 10: // QUEST ITEM

        switch( item_id )
        {
            case 1:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 2:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 3:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 4:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 5:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 6:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 7:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 8:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 9:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            case 10:
            sprintf( item_name, "Empty" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

            default:
            sprintf( item_name, "Strange Item" );
            min_dmg = 0;
            max_dmg = 0;
            bonus_max_health = 0;
            bonus_max_mana = 0;
            bonus_vitality = 0;
            bonus_strength = 0;
            bonus_soul_power = 0;
            bonus_Rprecision = 0;
            bonus_armor = 0;
            break;

        }
    break;

    default: // UNKNOWN TYPE
    break;



    break;

    } // END OF 1ST SWITCH

}

void Game_item::Draw_icon( BITMAP * buffer, DATAFILE * icon_set, int dest_x, int dest_y )
{
    if( item_type != 0 && item_id != 0 )
    blit( (BITMAP*)icon_set[5].dat, buffer, (item_id-1)*26, (item_type-1)*26, dest_x, dest_y, 26, 26 );

}

void Game_item::Draw_tooltip( BITMAP * buffer, FONT * interfaceFont, int interfaceX, int interfaceY )
{
    if( item_type != 0 && item_id != 0 )
    {

    char itemTypeName[64];
    switch( item_type )
    {
        case 1:
        sprintf( itemTypeName, "Sword" );
        break;
        case 2:
        sprintf( itemTypeName, "Axe" );
        break;
        case 3:
        sprintf( itemTypeName, "Miscellaneous weapon" );
        break;
        case 4:
        sprintf( itemTypeName, "Bow" );
        break;
        case 5:
        sprintf( itemTypeName, "Helm" );
        break;
        case 6:
        sprintf( itemTypeName, "Chestpiece" );
        break;
        case 7:
        sprintf( itemTypeName, "Gloves" );
        break;
        case 8:
        sprintf( itemTypeName, "Boots" );
        break;
        case 9:
        sprintf( itemTypeName, "Consumable" );
        break;
        case 10:
        sprintf( itemTypeName, "Quest tem" );
        break;
        default:
        sprintf( itemTypeName, "Unknown" );
        break;
    }

    textprintf_ex( buffer, interfaceFont, interfaceX + TOOLTIP_BORDER, interfaceY + TEXTBASE_Y-25, BLUE, -1, item_name );
    textprintf_ex( buffer, interfaceFont, interfaceX + TOOLTIP_BORDER, interfaceY + TEXTBASE_Y, BLACK, -1, itemTypeName );

    if( bonus_armor != 0 )
    textprintf_ex( buffer, interfaceFont, interfaceX + TOOLTIP_BORDER, interfaceY + TEXTBASE_Y+20, BLACK, -1, "Armor: %i", bonus_armor );
    else
    textprintf_ex( buffer, interfaceFont, interfaceX + TOOLTIP_BORDER, interfaceY + TEXTBASE_Y+20, BLACK, -1, "Damage: %i - %i", min_dmg, max_dmg );

    short lineCounter = 0;
    if( bonus_max_health != 0 )
    {
        textprintf_ex( buffer, interfaceFont, interfaceX + TOOLTIP_BORDER, interfaceY + TEXTBASE_Y+40 + 20*lineCounter, BLACK, -1, "Health: %i", bonus_max_health );
        lineCounter++;
    }
    if( bonus_max_mana != 0 )
    {
        textprintf_ex( buffer, interfaceFont, interfaceX + TOOLTIP_BORDER, interfaceY + TEXTBASE_Y+40 + 20*lineCounter, BLACK, -1, "Mana: %i", bonus_max_mana );
        lineCounter++;
    }
    if( bonus_vitality != 0 )
    {
        textprintf_ex( buffer, interfaceFont, interfaceX + TOOLTIP_BORDER, interfaceY + TEXTBASE_Y+40 + 20*lineCounter, BLACK, -1, "Vitality: %i", bonus_vitality );
        lineCounter++;
    }
    if( bonus_strength != 0 )
    {
        textprintf_ex( buffer, interfaceFont, interfaceX + TOOLTIP_BORDER, interfaceY + TEXTBASE_Y+40 + 20*lineCounter, BLACK, -1, "Strength: %i", bonus_strength );
        lineCounter++;
    }
    if( bonus_soul_power != 0 )
    {
        textprintf_ex( buffer, interfaceFont, interfaceX + TOOLTIP_BORDER, interfaceY + TEXTBASE_Y+40 + 20*lineCounter, BLACK, -1, "Soul power: %i", bonus_soul_power );
        lineCounter++;
    }
    if( bonus_Rprecision != 0 )
    {
        textprintf_ex( buffer, interfaceFont, interfaceX + TOOLTIP_BORDER, interfaceY + TEXTBASE_Y+40 + 20*lineCounter, BLACK, -1, "Precision: %i", bonus_Rprecision );
        lineCounter++;
    }

    }
}

int Game_item::ReturnStat( int statNum )
{

    switch( statNum )
    {
        case 1:
        return item_type;
        break;
        case 2:
        return item_id;
        break;
        case 3:
        return min_dmg;
        break;
        case 4:
        return max_dmg;
        break;
        case 5:
        return bonus_armor;
        break;
        case 6:
        return bonus_max_health;
        break;
        case 7:
        return bonus_max_mana;
        break;
        case 8:
        return bonus_vitality;
        break;
        case 9:
        return bonus_strength;
        break;
        case 10:
        return bonus_soul_power;
        break;
        case 11:
        return bonus_Rprecision;
        break;
        default:
        return 0;
        break;
    }

}







