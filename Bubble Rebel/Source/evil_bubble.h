#ifndef EVIL_BUBBLE_H_INCLUDED
#define EVIL_BUBBLE_H_INCLUDED

#include "basic_char.h"

class Evil_bubble : public Basic_char
{
    public:
    Evil_bubble();
    void Move( Bubble * bubble, int scrnwdth, int scrnhght );
    Evil_bubble * GetEvil_bubbleAddr();
    void SetMembers();

    private:
    float redness;
    float incr_redness;

};

#endif // EVIL_BUBBLE_H_INCLUDED
