class Location(descr: String, itemName: String = "empty") {

  var items = List[String]()
  def description() = descr

  if (!(itemName == "empty")) {
    items ::= itemName
  }

  def printInfo() = {
    println("You are in " + description() + ".")
    if (!items.isEmpty) {
      println("You found: " + items.mkString(", "))
    }
  }

}
