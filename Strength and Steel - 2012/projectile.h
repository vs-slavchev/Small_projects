#ifndef PROJECTILE_H_INCLUDED
#define PROJECTILE_H_INCLUDED

#include <allegro.h>
#include "rectangle.h"

class Projectile
{

  public:
  Projectile(); // projectiles are inactive
  void SetUp( int directionG, int xG, int yG, int speedG, int damageG, int projTypeG, bool activeG );
  void Move( int playerX, int playerY, int scrnwidth, int scrnheight );
  void Draw( DATAFILE * projectilesImg, BITMAP * buffer, int playerX, int playerY );
  bool GetActive();
  void UpdateColRect();


  private:
  int direction;
  int x;
  int y;
  int speed;
  int damage;
  int projType;
  bool active;
  Rectangle colRect;


};


#endif // PROJECTILE_H_INCLUDED
