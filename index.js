import { makeCanvasManager } from "./canvas.js";
import {
  animate,
  transition,
  progress,
  degToRag,
  randomBetween,
  findBallAtPoint,
} from "./helpers.js";
import { makeSpring } from "./spring.js";
import {
  makeBall,
  checkBallCollision,
  adjustBallPositions,
  resolveBallCollision,
} from "./ball.js";
import { easeInOutSine } from "./easings.js";
import { makeAudioManager } from "./audio.js";
import { makeFirework } from "./firework.js";
import { makeTimer } from "./timer.js";
import { makeStartScreen } from "./startScreen.js";
import { letterColors, numberColors, ballColors } from "./colors.js";
import {
  allPathObjects,
  letterBoundingBoxHeight,
  letterBoundingBoxWidth,
} from "./letterPaths.js";

const canvasManager = makeCanvasManager({
  initialWidth: window.innerWidth,
  initialHeight: window.innerHeight,
  attachNode: "#canvas",
});
const CTX = canvasManager.getContext();

const initTime = Date.now();
const debounceTime = 400;

// A session ends with a fireworks show rather than a screen that just stops
const celebrationDuration = 9000;
const fireworkLaunchInterval = 800;

const audioManager = makeAudioManager();

const start = "start";
const playing = "playing";
const celebrating = "celebrating";
let gameState = start;

let textString = "A";
let lastLetterUpdate = Date.now();
let textColor = letterColors[0];
let balls = [];
let fireworks = [];
let celebrationStart = 0;
let lastFireworkLaunch = 0;
let hasKeyboard = false;
// let correctKeyEntered = false;

const scaleSpring = makeSpring(1, {
  stiffness: 100,
  damping: 10,
  mass: 1.4,
  precision: 350,
});

const isValidText = (text) => /^[a-zA-Z0-9]{1}$/.test(text);
const isLetter = (text) => /[a-zA-Z]/.test(text);
const isNumber = (text) => /[0-9]/.test(text);

const updateText = (newText) => {
  textString = newText.toUpperCase();
  textColor = isLetter(newText)
    ? letterColors[Math.round(randomBetween(0, letterColors.length - 1))]
    : numberColors[Math.round(randomBetween(0, numberColors.length - 1))];

  if (isNumber(newText)) {
    const number = parseInt(newText);
    const widthRequiredForEachBall = canvasManager.getWidth() / number;
    const maxSize = Math.min(
      canvasManager.getWidth() / 4,
      canvasManager.getHeight() / 3
    );
    const minSize = 44;
    const radius = Math.max(
      minSize,
      Math.min(maxSize, widthRequiredForEachBall / 2)
    );

    balls = new Array(number).fill().map(() =>
      makeBall(canvasManager, {
        startPosition: {
          x: randomBetween(
            canvasManager.getWidth() / 8,
            canvasManager.getWidth() - canvasManager.getWidth() / 8
          ),
          y: randomBetween(
            canvasManager.getHeight() / 8,
            canvasManager.getHeight() - canvasManager.getHeight() / 8
          ),
        },
        startVelocity: {
          x: randomBetween(-6, 6),
          y: randomBetween(-6, -2),
        },
        radius,
        fill: ballColors.filter((color) => color !== textColor)[
          Math.floor(Math.random() * (ballColors.length - 1))
        ],
      })
    );
  } else {
    balls = [];
  }

  lastLetterUpdate = Date.now();
};

const unpoppedBalls = () => balls.filter((ball) => !ball.isPopped());

// The number on screen is whatever is left to pop, rather than its own
// countdown that can drift out of sync with the balls
const syncNumberToBalls = () => {
  textString = unpoppedBalls().length.toString();
  lastLetterUpdate = Date.now();
};

const popBalls = (ballsToPop) => {
  ballsToPop.forEach((ball) => {
    ball.pop();
    audioManager.playSequentialPluck();
  });

  syncNumberToBalls();
};

// Missing a ball shouldn't wipe the screen and start over. Once balls are out
// there, the only way forward is to pop all of them
const canChangeText = () =>
  unpoppedBalls().length === 0 && Date.now() - lastLetterUpdate > debounceTime;

const setRandomText = () => {
  const options = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  updateText(options.split("")[Math.floor(Math.random() * options.length)]);
};

const addFireworks = (count) => {
  fireworks = fireworks.concat(
    new Array(count).fill().map(() => makeFirework(canvasManager, audioManager))
  );
  lastFireworkLaunch = Date.now();
};

// Time being up should feel like the end of something good, not like the game
// froze mid-letter
const startCelebration = () => {
  gameState = celebrating;
  celebrationStart = Date.now();
  textString = "";
  balls = [];
  fireworks = [];
  addFireworks(3);
};

const endSession = () => {
  gameState = start;
  fireworks = [];
  timer.stop();
  startScreen.show();
};

const timer = makeTimer(document.querySelector("#timer"));

const startScreen = makeStartScreen(
  document.querySelector("#start-screen"),
  (durationMs) => {
    // The tap that starts a session is also the user gesture an AudioContext
    // needs in order to open at all
    audioManager.initialize();
    audioManager.resetPluckSequence();

    gameState = playing;
    balls = [];
    fireworks = [];
    timer.start(durationMs);
    setRandomText();
  }
);

document.addEventListener("click", ({ clientX: x, clientY: y }) => {
  if (gameState === celebrating) return addFireworks(1);
  if (gameState !== playing) return;

  const collidingBall = findBallAtPoint(balls, { x, y });

  if (collidingBall) popBalls([collidingBall]);
});

document.addEventListener("keydown", ({ repeat }) => {
  if (gameState !== playing) return;

  if (!repeat) {
    scaleSpring.resetProps();
    scaleSpring.setEndValue(0.9);
  }
});

document.addEventListener("keyup", ({ key }) => {
  if (gameState === celebrating) return addFireworks(1);
  if (gameState !== playing) return;

  // hasKeyboard = true;
  scaleSpring.updateProps({ stiffness: 80, damping: 6, mass: 0.9 });
  scaleSpring.setEndValue(1);

  if (canChangeText()) {
    isValidText(key) ? updateText(key) : setRandomText();
  }
});

document.addEventListener(
  "touchstart",
  (e) => {
    // Letting the start screen's taps through is what turns them into the
    // clicks its buttons are listening for
    if (gameState === start) return;

    if (gameState === celebrating) {
      addFireworks(1);
      e.preventDefault();
      return;
    }

    // A Set because two fingers can land on the same ball
    const allCollidingBalls = new Set();

    for (let index = 0; index < e.touches.length; index++) {
      const collidingBall = findBallAtPoint(balls, {
        x: e.touches[index].clientX,
        y: e.touches[index].clientY,
      });

      if (collidingBall) allCollidingBalls.add(collidingBall);
    }

    if (allCollidingBalls.size > 0) {
      popBalls([...allCollidingBalls]);
    } else {
      scaleSpring.resetProps();
      scaleSpring.setEndValue(0.9);
    }

    e.preventDefault();
  },
  { passive: false }
);

document.addEventListener(
  "touchend",
  (e) => {
    if (gameState !== playing) return;

    scaleSpring.updateProps({ stiffness: 80, damping: 6, mass: 0.9 });
    scaleSpring.setEndValue(1);

    if (canChangeText()) {
      setRandomText();
    }
    e.preventDefault();
  },
  { passive: false }
);

document.addEventListener("touchmove", (e) => e.preventDefault(), {
  passive: false,
});

animate((deltaTime, timeElapsed) => {
  CTX.clearRect(0, 0, canvasManager.getWidth(), canvasManager.getHeight());
  scaleSpring.update();

  if (gameState === playing && timer.update()) startCelebration();

  if (gameState === celebrating) {
    const celebrationElapsed = Date.now() - celebrationStart;

    // Keep launching so there's no dead air, but stop early enough that the
    // last burst has time to finish before the screen clears
    if (
      celebrationElapsed < celebrationDuration - 3500 &&
      Date.now() - lastFireworkLaunch > fireworkLaunchInterval
    ) {
      addFireworks(3);
    }

    fireworks.forEach((firework) => firework.draw(deltaTime));
    fireworks = fireworks.filter((firework) => !firework.isGone());

    if (celebrationElapsed > celebrationDuration) endSession();
  }

  const gentleContinuousSizeTransition = transition(
    0.97,
    1.03,
    progress(0, 1600, Date.now() - initTime),
    easeInOutSine
  );
  const continuousRotationTransition = transition(
    degToRag(-2),
    degToRag(2),
    progress(0, 1900, Date.now() - initTime),
    easeInOutSine
  );

  // Drawing a ball is what moves it, so collisions get resolved against where
  // everything came to rest on the previous frame
  balls.forEach((ballA) => {
    if (ballA.isPopped()) return;

    balls.forEach((ballB) => {
      if (!ballB.isPopped() && ballA !== ballB) {
        const collision = checkBallCollision(ballA, ballB);
        if (collision[0]) {
          adjustBallPositions(ballA, ballB, collision[1]);
          resolveBallCollision(ballA, ballB);
        }
      }
    });
  });
  balls.forEach((ball) => ball.draw(deltaTime));

  // A ball that's finished popping is still walked by the collision loop and
  // still handed to draw until it's out of the array
  balls = balls.filter((ball) => !ball.isGone());

  if (textString) {
    canvasManager.drawBlock((CTX) => {
      // Centered rotation and scale operations
      CTX.translate(
        canvasManager.getWidth() / 2,
        canvasManager.getHeight() / 2
      );
      CTX.scale(gentleContinuousSizeTransition, gentleContinuousSizeTransition);
      CTX.scale(scaleSpring.getCurrentValue(), scaleSpring.getCurrentValue());
      CTX.rotate(continuousRotationTransition);

      // Letter placement, scaling, and rendering
      const scaleFactor = Math.min(
        canvasManager.getHeight() / letterBoundingBoxHeight,
        canvasManager.getWidth() / letterBoundingBoxWidth
      );
      CTX.scale(scaleFactor, scaleFactor);
      CTX.translate(-letterBoundingBoxWidth / 2, -letterBoundingBoxHeight / 2);

      if (hasKeyboard) {
        CTX.strokeStyle = textColor;
        CTX.lineCap = "round";
        CTX.lineJoin = "round";
        CTX.setLineDash([4, 3]);
        CTX.lineDashOffset = timeElapsed / 500;
        CTX.stroke(allPathObjects[textString]);
      } else {
        CTX.fillStyle = textColor;
        CTX.fill(allPathObjects[textString]);
      }
    });
  }
});
