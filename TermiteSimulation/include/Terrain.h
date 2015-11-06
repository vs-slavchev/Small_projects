#ifndef TERRAIN_H
#define TERRAIN_H


class Terrain
{
public:
    Terrain();
    virtual ~Terrain();
    bool ** getMap();
    void drawMap();
    int countPieces();
    static const int SCREENWIDTH = 640;
    static const int SCREENHEIGHT = 480;
    static const int NUMBER_TERMITES = 4000;
    static const int NUMBER_WOOD = 10000;
protected:
private:
    // this is a map of the wooden pieces; true means there is a piece
    bool ** map;
};

#endif // TERRAIN_H
