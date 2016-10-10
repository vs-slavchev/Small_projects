import scala.collection.mutable.ListBuffer

class Location(texts: (String, String)) {

  var items = ListBuffer.empty[String]
  def description() = texts._1

  if (texts._2 != "-") {
    items += texts._2
  }

  def printInfo() = {
    println("You are in " + description() + ".")
    if (items.nonEmpty) {
      println("Here you see: " + items.mkString(", "))
    }
  }
}

object Location {
  val descriptions: Map[String, (String, String)] = Map(
    "cave" -> ("a cave entrance", "needle"),
    "hut" -> ("a small hut", "-"),
    "lake" -> ("a glade next to a lake", "screwdriver"),
    "craftsman" -> ("the workshop of a clockwork craftsman", "rivet"),
    "tomb" -> ("an old tomb. A helm on a stone plate has a moonstone gem on it", "moonstone"),
    "hill" -> ("the shadow of an old decaying tree on a hill. Its husk is dried out", "-"),
    "market" -> ("the market. A lady is selling a strange thin circular quartz plate", "plate"),
    "city" -> ("the city square", "coin"),
    "metalworker" -> ("a metalworkers shop. In a pile of scrap you see a short metal cylinder",
      "cylinder")
  )

  // use as a map function
  val relations: Map[String, String] = Map(
    "cave" -> "collapsed cave",
    "hut" -> "open hut",
    "hill" -> "grove"
  )

  def apply(locationName: String): Location = {
    val texts = descriptions(locationName)
    new Location(texts)
  }
}