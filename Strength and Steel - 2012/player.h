#ifndef PLAYER_H_INCLUDED
#define PLAYER_H_INCLUDED

#include <allegro.h>
#include <string>
#include "rectangle.h"
#include "projectile.h"
#include "unit.h"
#include "game_item.h"

class Player : public Unit
{

  public:
  Player();
  Player(int givex, int givey, int givedir, int giveframe);
  void Move( int blockSizeL, int mapSizeXL, int mapSizeYL );
  void Draw( DATAFILE * charsprite, BITMAP * bBuffer);
  void UpdateColRect();
  Rectangle GetRect();
  Rectangle GetFacingRect();
  int GetDirection();
  bool * GetIsTalkingAddr();
  bool * GetIsNearbyNpcAddr();
  int * GetNearbyNpcTypeAddr();
  void DrawInterface( BITMAP * bBuffer, DATAFILE * spr_InterfaceL, int scrnw, int scrnh,
                      int blockSizeL, int mapSizeXL, int mapSizeYL, FONT * interfaceFontL,
                      int mouseX, int mouseY  );
  void UseInterface( int mouseX, int mouseY );
  void CastSpells();
  void Regenerate();
  bool KeyPressed( int keyValue );
  bool KeyReleased( int keyValue );
  int MouseKeyPressed();
  void CollideWNpc( Rectangle colRectNpc, int npcTypeL, int * npcActState, int * npcDirection );
  void ShootProjectile( int projectileType );
  void DrawProjectiles( DATAFILE * projectilesImg, BITMAP * buffer );
  void MoveProjectiles( int scrnwidth, int scrnheight );
  void ActivateCD();
  void CreateProjectilesArray();
  void DestroyProjectiles();
  int GetInterfaceX();
  int GetInterfaceY();

  // inventory
  void DrawInventory( BITMAP * buffer, FONT * interfaceFont, int mouseX, int mouseY,
                     DATAFILE * interfaceSpr  );
  void CreateInventory();
  void DeleteInventory();
  void UpdateStats();


  private:
  // basic data members
  int direction;
  float frame;
  Rectangle facingRect;

    // rpg stats
  int movementSpeed;
  float maxhealth;
  float maxmana;
  float health;
  float mana;
  float level;
  float experience;
  float vitality;
  int strength;
  int soulpower;
  int Rprecision;
  int armor;
  int gold;

    // interface and timers
  float expBarPos;
  float hpBarPos;
  float mpBarPos;
  int interfaceX;
  int interfaceY;
  int keyPress;
  int prevKeyPress;
  int currMouseState;
  int prevMouseState;
  bool sprintOn;
  float sprintBuffTimer;
  bool inventoryActive;
  bool talentsActive;
  bool statsActive;
  int nearbyNpcType;
  bool isTalking;
  bool isNearbyNpc;
  Projectile * projectiles[10];
  float abilityCD;
  bool waitForCD;
  int projectileInstance;

  // talents related data members





 // ability related
 int telepX;
 int telepY;

    // inventory
    Game_item * inventoryArr[10][10]; // 10x10 inventory
    Game_item * equippedArr[6]; // 6 equipped items



};
#endif // PLAYER_H_INCLUDED



