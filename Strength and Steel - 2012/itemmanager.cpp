#include <allegro.h>
#include <iostream>

#include "itemmanager.h"


ItemMngr::ItemMngr()
{

        playerImg = 0;
        interfaceImg = 0;
        systemImg = 0;
        citizenImg = 0;
        splashScreen = 0;
        projectileImg = 0;
        menuImg = 0;
        interfaceFont = 0;
        menuFont = 0;
        creditsFont = 0;

}

ItemMngr::~ItemMngr()
{

            unload_datafile( playerImg );
            playerImg = 0;

             unload_datafile( interfaceImg );
            interfaceImg = 0;

            unload_datafile( systemImg );
            systemImg = 0;

            unload_datafile( citizenImg );
            citizenImg = 0;

            unload_datafile( projectileImg );
            projectileImg = 0;

            unload_datafile( menuImg );
            menuImg = 0;



            destroy_font( interfaceFont );
            //interfaceFont = 0;
            destroy_font( menuFont );
            //menuFont = 0;
            destroy_font( creditsFont );
            //creditsFont = 0;


}

DATAFILE * ItemMngr::GetPlayerImg()
{
        return playerImg;
}

void ItemMngr::LoadPlayerDatafile()
{

        playerImg = LoadDatafile( "Data/playerImg.dat" );

}

DATAFILE * ItemMngr::GetInterfaceImg()
{
        return interfaceImg;
}

void ItemMngr::LoadInterfaceDatafile()
{

        interfaceImg = LoadDatafile( "Data/interface.dat" );

}

DATAFILE * ItemMngr::GetSystemImg()
{
        return systemImg;
}

void ItemMngr::LoadSystemDatafile()
{

        systemImg = LoadDatafile( "Data/systemImg.dat" );

}

DATAFILE * ItemMngr::GetCitizenImg()
{
        return citizenImg;
}

void ItemMngr::LoadCitizenDatafile()
{

        citizenImg = LoadDatafile( "Data/citizenImg.dat" );

}

DATAFILE * ItemMngr::GetProjectileImg()
{
        return projectileImg;
}

void ItemMngr::LoadProjectileDatafile()
{

        projectileImg = LoadDatafile( "Data/projectilesImg.dat" );

}

DATAFILE * ItemMngr::GetSplashScreen()
{
        return splashScreen;
}

void ItemMngr::LoadSplashScreenDatafile()
{

        splashScreen = LoadDatafile( "Data/splashscreen.dat" );

}

void ItemMngr::UnloadSplashScreenDatafile()
{

        unload_datafile( splashScreen );
        splashScreen = 0;

}

DATAFILE * ItemMngr::GetMenuImg()
{
        return menuImg;
}

void ItemMngr::LoadMenuDatafile()
{
    menuImg = LoadDatafile( "Data/menuImg.dat" );
}

DATAFILE * ItemMngr::LoadDatafile( const char * filename )
{

        DATAFILE * result = load_datafile( filename );
        if( !result )
        {

            set_gfx_mode( GFX_TEXT, 0, 0, 0, 0 );
            allegro_message( "Could not load datafile: %s", filename );
            exit( EXIT_FAILURE );

        }

        return result;

}

FONT * ItemMngr::LoadFont( const char * fontname )
{

        FONT * result = load_font( fontname, 0, 0 );
        if( !result )
        {

            set_gfx_mode( GFX_TEXT, 0, 0, 0, 0 );
            allegro_message( "Could not load font: %s", fontname );
            exit( EXIT_FAILURE );

        }

        return result;

}

FONT * ItemMngr::GetInterfaceFont()
{
        return interfaceFont;
}

void ItemMngr::LoadInterfaceFont()
{

        interfaceFont = LoadFont( "Fonts/sylfaen12.pcx" );

}

FONT * ItemMngr::GetMenuFont()
{
        return menuFont;
}

void ItemMngr::LoadMenuFont()
{

        menuFont = LoadFont( "Fonts/hightower24b.pcx" );

}

FONT * ItemMngr::GetCreditsFont()
{
        return creditsFont;
}

void ItemMngr::LoadCreditsFont()
{

        creditsFont = LoadFont( "Fonts/trebuchet22b.pcx" );

}

void ItemMngr::LoadEVERYTHING()
{

    LoadSplashScreenDatafile(); // load image datafiles
    LoadPlayerDatafile();
    LoadInterfaceDatafile();
    LoadSystemDatafile();
    LoadCitizenDatafile();
    LoadProjectileDatafile();
    LoadMenuDatafile();

    LoadInterfaceFont(); // load fonts
    LoadMenuFont();
    LoadCreditsFont();

}











