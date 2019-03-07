#ifndef ITEMMANAGER_H_INCLUDED
#define ITEMMANAGER_H_INCLUDED

#include <allegro.h>

#include "Data/citizenImgHdr.h"
// #include "Data/interfaceHdr.h" - probably will interfere with something!
#include "Data/playerImgHdr.h"

class ItemMngr
{
    public:
    ItemMngr();
    ~ItemMngr();
    DATAFILE * GetPlayerImg();
    void LoadPlayerDatafile();
    DATAFILE * GetInterfaceImg();
    void LoadInterfaceDatafile();
    DATAFILE * GetSystemImg();
    void LoadSystemDatafile();
    DATAFILE * GetCitizenImg();
    void LoadCitizenDatafile();
    DATAFILE * GetProjectileImg();
    void LoadProjectileDatafile();
    DATAFILE * GetMenuImg();
    void LoadMenuDatafile();

    DATAFILE * GetSplashScreen();
    void LoadSplashScreenDatafile();
    void UnloadSplashScreenDatafile();

    FONT * GetInterfaceFont();
    void LoadInterfaceFont();
    FONT * GetMenuFont();
    void LoadMenuFont();
    FONT * GetCreditsFont();
    void LoadCreditsFont();

    DATAFILE * LoadDatafile( const char * filename );
    FONT * LoadFont( const char * fontname );

    void LoadEVERYTHING();




  private:
  DATAFILE * playerImg;
  DATAFILE * interfaceImg;
  DATAFILE * systemImg;
  DATAFILE * citizenImg;
  DATAFILE * projectileImg;
  DATAFILE * splashScreen;
  DATAFILE * menuImg;

  // DATAFILE *

  FONT * interfaceFont;
  FONT * menuFont;
  FONT * creditsFont;


};

#endif // ITEMMANAGER_H_INCLUDED






