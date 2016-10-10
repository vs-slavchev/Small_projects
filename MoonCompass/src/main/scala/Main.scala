import scala.io.StdIn

object Main {

  val world = new World

  def main(args: Array[String]): Unit = {
    println("Welcome!")
    play()
  }

  def play(): Unit = {
    world.printState()
    val input = StdIn.readLine()
    world.process(input)
    play()
  }
}
