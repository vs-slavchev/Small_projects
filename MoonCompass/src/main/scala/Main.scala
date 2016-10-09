import scala.io.StdIn

object Main {

  val world = new World

  def main(args: Array[String]): Unit = {
    println("Welcome!")

    world.setUp()
    play()
  }

  def play(): Unit = {
    world.printState()
    val input = StdIn.readInt()
    world.moveTo(input)
    play()
  }
}
