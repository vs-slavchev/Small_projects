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
    "cave" -> ListBuffer("a cave entrance", "ore", "-"),
    "hut" -> ListBuffer("a small hut", "axe", "-"),
    "lake" -> ListBuffer("a glade next to a lake", "screwdriver", "-"),
    "craftsman" -> ListBuffer("the workshop of a clockwork craftsman", "-", "wood"),
    "tomb" -> ListBuffer("an old tomb. A helm on a stone plate has a moonstone gem on it", "-", "coin"),
    "hill" -> ListBuffer("the shadow of an old decaying tree on a hill. Its husk is dried out", "-", "axe"),
    "market" -> ListBuffer("the market. A lady is selling a strange thin circular quartz plate", "-", "letter"),
    "city" -> ListBuffer("the city square", "letter", "-"),
    "metalworker" -> ListBuffer("a metalworkers shop. In a pile of scrap you see a short metal cylinder",
      "-", "ore"),
    "craftsman with rivet" -> ListBuffer("kekasdf", "rivet", "parts"),
    "open tomb" -> ListBuffer("fsdf", "moonstone", "-"),
    "hill with chopped tree" -> ListBuffer("sferhrd", "wood", "-"),
    "market with reward" -> ListBuffer("sdf", "coin", "-"),
    "generous metalworker" -> ListBuffer("sdfgdrg", "cylinder", "-"),
    "helpful craftsman" -> ListBuffer("sdsdfsgrddf1", "compass", "-")
  )

  val relations: Map[String, String] = Map(
    "craftsman" -> "craftsman with rivet",
    "tomb" -> "open tomb",
    "hill" -> "hill with chopped tree",
    "market" -> "market with reward",
    "metalworker" -> "generous metalworker",
    "craftsman with rivet" -> "helpful craftsman"
  )

  def apply(locationName: String): Location = {
    val texts = locationName +: descriptions(locationName)
    new Location(texts)
  }

  def affectLocation(location: Location): Location = {
      Location(relations(location.name))
  }
}