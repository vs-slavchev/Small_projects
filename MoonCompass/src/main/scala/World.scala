import scala.collection.mutable.ListBuffer

class World {

  var inventory = ListBuffer.empty[String]
  var playerCoord = 5

  var places: Map[Int, Location] = Map(
    1 -> Location("cave"),
    2 -> Location("hut"),
    3 -> Location("lake"),
    4 -> Location("craftsman"),
    5 -> Location("tomb"),
    6 -> Location("hill"),
    7 -> Location("market"),
    8 -> Location("city"),
    9 -> Location("metalworker")
  )

  def currentLocation() = places(playerCoord)

  def printState = {
    currentLocation().printInfo()
    if (inventory.nonEmpty) {
      println(inventory.mkString("Carrying: ", ", ", "."))
    }
  }

  def process(command: String) = {
    val words = command.split(" ")
    if (words.length < 2) {
      println("unknown command")
      printHelp
    } else {
      val action = words(0)
      val subject = words(1)

      action match {
        case "go" | "move" => goInDirection(subject)
        case "take" => takeItem(subject)
        case "drop" => dropItem(subject)
        case "use" => useItem(subject)
        case "assemble" | "make" | "create" => createCompass
        case _ => println("unknown action")
      }
    }
  }

  def printHelp = {
    println("instructions:\n" +
      "to move around: go <direction>\n" +
      "to take an item: take <item name>\n" +
      "to drop an item: drop <item name>\n" +
      "to use and item: use <item name>\n" +
      "to assemble the compass: make compass\n")
  }

  def goInDirection(dir: String) = {
    dir match {
      case "up" | "north" => move(-3)
      case "down" | "south" => move(+3)
      case "left" | "west" => move(-1)
      case "right" | "east" => move(+1)
      case _ => println("unknown direction")
    }
  }

  def move(amount: Int) = {
    val newPosition = playerCoord + amount
    if (newPosition > 0 && newPosition <= places.keys.max) {
      playerCoord = newPosition
    } else {
      println("You cannot go this way.")
    }
  }

  def takeItem(itemName: String) = {
    moveItem(itemName, currentLocation().items, inventory)
  }

  def dropItem(itemName: String) = {
    moveItem(itemName, inventory, currentLocation().items)
  }

  def moveItem(itemName: String, source: ListBuffer[String], destination: ListBuffer[String]) = {
    if (source.contains(itemName)) {
      source -= itemName
      destination += itemName
    } else {
      println("Could not find " + itemName + " here.")
    }
  }

  def useItem(subject: String) = {
    if (inventory.contains(subject) && currentLocation().affectedBy(subject)) {
      places = places + (playerCoord -> Location.affectLocation(currentLocation()))
      inventory -= subject
    } else {
      println("Item not usable here.")
    }
  }

  def createCompass = {
    val parts = List("rivet", "screwdriver", "moonstone", "cylinder")

    if (parts.forall(inventory.contains(_))) {
      inventory --= parts
      inventory += "compass"
    } else {
      println("You don't have all the parts. Missing:")
      parts.filterNot(inventory.contains(_)).foreach(println)
    }
  }
}

