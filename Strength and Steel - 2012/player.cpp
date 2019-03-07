
#include <allegro.h>
#include <iostream>

#include "player.h"
#include "rectangle.h"
#include "projectile.h"
#include "unit.h"

#define BLACK makecol( 0, 0, 0 )
#define WHITE makecol( 255, 255, 255 )


Player::Player()
{

    x = 640;
    y = 480;
    frame = 2;
    direction = 2;

}

Player::Player(int givex, int givey, int givedir, int giveframe)
{

    x = givex;
    y = givey;
    direction = givedir;
    frame = giveframe;
    maxhealth = 150;
    maxmana = 150;
    health = 100;
    mana = 100;
    movementSpeed = 1;
    vitality = 2;
    sprintBuffTimer = 0;
    sprintOn = false;
    level = 1;
    experience = 0;
    strength = 15;
    soulpower = 15;
    Rprecision = 15;
    armor = 5;
    gold = 20;
    inventoryActive = false;
    talentsActive = false;
    statsActive = false;
    isTalking = false;
    isNearbyNpc = false;
    abilityCD = 0;
    waitForCD = false;
    projectileInstance = 0;

    CreateInventory();

}

void Player::Move( int blockSizeL, int mapSizeXL, int mapSizeYL )
{

    if( !isTalking )
    {

        prevx = x;
        prevy = y;

    if( key[KEY_UP] || key[KEY_DOWN] || key[KEY_LEFT] || key[KEY_RIGHT])
    {

    frame += 0.08f;
    if( frame > 2.5 )
    frame = 0;

    if( key[KEY_UP] )
    {

        direction = 3;
        y -= movementSpeed;

    }else if( key[KEY_DOWN] )
    {

        direction = 0;
        y += movementSpeed;

    }

    if( key[KEY_LEFT] )
    {

        direction = 1;
        x -= movementSpeed;

    }else if( key[KEY_RIGHT] )
    {

        direction = 2;
        x += movementSpeed;

    }

    }

    if( x < -1 )
    x = -1;
    if( y < -1 )
    y = -1;
    if( x > ( mapSizeXL * blockSizeL - 31 ) )
    x = ( mapSizeXL * blockSizeL - 31 );
     if( y > ( mapSizeYL * blockSizeL - 31 ) )
    y = ( mapSizeYL * blockSizeL - 31 );


    }
   }

void Player::Draw( DATAFILE * charsprite, BITMAP * bBuffer)
{

    masked_blit( ( BITMAP * )charsprite[1].dat, bBuffer, (int)frame * 32, direction * 32, x, y, 32, 32);
    //rect( bBuffer, facingRect.colx, facingRect.coly, facingRect.colw, facingRect.colh, makecol( 255, 0, 0 ));

}

void Player::UpdateColRect()
{

      UpdateStats();

      colRect.colx = x;
      colRect.coly = y;
      colRect.colw = x + 32;
      colRect.colh = y + 33;

      switch( direction )
      {
          case 0:
      facingRect.colx = x + 10;
      facingRect.coly = y + 33;
      facingRect.colw = x + 22;
      facingRect.colh = y + 65;
      break;
                case 1:
      facingRect.colx = x - 32;
      facingRect.coly = y + 10;
      facingRect.colw = x - 1;
      facingRect.colh = y + 22;
      break;
                case 2:
      facingRect.colx = x + 33;
      facingRect.coly = y + 10;
      facingRect.colw = x + 65;
      facingRect.colh = y + 22;
      break;
                case 3:
      facingRect.colx = x + 10;
      facingRect.coly = y - 33;
      facingRect.colw = x + 22;
      facingRect.colh = y -1;
      break;
                default:
      break;
      }

//==========for interface======
      hpBarPos = ( ( health / maxhealth ) *177 );
      mpBarPos = ( ( mana / maxmana ) *177 );

//==========for sprint=========
      if( sprintOn )
      {

           sprintBuffTimer += 0.005f;
           movementSpeed = 2;

      } else
      movementSpeed = 1;

    if( sprintBuffTimer > 3 )
    sprintOn = false;

//=========for leveling up=========
    if( experience >= ( level * 150 ) )
    {

        experience -= ( level * 150 );
        level++;

    }

    if( nearbyNpcType == 0 && isTalking )
    isTalking = false;

    isNearbyNpc = false;

}

  Rectangle Player::GetRect()
  {
      return colRect;
  }

  Rectangle Player::GetFacingRect()
  {
      return facingRect;
  }

  int Player::GetInterfaceX()
  {
      return interfaceX;
  }

  int Player::GetInterfaceY()
  {
      return interfaceY;
  }

  int Player::GetDirection()
  {
      return direction;
  }
  bool * Player::GetIsTalkingAddr()
  {
      return &isTalking;
  }
  bool * Player::GetIsNearbyNpcAddr()
  {
      return &isNearbyNpc;
  }
  int * Player::GetNearbyNpcTypeAddr()
  {
      return &nearbyNpcType;
  }

void Player::DrawInterface( BITMAP * bBuffer, DATAFILE * spr_interfaceL,
                              int scrnw, int scrnh, int blockSizeL, int mapSizeXL, int mapSizeYL, FONT * interfaceFontL,
                               int mouseX, int mouseY )
{

      interfaceX = x - ( scrnw / 2 );
      interfaceY = y - (scrnh / 2 );

        if( interfaceX < 0 )
        interfaceX = 0;
        if( interfaceY < 0 )
        interfaceY = 0;

        if( interfaceX > ( mapSizeXL * blockSizeL - scrnw))
        interfaceX = mapSizeXL * blockSizeL - scrnw;
        if( interfaceY > ( mapSizeYL * blockSizeL - scrnh))
        interfaceY = mapSizeYL * blockSizeL - scrnh;

        masked_blit( (BITMAP * )spr_interfaceL[4].dat, bBuffer, 0, 0, interfaceX, interfaceY, 256, 116);

        masked_blit( (BITMAP * )spr_interfaceL[0].dat, bBuffer, 0, 0, ( interfaceX + 76 ), ( interfaceY + 24 ), (int)hpBarPos, 14);
        masked_blit( (BITMAP * )spr_interfaceL[1].dat, bBuffer, 0, 0, ( interfaceX + 77 ), ( interfaceY + 83 ), (int)mpBarPos, 14);
        rectfill( bBuffer, interfaceX + 20, interfaceY + scrnh - 30, interfaceX + 20 + ( experience / ( level  * 150 ) ) * ( scrnw - 40 ), interfaceY + scrnh - 10, makecol(181, 39, 216) );
        rect( bBuffer, interfaceX + 20, interfaceY + scrnh - 30, interfaceX + scrnw - 20, interfaceY + scrnh - 10, BLACK );

        textprintf_centre_ex( bBuffer, interfaceFontL, (interfaceX + 164 ), ( interfaceY + 20 ), BLACK, -1, "%i/%i", (int)health, (int)maxhealth );
        textprintf_centre_ex( bBuffer, interfaceFontL, (interfaceX + 165 ), ( interfaceY + 79 ), BLACK, -1, "%i/%i", (int)mana, (int)maxmana );
        textprintf_centre_ex( bBuffer, interfaceFontL, (interfaceX + scrnw / 2 ), ( interfaceY + scrnh - 30 ), BLACK, -1, "%i/%i", (int)experience, (int)( level * 150 ) );

    if( inventoryActive || statsActive || talentsActive )
    {

    rectfill( bBuffer, interfaceX + 100, interfaceY + 100, interfaceX + scrnw - 100, interfaceY + scrnh - 100, makecol( 192, 192, 192 ));
    rect( bBuffer, interfaceX + 105, interfaceY + 105, interfaceX + scrnw - 105, interfaceY + scrnh - 105, makecol( 132, 132, 132 ));

    }

    if( inventoryActive )
    {

       DrawInventory( bBuffer, interfaceFontL, mouseX + interfaceX, mouseY + interfaceY, spr_interfaceL );

    }
    else if( statsActive )
    {

        textprintf_centre_ex( bBuffer, interfaceFontL, interfaceX + scrnw / 2, interfaceY + 120, makecol( 0, 0, 0 ), -1, "Quest log? Map?");

    }
    else if( talentsActive )
    {

        textprintf_centre_ex( bBuffer, interfaceFontL, interfaceX + scrnw / 2, interfaceY + 130, makecol( 0, 0, 0 ), -1, "TALENTS");

    }
    else if( isTalking && nearbyNpcType != 0 )
    {

        rectfill( bBuffer, interfaceX + 100, interfaceY + 400, interfaceX + scrnw - 100, interfaceY + scrnh - 50, makecol( 192, 192, 192 ));
        rect( bBuffer, interfaceX + 105, interfaceY + 405, interfaceX + scrnw - 105, interfaceY + scrnh - 55, makecol( 132, 132, 132 ));
        switch( nearbyNpcType )
        {
          case 1:
        textprintf_ex( bBuffer, interfaceFontL, interfaceX + 120, interfaceY + 410, BLACK, -1, "Grizwald: Hello! My name is Grizwald! I used ");
        textprintf_ex( bBuffer, interfaceFontL, interfaceX + 120, interfaceY + 430, BLACK, -1, "to be an adventurer like you... ah you know it, don't you?");
           break;
           case 2:
        textprintf_ex( bBuffer, interfaceFontL, interfaceX + 120, interfaceY + 410, BLACK, -1, "Enoch: Hello! I'm Enoch, the keeper of the templar's castle!");
        textprintf_ex( bBuffer, interfaceFontL, interfaceX + 120, interfaceY + 430, BLACK, -1, "Have you seen a pale-faced man? They call him Israphel.");
        textprintf_ex( bBuffer, interfaceFontL, interfaceX + 120, interfaceY + 450, BLACK, -1, "Hugs and kisses.   -Enoch");
            break;
            case 3:
        textprintf_ex( bBuffer, interfaceFontL, interfaceX + 120, interfaceY + 410, BLACK, -1, "Kiro: Hey there! I'm Kiro, I sell the best armor in town!");
            break;
            case 4:
        textprintf_ex( bBuffer, interfaceFontL, interfaceX + 120, interfaceY + 410, BLACK, -1, "Thrall: KEK!");
            break;
            case 5:
        textprintf_ex( bBuffer, interfaceFontL, interfaceX + 120, interfaceY + 410, BLACK, -1, "Konas 'The Savage': Arrrgh! I am Konas, they call me 'The Savage'!");
            break;
            case 6:
        textprintf_ex( bBuffer, interfaceFontL, interfaceX + 120, interfaceY + 410, BLACK, -1, "Gangplank: Yarrrrgh! I'm a pirate!");
            break;
            case 7:
        textprintf_ex( bBuffer, interfaceFontL, interfaceX + 120, interfaceY + 410, BLACK, -1, "Sage: What is your future?");
            break;
            case 8:
        textprintf_ex( bBuffer, interfaceFontL, interfaceX + 120, interfaceY + 410, BLACK, -1, "Priest: Farewell.");
            break;
            case 9:
        textprintf_ex( bBuffer, interfaceFontL, interfaceX + 120, interfaceY + 410, BLACK, -1, "Lomadia: Helloooo!");
            break;
            case 11:
        textprintf_ex( bBuffer, interfaceFontL, interfaceX + 120, interfaceY + 410, BLACK, -1, "Druid: Time will heal!");
            break;
            default:
        textprintf_ex( bBuffer, interfaceFontL, interfaceX + 120, interfaceY + 410, BLACK, -1, "Random: Hello! I'm an unfinished NPC!");
            break;
        }
    }

}

void Player::UseInterface( int mouseX, int mouseY )
{

    if( inventoryActive && MouseKeyPressed() == 2 )
    {
        for( int i = 0; i < 10; i++ )
        {
        for( int j = 0; j < 10; j++ )
        {
            if( inventoryArr[i][j] != 0 )
            {
                if( mouseX < 169 + 29*j + 26 && mouseX > 169 + 29*j
                    && mouseY < 108 + 29*i + 26 && mouseY > 108 + 29*i )
                {

                    Game_item tempItem;

                    tempItem.GiveTypeID( inventoryArr[i][j] -> ReturnStat(1), inventoryArr[i][j] -> ReturnStat(2) );

                    switch( inventoryArr[i][j] -> ReturnStat( 1 ) )
                    {
                        case 1:
                        inventoryArr[i][j] -> GiveTypeID( equippedArr[4] -> ReturnStat(1), equippedArr[4] -> ReturnStat(2) );
                        equippedArr[4] -> GiveTypeID( tempItem.ReturnStat(1), tempItem.ReturnStat(2) );
                        break;
                        case 2:
                        inventoryArr[i][j] -> GiveTypeID( equippedArr[4] -> ReturnStat(1), equippedArr[4] -> ReturnStat(2) );
                        equippedArr[4] -> GiveTypeID( tempItem.ReturnStat(1), tempItem.ReturnStat(2) );
                        break;
                        case 3:
                        inventoryArr[i][j] -> GiveTypeID( equippedArr[4] -> ReturnStat(1), equippedArr[4] -> ReturnStat(2) );
                        equippedArr[4] -> GiveTypeID( tempItem.ReturnStat(1), tempItem.ReturnStat(2) );
                        break;
                        case 4:
                        inventoryArr[i][j] -> GiveTypeID( equippedArr[5] -> ReturnStat(1), equippedArr[5] -> ReturnStat(2) );
                        equippedArr[5] -> GiveTypeID( tempItem.ReturnStat(1), tempItem.ReturnStat(2) );
                        break;
                        case 5:
                        inventoryArr[i][j] -> GiveTypeID( equippedArr[0] -> ReturnStat(1), equippedArr[0] -> ReturnStat(2) );
                        equippedArr[0] -> GiveTypeID( tempItem.ReturnStat(1), tempItem.ReturnStat(2) );
                        break;
                        case 6:
                        inventoryArr[i][j] -> GiveTypeID( equippedArr[1] -> ReturnStat(1), equippedArr[1] -> ReturnStat(2) );
                        equippedArr[1] -> GiveTypeID( tempItem.ReturnStat(1), tempItem.ReturnStat(2) );
                        break;
                        case 7:
                        inventoryArr[i][j] -> GiveTypeID( equippedArr[3] -> ReturnStat(1), equippedArr[3] -> ReturnStat(2) );
                        equippedArr[3] -> GiveTypeID( tempItem.ReturnStat(1), tempItem.ReturnStat(2) );
                        break;
                        case 8:
                        inventoryArr[i][j] -> GiveTypeID( equippedArr[2] -> ReturnStat(1), equippedArr[2] -> ReturnStat(2) );
                        equippedArr[2] -> GiveTypeID( tempItem.ReturnStat(1), tempItem.ReturnStat(2) );
                        break;
                        default:
                        break;
                    }

                }
            }
        }
        }
    }

}

void Player::CastSpells() //not finished
{

    prevMouseState = currMouseState;

    if( mouse_b & 1 )
    currMouseState = 1;
    else if( mouse_b & 2 )
    currMouseState = 2;
    else currMouseState = 0;


    prevKeyPress = keyPress;

    for( int i = 0; i < KEY_MAX; i++ )
    {

        if( key[i] )
        {

            keyPress = i;
            break;

        }else
        keyPress = 0;

    }

    if( KeyPressed( KEY_S ) && mana > 20 && !waitForCD ) //waitForCD = ability on CD
    {

        //=============HEAL=================

        mana -= 20;
        health += 20;
        ActivateCD();

        if( health > maxhealth )
        health = maxhealth;

        //=============HEAL=================


    }

    if( KeyPressed( KEY_X ) && mana > 20 && !waitForCD )
    {

        //============SPRINT=================

        sprintOn = true;
        sprintBuffTimer = 0;
        mana -= 20;
        ActivateCD();

        //============SPRINT=================
    }

    if( KeyPressed( KEY_Q ) && !waitForCD )
    {

        ShootProjectile( 1 );
        ActivateCD();

    }

    if( KeyPressed( KEY_W ) && !waitForCD )
    {

        ShootProjectile( 2 );
        ActivateCD();

    }

    if( KeyPressed( KEY_E ) && !waitForCD )
    {

        ShootProjectile( 3 );
        ActivateCD();

    }

    if( KeyPressed( KEY_R ) && !waitForCD && mana >= 3 )
    {

        ShootProjectile( 4 );
        ActivateCD();
        mana -= 3;

    }

    if( KeyPressed( KEY_C ) && !waitForCD )
    {

        telepX = x;
        telepY = y;
        ActivateCD();

    }

    if( KeyPressed( KEY_V ) && !waitForCD && mana >= 10 )
    {

        if( telepX - x < 300 && x - telepX < 300 && telepY - y < 300 && y - telepY < 300 )
        {

        x = telepX;
        y = telepY;
        ActivateCD();
        mana -= 10;

        }

    }



    //==============FOR INGAME MENUS=======
    if( KeyPressed( KEY_J ) )
    {

        if( talentsActive )
        talentsActive = false;
        else
        {
        talentsActive = true;
        inventoryActive = false;
        statsActive = false;
        }

    }

        if( KeyPressed( KEY_K ) )
    {

        if( statsActive )
        statsActive = false;
        else
        {
        talentsActive = false;
        inventoryActive = false;
        statsActive = true;
        }
    }

        if( KeyPressed( KEY_L ) )
    {

        if( inventoryActive )
        inventoryActive = false;
        else
        {
        talentsActive = false;
        inventoryActive = true;
        statsActive = false;
        }

    }
   //==============FOR INGAME MENUS=======


 if( KeyPressed( KEY_H ) )
            {

                switch( isTalking )
                {

                case true:
                    isTalking = false;
                    break;
                case false:
                    isTalking = true;
                    break;
                default:
                    isTalking = false;
                    break;

                }

            }


        if( !isNearbyNpc )
        nearbyNpcType = 0;

}

void Player::Regenerate()
{

    if( health < maxhealth )
    health += vitality/1000;
    else if( health > maxhealth )
    health = maxhealth;
    if( mana < maxmana )
    mana += vitality/1000;
    else if( mana > maxmana )
    mana = maxmana;

    if( waitForCD )
    abilityCD += 0.03f;

    if( abilityCD > 1 )
    {
        abilityCD = 0;
        waitForCD = false;
    }


}

bool  Player::KeyPressed( int keyValue )
{

    if( keyPress == keyValue && prevKeyPress != keyValue )
    return true;
    return false;

}

bool Player::KeyReleased( int keyValue )
{

    if( keyPress != keyValue && prevKeyPress == keyValue )
    return true;
    return false;

}

int Player::MouseKeyPressed()
{
    if( prevMouseState != currMouseState )
    {
        if( mouse_b & 1 )
        return 1;
        else if( mouse_b & 2 )
        return 2;
    }
    else
    return 0;
}

void Player::CollideWNpc( Rectangle colRectNpc, int npcTypeL, int * npcActState, int * npcDirection )
{

    if( colRect.colx - 64 < colRectNpc.colw
       && colRect.colw +64 > colRectNpc.colx
       && colRect.coly - 64 < colRectNpc.colh
       && colRect.colh + 64 > colRectNpc.coly )
    {

        * npcActState = 0;

    } else
        * npcActState = -1;

    if( colRect.colx < colRectNpc.colw
       && colRect.colw > colRectNpc.colx
       && colRect.coly < colRectNpc.colh
       && colRect.colh > colRectNpc.coly )
    {

        x = prevx;
        y = prevy;

    }

     if( facingRect.colx < colRectNpc.colw
       && facingRect.colw > colRectNpc.colx
       && facingRect.coly < colRectNpc.colh
       && facingRect.colh > colRectNpc.coly )
       {

            nearbyNpcType = npcTypeL;
            isNearbyNpc = true;

            if( isTalking )
            {

            switch( direction)
                {

                    case 0:
                * npcDirection = 3; // npc faces the player
                break;
                 case 1:
                * npcDirection = 2; // npc faces the player
                break;
                 case 2:
                * npcDirection = 1; // npc faces the player
                break;
                 case 3:
                * npcDirection = 0; // npc faces the player
                break;
                default:
                 * npcDirection = 0;
                 break;

                }

            }

        }

}

void Player::ShootProjectile( int projectileType )
{

    switch( projectileType )
    {

        case 1: // fireball
        projectiles[projectileInstance] -> SetUp( direction, x + 8, y + 8, 3, soulpower, projectileType, 1 );
        projectileInstance++;
        if( projectileInstance > 9 )
        projectileInstance = 0;
        break;
        case 2: // arrow
        projectiles[projectileInstance] -> SetUp( direction, x + 8, y + 8, 4, Rprecision, projectileType, 1 );
        projectileInstance++;
        if( projectileInstance > 9 )
        projectileInstance = 0;
        break;
        case 3: // throw axe
        projectiles[projectileInstance] -> SetUp( direction, x + 8, y + 8, 2, strength, projectileType, 1 );
        projectileInstance++;
        if( projectileInstance > 9 )
        projectileInstance = 0;
        break;
        case 4: // fire arrow
        projectiles[projectileInstance] -> SetUp( direction, x + 8, y + 8, 3, soulpower + Rprecision, projectileType, 1 );
        projectileInstance++;
        if( projectileInstance > 9 )
        projectileInstance = 0;
        break;
        default:
        projectiles[projectileInstance] -> SetUp( direction, x + 8, y + 8, 3, soulpower, 1, 1 );
        projectileInstance++;
        if( projectileInstance > 9 )
        projectileInstance = 0;
        break;

    }

}

void Player::DrawProjectiles( DATAFILE * projectileImg, BITMAP * buffer )
{

    for( int i = 0; i < 10; i++ )
    {
        if( projectiles[i] -> GetActive() )
        projectiles[i] -> Draw( projectileImg, buffer, x, y );
    }

}

void Player::ActivateCD()
{
    abilityCD = 0;
    waitForCD = true;
}

void Player::MoveProjectiles( int scrnwidth, int scrnheight )
{

    for( int i = 0; i < 10; i++ )
    {
        if( projectiles[i] -> GetActive() )
        projectiles[i] -> Move( x, y, scrnwidth, scrnheight );
    }

}

void Player::CreateProjectilesArray()
{

    for( int i = 0; i < 10; i++ )
    {
        projectiles[i] = new Projectile;
    }

}

void Player::DestroyProjectiles()
{
    for( int i = 0; i < 10; i++ )
    {

        delete projectiles[i];
        projectiles[i] = 0;

    }

    DeleteInventory();

}

void Player::DrawInventory( BITMAP * buffer, FONT * interfaceFont, int mouseX, int mouseY, DATAFILE * interfaceSpr )
{

    line( buffer, interfaceX + 166, interfaceY + 105, interfaceX + 166, interfaceY + 535, makecol( 132, 132, 132 ) );
    line( buffer, interfaceX + 458, interfaceY + 105, interfaceX + 458, interfaceY + 535, makecol( 132, 132, 132 ) );
    line( buffer, interfaceX + 166, interfaceY + 397, interfaceX + 860, interfaceY + 397, makecol( 132, 132, 132 ) );


    // draw inventory
    for( int i = 0; i < 10; i++ )
    {
        for( int j = 0; j < 10; j++ )
        {
            rect( buffer, interfaceX + 169 + 29*j - 1, interfaceY + 108 + 29*i - 1, interfaceX + 169 + 29*j + 26, interfaceY + 108 + 29*i + 26, makecol( 132, 132, 132 ) );
            if( inventoryArr[i][j] != 0 )
            {
                inventoryArr[i][j] -> Draw_icon( buffer, interfaceSpr, interfaceX + 169 + 29*j, interfaceY + 108 + 29*i );
                if( mouseX < interfaceX + 169 + 29*j + 26 && mouseX > interfaceX + 169 + 29*j
                    && mouseY < interfaceY + 108 + 29*i + 26 && mouseY > interfaceY + 108 + 29*i )
                {
                    inventoryArr[i][j] -> Draw_icon( buffer, interfaceSpr, interfaceX + 470, interfaceY + 120 );
                    inventoryArr[i][j] -> Draw_tooltip( buffer, interfaceFont, interfaceX, interfaceY );
                    rect( buffer, interfaceX + 169 + 29*j - 1, interfaceY + 108 + 29*i - 1, interfaceX + 169 + 29*j + 26, interfaceY + 108 + 29*i + 26, WHITE );
                }
            }
        }
    }

    // draw equipped items
    for( int i = 0; i < 6; i++ )
    {
        if( equippedArr[i] != 0 )
        {
            equippedArr[i] -> Draw_icon( buffer, interfaceSpr, interfaceX + 120, interfaceY + 120 + 66*i );
            if( mouseX < interfaceX + 120 + 26 && mouseX > interfaceX + 120
               && mouseY < interfaceY + 120 + 66*i + 26 && mouseY > interfaceY + 120 + 66*i)
            {
                equippedArr[i] -> Draw_icon( buffer, interfaceSpr, interfaceX + 470, interfaceY + 120 );
                equippedArr[i] -> Draw_tooltip( buffer, interfaceFont, interfaceX, interfaceY );
            }
        }
    }

    textprintf_centre_ex( buffer, interfaceFont, interfaceX + 620, interfaceY + 410, BLACK, -1, "Character stats:" );
    textprintf_ex( buffer, interfaceFont, interfaceX + 470, interfaceY + 440, BLACK, -1, "Strength: %i", strength );
    textprintf_ex( buffer, interfaceFont, interfaceX + 470, interfaceY + 460, BLACK, -1, "Soul power: %i", soulpower );
    textprintf_ex( buffer, interfaceFont, interfaceX + 470, interfaceY + 480, BLACK, -1, "Precision: %i", Rprecision );
    textprintf_ex( buffer, interfaceFont, interfaceX + 470, interfaceY + 500, BLACK, -1, "Vitality: %0.0f", vitality );
    textprintf_ex( buffer, interfaceFont, interfaceX + 670, interfaceY + 440, BLACK, -1, "Health: %0.0f", maxhealth );
    textprintf_ex( buffer, interfaceFont, interfaceX + 670, interfaceY + 460, BLACK, -1, "Mana: %0.0f", maxmana );
    textprintf_ex( buffer, interfaceFont, interfaceX + 670, interfaceY + 480, BLACK, -1, "Armor: %i", armor );
    textprintf_ex( buffer, interfaceFont, interfaceX + 670, interfaceY + 500, BLACK, -1, "Gold: %i", gold );

}

void Player::CreateInventory()
{
    // null inventory
    for( int i = 0; i < 10; i++ )
    {
        for( int j = 0; j < 10; j++ )
        {
            inventoryArr[i][j] = 0;
        }
    }

    // null equipped items
    for( int i = 0; i < 6; i++ )
    {

        equippedArr[i] = 0;

    }

    // Custom starting inventory
    for( int i = 0; i < 10; i++ )
    {
        for( int j = 0; j < 10; j++ )
        {
            inventoryArr[i][j] = new Game_item( i+1, j+1 );
        }
    }

    // custom equipped items
    equippedArr[0] = new Game_item( 5, 3 );
    equippedArr[1] = new Game_item( 6, 4 );
    equippedArr[2] = new Game_item( 8, 5 );
    equippedArr[3] = new Game_item( 7, 1 );
    equippedArr[4] = new Game_item( 1, 1 );
    equippedArr[5] = new Game_item( 4, 1 );

}

void Player::DeleteInventory()
{
    // delete inventory
    for( int i = 0; i < 10; i++ )
    {
        for( int j = 0; j < 10; j++ )
        {

            if( inventoryArr != 0 )
            {
                delete inventoryArr[i][j];
                inventoryArr[i][j] = 0;
            }

        }
    }

    // delete equipped items
    for( int i = 0; i < 6; i++)
    {
        if( equippedArr[i] != 0 )
        {
            delete equippedArr[i];
            equippedArr[i] = 0;
        }
    }

}


void Player::UpdateStats()
{

    maxhealth = 150;
    for( int i = 0; i < 6; i++ )
    {
        maxhealth += equippedArr[i] -> ReturnStat( 6 );
    }

    maxmana = 150;
    for( int i = 0; i < 6; i++ )
    {
        maxmana += equippedArr[i] -> ReturnStat( 7 );
    }

    armor = 5;
    for( int i = 0; i < 6; i++ )
    {
        armor += equippedArr[i] -> ReturnStat( 5 );
    }

    vitality = 2;
    for( int i = 0; i < 6; i++ )
    {
        vitality += equippedArr[i] -> ReturnStat( 8 );
    }

    strength = 15;
    for( int i = 0; i < 6; i++ )
    {
        strength += equippedArr[i] -> ReturnStat( 9 );
    }

    soulpower = 15;
    for( int i = 0; i < 6; i++ )
    {
        soulpower += equippedArr[i] -> ReturnStat( 10 );
    }

    Rprecision = 15;
    for( int i = 0; i < 6; i++ )
    {
        Rprecision += equippedArr[i] -> ReturnStat( 11 );
    }

}




