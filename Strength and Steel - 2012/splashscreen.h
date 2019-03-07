#ifndef SPLASHSCREEN_H_INCLUDED
#define SPLASHSCREEN_H_INCLUDED

#include <allegro.h>


class SplashScreen
{

    public:
    SplashScreen();
    bool GetReady();
    void ShowSplashScreen( BITMAP * buffer, DATAFILE * splashscreen, int width, int height );

    private:
    bool ready;
    float redness;
    int phase; // 3 phases: 1-light up; 2-light-red line; 3-fade
    float redlineX;

};


#endif // SPLASHSCREEN_H_INCLUDED

