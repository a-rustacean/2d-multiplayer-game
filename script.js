import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-auth.js";
import { getDatabase, ref, set, child, get, onDisconnect, onValue, onChildAdded, onChildRemoved } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-database.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyA0GZ9HsjwG58yMpjmga6xr25Fc95PHwrg",
  authDomain: "d-multiplayer-game-da08b.firebaseapp.com",
  databaseURL: "https://d-multiplayer-game-da08b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "d-multiplayer-game-da08b",
  storageBucket: "d-multiplayer-game-da08b.appspot.com",
  messagingSenderId: "573964473164",
  appId: "1:573964473164:web:4c451da6471f5bb9e635e9"
};

const app = initializeApp(firebaseConfig);

var map = document.querySelector(".map");

const db = getDatabase(app);
const auth = getAuth(app);
let playerUid, playerRef;
const players = {};

function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function createName() {
  const prefix = randomFromArray([
    "Good",
    "Bad",
    "Angry",
    "Peaceful",
    "Legendry",
    "Noob",
    "Pro"
  ]);
  const animals = randomFromArray([
    "dog",
    "cat",
    "bear",
    "panda",
    "donkey",
    "cube"
  ]);

  return `${prefix}_${animals}`
}

const playerColors = ['white', 'pink', 'red', 'green', 'yellow', 'brown'];

signInAnonymously(auth).then(() => { }).catch((error) => {
  const errorCode = error.code;
  const errorMessage = error.message;

  console.error(errorCode, errorMessage);
});

function setPlayer() {

  var map = document.querySelector(".map");

  //start in the middle of the map
  var x = 90;
  var y = 34;
  var held_directions = []; //State of which arrow keys we are holding down
  var speed = 1; //How fast the character moves in pixels per frame

  const placeCharacter = () => {

    var pixelSize = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--pixel-size')
    );

    const held_direction = held_directions[0];
    if (held_direction) {
      if (held_direction === directions.right) { x += speed; }
      if (held_direction === directions.left) { x -= speed; }
      if (held_direction === directions.down) { y += speed; }
      if (held_direction === directions.up) { y -= speed; }

      players[playerUid].facing = held_direction;

    }
    players[playerUid].walking = held_direction ? "true" : "false";

    //Limits (gives the illusion of walls)
    var leftLimit = -8;
    var rightLimit = (16 * 11) + 8;
    var topLimit = -8 + 32;
    var bottomLimit = (16 * 7);
    if (x < leftLimit) { x = leftLimit; }
    if (x > rightLimit) { x = rightLimit; }
    if (y < topLimit) { y = topLimit; }
    if (y > bottomLimit) { y = bottomLimit; }


    var camera_left = pixelSize * 66;
    var camera_top = pixelSize * 42;

    map.style.transform = `translate3d( ${-x * pixelSize + camera_left}px, ${-y * pixelSize + camera_top}px, 0 )`;
    players[playerUid].x = x;
    players[playerUid].y = y;

    set(playerRef, players[playerUid]);
  }


  //Set up the game loop
  const step = () => {
    placeCharacter();
    window.requestAnimationFrame(() => {
      step();
    })
  }
  step(); //kick off the first step!



  /* Direction key state */
  const directions = {
    up: "up",
    down: "down",
    left: "left",
    right: "right",
  }
  const keys = {
    38: directions.up,
    37: directions.left,
    39: directions.right,
    40: directions.down,
  }
  document.addEventListener("keydown", (e) => {
    var dir = keys[e.which];
    if (dir && held_directions.indexOf(dir) === -1) {
      held_directions.unshift(dir)
    }
  })

  document.addEventListener("keyup", (e) => {
    var dir = keys[e.which];
    var index = held_directions.indexOf(dir);
    if (index > -1) {
      held_directions.splice(index, 1)
    }
  });



  /* BONUS! Dpad functionality for mouse and touch */
  var isPressed = false;
  const removePressedAll = () => {
    document.querySelectorAll(".dpad-button").forEach(d => {
      d.classList.remove("pressed")
    })
  }
  document.body.addEventListener("mousedown", () => {
    isPressed = true;
  })
  document.body.addEventListener("mouseup", () => {
    isPressed = false;
    held_directions = [];
    removePressedAll();
  })
  const handleDpadPress = (direction, click) => {
    if (click) {
      isPressed = true;
    }
    held_directions = (isPressed) ? [direction] : []

    if (isPressed) {
      removePressedAll();
      document.querySelector(".dpad-" + direction).classList.add("pressed");
    }
  }
  //Bind a ton of events for the dpad
  document.querySelector(".dpad-left").addEventListener("touchstart", (e) => handleDpadPress(directions.left, true));
  document.querySelector(".dpad-up").addEventListener("touchstart", (e) => handleDpadPress(directions.up, true));
  document.querySelector(".dpad-right").addEventListener("touchstart", (e) => handleDpadPress(directions.right, true));
  document.querySelector(".dpad-down").addEventListener("touchstart", (e) => handleDpadPress(directions.down, true));

  document.querySelector(".dpad-left").addEventListener("mousedown", (e) => handleDpadPress(directions.left, true));
  document.querySelector(".dpad-up").addEventListener("mousedown", (e) => handleDpadPress(directions.up, true));
  document.querySelector(".dpad-right").addEventListener("mousedown", (e) => handleDpadPress(directions.right, true));
  document.querySelector(".dpad-down").addEventListener("mousedown", (e) => handleDpadPress(directions.down, true));

  document.querySelector(".dpad-left").addEventListener("mouseover", (e) => handleDpadPress(directions.left));
  document.querySelector(".dpad-up").addEventListener("mouseover", (e) => handleDpadPress(directions.up));
  document.querySelector(".dpad-right").addEventListener("mouseover", (e) => handleDpadPress(directions.right));
  document.querySelector(".dpad-down").addEventListener("mouseover", (e) => handleDpadPress(directions.down));

}

function initGame() {


  const allPlayersRef = ref(db, 'players');
  const allCharacterElements = {};
  let isSettedPlayer = false;
  onValue(allPlayersRef, (snapshot) => {
    players = snapshot.val() || {};
    if (!isSettedPlayer) {
      setPlayer();
      isSettedPlayer = true;
    }
    Object.keys(players).forEach((key) => {
      const player = players[key];
      const el = allCharacterElements[key];

      var pixelSize = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--pixel-size')
      );

      el.querySelector('.Character_name').innerText = player.name;
      el.setAttribute('facing', player.facing);
      el.setAttribute('walking', player.walking);
      const left = pixelSize * player.x + 'px';
      const top = pixelSize * player.y + 'px';
      el.style.transform = `translate3d(${left}, ${top}, 0)`;
    });
  });
  onChildAdded(allPlayersRef, (snapshot) => {
    const addedPlayer = snapshot.val();
    const characterElement = document.createElement('div');
    characterElement.classList.add('character', 'grid-cell');


    if (addedPlayer.uid == playerUid) {
      characterElement.classList.add('you');
    }

    characterElement.innerHTML = (`
      <div class="shadow pixel-art"></div>
      <div class="character_spritesheet pixel-art"></div>
      <div class="Character_name-container" >
        <span class="Character_name" ></span>
      </div>
      <div class="Character_you-arrow" ></div>
    `);

    allCharacterElements[addedPlayer.uid] = characterElement;

    characterElement.querySelector(".Character_name").innerText = addedPlayer.name;
    characterElement.setAttribute('facing', addedPlayer.facing);
    characterElement.setAttribute('walking', addedPlayer.walking);
    var pixelSize = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--pixel-size')
    );
    const left = pixelSize * addedPlayer.x + 'px';
    const top = pixelSize * addedPlayer.y + 'px';
    characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;

    map.appendChild(characterElement);
  });
  onChildRemoved(allPlayersRef, (snapshot) => {
    const key = snapshot.val().uid;
    map.removeChild(allCharacterElements[key]);
    delete allCharacterElements[key];
  })

}


onAuthStateChanged(auth, (user) => {
  if (user) {

    playerUid = user.uid;
    playerRef = ref(db, `players/${playerUid}`);
    const name = createName();
    set(playerRef, {
      uid: playerUid,
      name: name,
      color: randomFromArray(playerColors),
      x: 88,
      y: 32,
      facing: "down",
      walking: false
    });
    onDisconnect(playerRef).remove();
    initGame();
  }
});
