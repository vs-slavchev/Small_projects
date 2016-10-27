import scala.collection.mutable.ListBuffer

class Location(texts: ListBuffer[String]) {

  val name = texts(0)
  val description = texts(1)

  var items = ListBuffer.empty[String]
  if (texts(2) != "-") {
    items += texts(2)
  }

  val itemAffectedBy = texts(3)

  def printInfo() = {
    println("You are in " + description + ".")
    if (items.nonEmpty) {
      println("Here you see: " + items.mkString(", "))
    }
  }

  def affectedBy(item: String): Boolean = {
    item == itemAffectedBy
  }
}

object Location {

  val descriptions: Map[String, ListBuffer[String]] = Map(
    "cave" -> ListBuffer("a cave entrance. Must have been a mine but is now abandoned",
      "ore", "-"),
    "hut" -> ListBuffer("a small hut. A lumberjack lives here",
      "axe", "-"),
    "lake" -> ListBuffer("a glade next to a lake. There are some tools on a small wooden table" +
      " here",
      "screwdriver", "-"),
    "craftsman" -> ListBuffer("the workshop of a clockwork craftsman. He tells you that he needs" +
      " a piece of fine old wood for his workbench",
      "-", "wood"),
    "tomb" -> ListBuffer("an old tomb. It is sealed and cannot be opened by force",
      "-","coin"),
    "hill" -> ListBuffer("the shadow of an old decaying tree on a hill. Its husk is dried and old",
      "-", "axe"),
    "market" -> ListBuffer("the market. People are going about their business, but a lady is" +
      " looking upset and searching for something",
      "-", "letter"),
    "city" -> ListBuffer("the city square",
      "letter", "-"),
    "metalworker" -> ListBuffer("a metalworkers shop. He can craft a case for your compass if you" +
      " give him a material",
      "-", "ore"),
    "craftsman with rivet" -> ListBuffer("a workshop of a grateful craftsman",
      "rivet", "-"),
    "open tomb" -> ListBuffer("an open tomb. A helm on a stone plate has a moonstone gem on it",
      "moonstone", "-"),
    "hill with chopped tree" -> ListBuffer("a hill with a chopped tree",
      "wood", "-"),
    "market with reward" -> ListBuffer("the market. The letter was important to the lady and she" +
      " rewards you for your help",
      "coin", "-"),
    "generous metalworker" -> ListBuffer("the metalworker's shop. The cylinder is finished",
      "cylinder", "-")
  )

  val relations: Map[String, String] = Map(
    "craftsman" -> "craftsman with rivet",
    "tomb" -> "open tomb",
    "hill" -> "hill with chopped tree",
    "market" -> "market with reward",
    "metalworker" -> "generous metalworker"
  )

  def apply(locationName: String): Location = {
    val texts = locationName +: descriptions(locationName)
    new Location(texts)
  }

  def affectLocation(location: Location): Location = {
      Location(relations(location.name))
  }
}