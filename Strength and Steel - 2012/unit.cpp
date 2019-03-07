#include <allegro.h>
#include <ctime>
#include <cstdlib>
#include <iostream>
#include <string>

#include "unit.h"


Unit::Unit()
{
    x = 0;
    y = 0;
}

void Unit::TerrainCollision( int **map, int mapSizeX, int mapSizeY, int blockSize,
                            int screenwidth, int screenheight )
{

    int currentTile;

    int i = 0;
    int j = 0;
    int maxi = x/blockSize + screenwidth/blockSize + blockSize;
    int maxj = y/blockSize + screenheight/blockSize + blockSize;

    if( maxi > mapSizeX )
    maxi = mapSizeX;

    if( maxj > mapSizeY )
    maxj = mapSizeY;

    for( i = x/blockSize; i < maxi; i++ )
    {
        for( j = y/blockSize; j < maxj; j++ )
        {

            currentTile =  *( *( map + i ) + j );

            if( ( currentTile == 50 ) || ( currentTile == 51 ) || ( currentTile == 52 ) ||
                ( currentTile == 60 ) || ( currentTile == 61 ) || ( currentTile == 62 ) ||
                ( currentTile == 70 ) || ( currentTile == 71 ) || ( currentTile == 72 ) ||
                ( currentTile == 80 ) || ( currentTile == 81 ) || ( currentTile == 82 ) ||
                ( currentTile == 85 ) || ( currentTile == 88 ) || ( currentTile == 78 ) ||
                ( currentTile == 94 ) || ( currentTile == 96 ) || ( currentTile == 106 ) ||
                ( currentTile == 103 ) || ( currentTile == 104 ) || ( currentTile == 105 ) ||
                ( currentTile == 114 ) || ( currentTile == 116 ) || ( currentTile == 117 ) ||
                ( currentTile == 118 ) || ( currentTile == 126 ) || ( currentTile == 127 ) ||
                ( currentTile == 128 ) || ( currentTile == 136 ) || ( currentTile == 137 ) ||
                ( currentTile == 138 ) || ( currentTile == 146 ) || ( currentTile == 147 ) ||
                ( currentTile == 148 ) || ( currentTile == 156 ) || ( currentTile == 157 ) ||
                ( currentTile == 158 ) || ( currentTile == 166 ) || ( currentTile == 167 ) ||
                ( currentTile == 168 ) || ( currentTile == 123 ) || ( currentTile == 124 ) ||
                ( currentTile == 125 ) || ( currentTile == 153 ) || ( currentTile == 154 ) ||
                ( currentTile == 155 ) || ( currentTile == 130 ) || ( currentTile == 131 ) ||
                ( currentTile == 132 ) || ( currentTile == 140 ) || ( currentTile == 141 ) ||
                ( currentTile == 142 ) || ( currentTile == 150 ) || ( currentTile == 151 ) ||
                ( currentTile == 152 ) || ( currentTile == 160 ) || ( currentTile == 161 ) ||
                ( currentTile == 162 ) || ( currentTile == 170 ) || ( currentTile == 171 ) ||
                ( currentTile == 172 ) || ( currentTile == 79 ) || ( currentTile == 109 ) ||
                ( currentTile == 119 ) || ( currentTile == 163 ) || ( currentTile == 164 ) ||
                ( currentTile == 165 ) || ( currentTile == 173 ) || ( currentTile == 174 ) ||
                ( currentTile == 175 ) || ( currentTile == 176 ) || ( currentTile == 177 ) ||
                ( currentTile == 178 ) || ( currentTile == 183 ) || ( currentTile == 184 ) ||
                ( currentTile == 185 ) || ( currentTile == 186 ) || ( currentTile == 187 ) ||
                ( currentTile == 189 ) || ( currentTile == 194 ) || ( currentTile == 196 ) ||
                ( currentTile == 197 ) || ( currentTile == 198 ) || ( currentTile == 199 ) ||
                ( currentTile == 203 ) || ( currentTile == 204 ) || ( currentTile == 205 ) ||
                ( currentTile == 206 ) || ( currentTile == 207 ) || ( currentTile == 208 ) ||
                ( currentTile == 209 ) || ( currentTile == 214 ) || ( currentTile == 216 ) ||
                ( currentTile == 218 ) || ( currentTile == 219 ) || ( currentTile == 220 ) ||
                ( currentTile == 221 ) || ( currentTile == 222 ) || ( currentTile == 223 ) ||
                ( currentTile == 224 ) || ( currentTile == 225 ) || ( currentTile == 226 ) ||
                ( currentTile == 227 ) || ( currentTile == 228 ) || ( currentTile == 230 ) ||
                ( currentTile == 231 ) || ( currentTile == 232 ) || ( currentTile == 233 ) ||
                ( currentTile == 235 ) || ( currentTile == 240 ) || ( currentTile == 241 ) ||
                ( currentTile == 242 ) || ( currentTile == 243 ) || ( currentTile == 244 ) ||
                ( currentTile == 245 ) || ( currentTile == 252 ) || ( currentTile == 253 ) ||
                ( currentTile == 254 ) || ( currentTile == 255 ) || ( currentTile == 256 ) ||
                ( currentTile == 257 ) || ( currentTile == 258 ) || ( currentTile == 259 ) ||
                ( currentTile == 270 ) || ( currentTile == 271 ) || ( currentTile == 264 ) ||
                ( currentTile == 265 ) || ( currentTile == 266 ) || ( currentTile == 274 ) ||
                ( currentTile == 275 ) || ( currentTile == 276 ) ) //full block collision
            {
                if(
                    ( ( colRect.colx ) < ( i * blockSize + blockSize ) )
                && ( ( i * blockSize ) < ( colRect.colw ) )
                && ( ( colRect.coly ) < ( j * blockSize + blockSize ) )
                && ( ( j * blockSize ) < ( colRect.colh ) )
                   )
                   {

                       x = prevx;
                       y = prevy;

                   }
            }
            else if( ( currentTile == 25 ) || ( currentTile == 55 ) || ( currentTile == 63 ) ||
                     ( currentTile == 26 ) || /*( currentTile == 27 )*/ ( currentTile == 28 ) ||
                     ( currentTile == 29 ) || ( currentTile == 33 ) || ( currentTile == 34 ) ||
                     ( currentTile == 35 ) || ( currentTile == 43 ) || ( currentTile == 45 ) ||
                     ( currentTile == 47 ) || ( currentTile == 49 ) || ( currentTile == 53 ) ||
                     ( currentTile == 65 ) || ( currentTile == 73 ) || ( currentTile == 74 ) ||
                     ( currentTile == 75 ) || ( currentTile == 340 ) || ( currentTile == 341 ) ||
                     ( currentTile == 342 ) || ( currentTile == 93 ) || ( currentTile == 95 ) ||
                     ( currentTile == 113 ) || ( currentTile == 115 ) || ( currentTile == 64 ) ||
                     ( currentTile == 68 ) || ( currentTile == 89 ) || ( currentTile == 217 ) ||
                     ( currentTile == 229 ) || ( currentTile == 234 ) || ( currentTile == 250 ) ||
                     ( currentTile == 251 ) || ( currentTile == 260 ) || ( currentTile == 261 ) ||
                     ( currentTile == 280 ) || ( currentTile == 281 ) ) // 6x6 square collision
            {
                if(
                    ( ( colRect.colx ) < ( i * blockSize + blockSize  - 13 ) )
                && ( ( i * blockSize + 13 ) < ( colRect.colw ) )
                && ( ( colRect.coly ) < ( j * blockSize + blockSize - 13 ) )
                && ( ( j * blockSize + 13 ) < ( colRect.colh ) )
                   )
                   {

                       x = prevx;
                       y = prevy;

                   }
            }
            else if( ( currentTile == 37 ) || ( currentTile == 38 ) || ( currentTile == 39 ) ||
                     ( currentTile == 48 ) || ( currentTile == 57 ) || ( currentTile == 58 ) ||
                     ( currentTile == 83 ) || ( currentTile == 84 ) || ( currentTile == 86 ) ||
                     ( currentTile == 66 ) || ( currentTile == 67 ) || ( currentTile == 76 ) ||
                     ( currentTile == 77 ) || ( currentTile == 87 ) || ( currentTile == 54 ) ||
                     ( currentTile == 27 ) || ( currentTile == 15 ) || ( currentTile == 16 ) ||
                     ( currentTile == 17 ) || ( currentTile == 18 ) || ( currentTile == 19 ) ||
                     ( currentTile == 40 ) || ( currentTile == 41 ) || ( currentTile == 42 ) ) // tree collision
            {
                if(
                    ( ( colRect.colx ) < ( i * blockSize + blockSize  - 10 ) )
                && ( ( i * blockSize + 10 ) < ( colRect.colw ) )
                && ( ( colRect.coly ) < ( j * blockSize + blockSize - 13 ) )
                && ( ( j * blockSize ) < ( colRect.colh ) )
                   )
                   {

                       x = prevx;
                       y = prevy;

                   }
            }





             /* else if( ( currentTile == 61 ) ) //full block collision / teleporter =========not ready==========
            {
                if(
                    ( ( colRect.colx ) < ( i * blockSize + blockSize ) )
                && ( ( i * blockSize ) < ( colRect.colw ) )
                && ( ( colRect.coly ) < ( j * blockSize + blockSize ) )
                && ( ( j * blockSize ) < ( colRect.colh ) )
                   )
                   {
                       // ??? LoadMap( "Maps/Map2.txt" );
                       x = 100;
                       y = 100;

                   }
            } */

        }
    }

}

int Unit::GetX()
{
    return x;
}

int Unit::GetY()
{
    return y;
}

int * Unit::GetAdrX()
{
    return &x;
}

  int * Unit::GetAdrY()
{
    return &y;
}

int Unit::GetPrevX()
{
       return prevx;
}

int Unit::GetPrevY()
{
      return prevy;
}








