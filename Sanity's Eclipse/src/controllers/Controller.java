package controllers;

import entities.AlienShip;
import game.Action;

public interface Controller {

	public Action action();

	public void update(AlienShip alienShip);

}