class World {

  var places: Map[Int, Location] = _
  var playerCoord = 5

  def setUp() = {
    places = Map(
      1 -> new Location("a cave entrance", "needle"),
      2 -> new Location("a small hut"),
      3 -> new Location("a glade next to a lake", "screwDriver"),
      4 -> new Location("the workshop of a clockwork craftsman", "tiny rivet"),
      5 -> new Location("an old tomb. A helm on a stone plate has a moonstone gem on it",
        "moonstone"),
      6 -> new Location("the shadow of an old decaying tree on a hill. Its husk is dried out"),
      7 -> new Location("the market. A lady is selling a strange thin circular object",
        "quartz plate"),
      8 -> new Location("the city square.", "gold coin"),
      9 -> new Location("a metalworkers shop. In a pile of scrap you see a short metal cylinder",
        "short cylinder")
    )
  }

  def printState() = {
    places(playerCoord).printInfo()
  }

  def moveTo(coord: Int) = {
    playerCoord = coord
  }
}
