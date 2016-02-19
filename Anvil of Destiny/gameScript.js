//description of the zones
var map = [];
map[0] = "The Dreadscale Dragon. It devours people and threatens to destroy the kingdom!";
map[1] = "A lonely wooden bench. There is some engraved text on it:<br>";
map[1] += "\"Only those pure of heart can master the music.\"";
map[2] = "A smelter at work. He is very hungry and has a lot to do.";
map[3] = "A small cottage. Inside is a stone statue of a cursed petrified witch.";
map[4] = "A glade.";
map[5] = "An ancient legendary anvil. The prophecy says that only here can a weapon<br>";
map[5] += "be made, one that can pierce dragon scale."
map[6] = "A calm lake.";
map[7] = "An elf baker. He is sad because his son is very ill.";
map[8] = "The elf queen. She will help those who prove to have a pure heart.";

// names of the images of each zone
var imageNames = ["dragon", "bench", "smelter",
  "cottage", "glade", "anvil",
  "lake", "baker", "queen"
];

// messages displayed when trying to exit the game field
var blockedPathMessages = ["You cannot go past the dragon.",
  "A misterious force holds you back.",
  "The smelter warns you not go that way.",
  "You see giant spiders and decide not to go that way.",
  "",
  "You cannot go past the wall.",
  "The lake is too deadly to swim through.",
  "You are too scared of the plague the baker tells you about and don't go that way.",
  "You cannot exit the elf castle from here."
];

var items = ["flute", "wand"];
var itemLocations = [1, 6];
var backpack = [];

//player start loction
var mapLocation = 4;
var playersInput = "";
var gameMessage = "";
var possibleActions = ["north", "east", "south", "west", "take", "use", "drop", "help"];
var action = "";
var possibleItems = ["flute", "wand", "sword", "cure", "bread", "mithril bar", "hammer"];
var item = "";

var output = document.querySelector("#output");
var input = document.querySelector("#input");
var image = document.querySelector("#picture");

var button = document.querySelector("button");
button.style.cursor = "pointer";
button.addEventListener("click", clickHandler, false);
window.addEventListener("keydown", keydownHandler, false);

render();

function clickHandler() {
  playGame();
}

function playGame() {
  playersInput = input.value;
  playersInput = playersInput.toLowerCase();

  gameMessage = action = "";

  for (i = 0; i < possibleActions.length; i++) {
    if (playersInput.indexOf(possibleActions[i]) !== -1) {
      action = possibleActions[i];
      break;
    }
  }

  switch (action) {
    case "north":
      if (mapLocation >= 3) {
        mapLocation -= 3;
      } else {
        setBlockedMessage();
      }
      break;
    case "east":
      if (mapLocation % 3 != 2) {
        mapLocation++;
      } else {
        setBlockedMessage();
      }
      break;
    case "south":
      if (mapLocation < 6) {
        mapLocation += 3;
      } else {
        setBlockedMessage();
      }
      break;
    case "west":
      if (mapLocation % 3 != 0) {
        mapLocation--;
      } else {
        setBlockedMessage()
      }
      break;
    case "take":
      inputItem();
      takeItem();
      break;
    case "drop":
      inputItem();
      dropItem();
      break;
    case "use":
      inputItem();
      useItem();
      break;
    case "help":
      displayHelp();
      break;
    default:
      gameMessage = "Unknown command :( ";
  }
  render();
}

function render() {
  output.innerHTML = map[mapLocation];
  image.src = "images/" + imageNames[mapLocation] + ".jpg";
  output.innerHTML += "<br><em>" + gameMessage + "</em>";
  displayItem();

  if (backpack.length != 0) {
    output.innerHTML += "You are carrying: " + backpack.join(", ");
  }
}

function takeItem() {
  var itemIndex = items.indexOf(item);

  if (itemIndex !== -1 && itemLocations[itemIndex] === mapLocation) {
    gameMessage = "You take the " + item + ".<br>";
    backpack.push(item);
    items.splice(itemIndex, 1);
    itemLocations.splice(itemIndex, 1);
  } else {
    gameMessage = "You cannot take that item.";
  }
}

function dropItem() {
  if (backpack.length > 0) {
    var backpackIndex = backpack.indexOf(item);
    if (backpackIndex !== -1) {
      gameMessage = "You drop the " + item + ".";
      items.push(backpack[backpackIndex]);
      itemLocations.push(mapLocation);
      backpack.splice(backpackIndex, 1);
    } else {
      gameMessage = "You cannot do that.";
    }
  } else {
    gameMessage = "You are not carrying anything.";
  }
}

function useItem() {
  if (backpack.length === 0) {
    gameMessage = "You are not carrying anything. ";
  }
  var backpackIndex = backpack.indexOf(item);
  if (backpackIndex === -1) {
    gameMessage = "You are not carrying it. ";
  } else {
    switch (item) {
      case "flute":
        if (mapLocation === 8) {
          gameMessage = "Wonderful music fills the air. The elf queen is impressed!<br>";
          gameMessage += "You have proven your nobility and she gives you the royal<br>";
          gameMessage += "hammer that can subdue any metal. ";
          items.push("hammer");
          itemLocations.push(mapLocation);
        } else {
          gameMessage = "You play the flute, but noone around cares. ";
        }
        break;
      case "sword":
        if (mapLocation === 0) {
          gameMessage = "You slay the dragon! Congratulations, you won! GG<br>";
          // call a victory game over function?
        } else {
          gameMessage = "You swing the sword in the air and nothing happens. ";
        }
        break;
      case "wand":
        if (mapLocation === 3) {
          gameMessage = "You use the wand and free the witch of the curse. She is very grateful<br>";
          gameMessage += "and rewards you with a cure, in case the plague gets you. ";

          map[3] = "A small cottage with a friendly witch inside.";

          backpack.splice(backpackIndex, 1);

          //put the flute into the world
          items.push("cure");
          itemLocations.push(mapLocation);
        } else {
          gameMessage = "You fumble with the wand. Nothing happens.";
        }
        break;
      case "cure":
        if (mapLocation === 7) {
          gameMessage = "You give the cure to the baker, he can now heal his son!<br>";
          gameMessage += "With tears in his eyes he gives you the best bread he's got. ";

          map[7] = "A bakery. The baker is off to see his son.";

          backpack.splice(backpackIndex, 1);

          items.push("bread");
          itemLocations.push(mapLocation);
        } else {
          gameMessage = "There is noone to give the cure to. ";
        }
        break;
      case "hammer":
        if (mapLocation === 5) {
        backpackIndex = -1;
          for (var j = 0; j < backpack.length; j++) {
            if ("mithril bar".indexOf(backpack[j]) !== -1) {
              backpackIndex = j;
              break;
            }
          }
          if (backpackIndex !== -1) {
            gameMessage = "You swing the royal hammer with might, bending the mithril into shape.<br>";
            gameMessage += "You create a noble blade to be used in the name of righteousness! ";
            items.push("sword");
            itemLocations.push(mapLocation);
            backpack.splice(backpackIndex, 1);
          } else {
            gameMessage = "You need a metal bar to craft the sword out of. ";
          }
        } else {
          gameMessage = "There is nothing to use the hammer on. ";
        }
        break;
      case "mithril bar":
        if (mapLocation == 5) {
          gameMessage = "You should use a tool, you can't use your bare hands. ";
        } else {
          gameMessage = "You need a more suitable place for handling the metal. ";
        }
        break;
      case "bread":
        if (mapLocation === 2) {
          gameMessage = "You give the bread to the hungry smelter and he takes<br>";
          gameMessage += "it with his dusty scorched hands shaking. He gives you<br>";
          gameMessage += "a mithril bar. The block of metal is lighter than a<br>";
          gameMessage += "feather and stronger than steel. "

          map[2] = "A smelter eating some bread.";

          backpack.splice(backpackIndex, 1);
          backpack.push("mithril bar");
        }
        break;
      default:
        gameMessage = "Unknown item name.";
    }
  }
}

function inputItem() {
  for (i = 0; i < possibleItems.length; i++) {
    if (playersInput.indexOf(possibleItems[i]) !== -1) {
      item = possibleItems[i];
    }
  }
  // "unknown item"
}

function displayItem() {
  for (var i = 0; i < items.length; i++) {
    if (mapLocation === itemLocations[i]) {
      output.innerHTML += "<br>You see a <strong>" + items[i] + "</strong> here.<br>";
    }
  }
}

function displayHelp() {
  switch (mapLocation) {
    case 1:
      gameMessage = "You can 'take' items. Also some hints are worth remembering.";
      break;
    case 3:
      gameMessage = "Maybe you need a tool for casting spells.";
      break;
    case 8:
      gameMessage = "Maybe the elf queen would appreciate some music.";
      break;
    default:
      gameMessage = "Try the commands: north, east, south, west,<br>";
      gameMessage += "use *item*, take *item*, drop *item*,<br>";
      gameMessage += "wand, flute, sword, cure, bread, hammer.";
  }
  gameMessage += "<br>";
}

function keydownHandler() {
  if (event.keyCode === 13) {
    playGame();
    //clear the input field
    input.value = "";
  }
}

function setBlockedMessage() {
  gameMessage = blockedPathMessages[mapLocation];
}
