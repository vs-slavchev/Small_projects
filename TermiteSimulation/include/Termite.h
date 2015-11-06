#ifndef TERMITE_H
#define TERMITE_H


class Termite
{
public:
    Termite();
    void changeDirection();
    void move();
    void draw();
    void update(bool ** map);
    bool dropPiece(bool ** map, int x, int y);
    bool getHasPiece();
protected:
private:
    bool hasPiece;
    int x, y, direction, framesUntillDirectionChange;

};

#endif // TERMITE_H
