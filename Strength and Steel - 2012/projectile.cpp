
#include <allegro.h>
#include "rectangle.h"
#include "projectile.h"

Projectile::Projectile()
{

    x = 0;
    y = 0;
    direction = 0;
    damage = 0;
    speed = 0;
    projType = 0;
    active = false;

}

void Projectile::SetUp( int directionG, int xG, int yG, int speedG, int damageG, int projTypeG, bool activeG )
{

    direction = directionG;
    x = xG;
    y = yG;
    speed = speedG;
    damage = damageG;
    projType = projTypeG;
    active = activeG;

}

void Projectile::Move( int playerX, int playerY, int scrnwidth, int scrnheight )
{
    if( active )
    {

        switch( direction )
        {

            case 1: // left
            x -= speed;
            break;
            case 2: // right
            x += speed;
            break;
            case 3: // up
            y -= speed;
            break;
            case 0: // down
            y += speed;
            break;
            default: // down
            y += speed;
            break;


        }

    } // end if active


    if( x < 0 || y < 0 || x < ( playerX - scrnwidth/2 - 64 ) || x > ( playerX + scrnwidth/2 + 64 ) ||
       y < ( playerY - scrnheight/2 - 64 ) || y > ( playerY + scrnheight/2 + 64 ) ) //becomes inactive
    {

           active = false;
           x = 0;
           y = 0;
           damage = 0;
           speed = 0;

    }

}

bool Projectile::GetActive()
{
    return active;
}

void Projectile::Draw( DATAFILE * projectileImg, BITMAP * buffer, int playerX, int playerY )
{

    if( active )
       {
           masked_blit( (BITMAP * )projectileImg[0].dat, buffer, (projType - 1) * 16, direction * 16, x, y, 16, 16);
       }


}

void Projectile::UpdateColRect()
{

    colRect.colx = x + 4;
    colRect.coly = y + 4;
    colRect.colw = x + 12;
    colRect.colh = y + 12;

}














