#include <stdio.h>
#include <iostream>
#include <allegro.h>
#include <allegro5/allegro_primitives.h>

#include "Terrain.h"
#include "Termite.h"

int main(int argc, char **argv)
{

    srand( time(0));
    Terrain terrain;

    Termite * termites[Terrain::NUMBER_TERMITES];
    for (int i = 0; i < Terrain::NUMBER_TERMITES; i++)
    {
        termites[i] = new Termite;
    }

    bool done = false;
    const float FPS = 60;
    ALLEGRO_DISPLAY *display = NULL;

    if(!al_init())
    {
        fprintf(stderr, "failed to initialize allegro!\n");
        return -1;
    }

    al_init_primitives_addon();

    display = al_create_display(Terrain::SCREENWIDTH *2, Terrain::SCREENHEIGHT *2);
    ALLEGRO_BITMAP * bitmap = al_create_bitmap(Terrain::SCREENWIDTH, Terrain::SCREENHEIGHT);
    if(!display)
    {
        fprintf(stderr, "failed to create display!\n");
        return -1;
    }

    ALLEGRO_TIMER * timer = al_create_timer(1.0/FPS);
    ALLEGRO_EVENT_QUEUE * eventQueue = al_create_event_queue();
    al_register_event_source(eventQueue, al_get_timer_event_source(timer));
    al_register_event_source(eventQueue, al_get_display_event_source(display));

    // dont put anything after the timer is started!
    al_start_timer(timer);

    while (!done)
    {
        ALLEGRO_EVENT events;
        al_wait_for_event(eventQueue, &events);

        if (events.type == ALLEGRO_EVENT_TIMER)
        {
            int termitesWithPiece = 0;
            for (int i = 0; i < Terrain::NUMBER_TERMITES; i++)
            {
                termites[i] -> move();
                termites[i] -> update(terrain.getMap());
                if (termites[i] -> getHasPiece())
                {
                    termitesWithPiece++;
                }
            }
            std::cout<< "pieces on ground: " << terrain.countPieces() << "/" << Terrain::NUMBER_WOOD
            << "; termites with piece: " << termitesWithPiece << "/" << Terrain::NUMBER_TERMITES <<std::endl;
        }
        if (events.type == ALLEGRO_EVENT_DISPLAY_CLOSE)
        {
            done = true;
        }

        // drawing
        al_set_target_bitmap(bitmap);
        al_clear_to_color(al_map_rgb(0,0,0));
        terrain.drawMap();
        for (int i = 0; i < Terrain::NUMBER_TERMITES; i++)
        {
            termites[i] -> draw();
        }

        al_set_target_backbuffer(display);
        al_draw_scaled_bitmap(bitmap, 0, 0, Terrain::SCREENWIDTH, Terrain::SCREENHEIGHT,
                              0, 0, Terrain::SCREENWIDTH *2, Terrain::SCREENHEIGHT *2, 0);
        al_flip_display();
        al_clear_to_color(al_map_rgb(0,0,0));
    }

    al_destroy_bitmap(bitmap);
    al_destroy_display(display);
    al_destroy_event_queue(eventQueue);
    return 0;
}
