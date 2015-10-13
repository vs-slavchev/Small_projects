
#include "baklava.h"

Baklava::Baklava( int giveid )
{

	id = giveid;
	x = 70*(1+id);
	y = 70*(1+id);
	srand( time(0) );
	dir_timer = 0;
	speed = 0.3 + (4-id)/3;
	dir = rand() % 4;

}

void Baklava::Move()
{
	switch( dir )
	{
	case 0:
		y += speed;
		break;
	case 3:
		y -= speed;
		break;
	case 1:
		x -= speed;
		break;
	case 2:
		x += speed;
		break;
	default:
		break;
	}
}

void Baklava::Draw( BITMAP * baklSpr, BITMAP * buffer )
{

	switch( id )
	{

		case 0:
			masked_blit( baklSpr, buffer, 58, 40, x, y, 20, 16 );
			break;
		case 1:
			masked_blit( baklSpr, buffer, 106, 32, x, y, 29, 24 );
			break;
		case 2:
			masked_blit( baklSpr, buffer, 106, 0, x, y, 40, 32 );
			break;
		case 3:
			masked_blit( baklSpr, buffer, 58, 0, x, y, 47, 40 );
			break;
		case 4:
			masked_blit( baklSpr, buffer, 0, 0, x, y, 56, 48 );
			break;
		default:
			break;

	}

}

ColRectangle Baklava::GetColRect()
{
	return colRect;
}

void Baklava::Respawn()
{

		x = 30 + rand() % 530;
		y = 30 + rand() % (440 - 30);

}

void Baklava::Update()
{
	dir_timer++;
	if( dir_timer > 120 + 20*id)
		{
			dir_timer = 0;
			dir = rand() % 4;
		}

	colRect.colx = x+5;
	colRect.coly = y+5;
	colRect.colw = x+20+10*id-5;
	colRect.colh = y+16+8*id-5;

	if( x < 0 )
		dir = 2;
	if( x > 510 )
		dir = 1;
	if( y < 0 )
		dir = 0;
	if( y > 430 )
		dir = 3;

		//if( id == 4 )
		//std::cout<<"x: "<<x<<";  y: "<<y<<std::endl;

}

int Baklava::GetId()
{
	return id;
}
