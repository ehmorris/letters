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
import { makeRandomSoundPlayer } from "./audio.js";
import {
  allPaths,
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

const pink = "#EA98AA";
const red = "#DF432A";
const yellow = "#F4BF2A";
const turquoise = "#79CAEC";
const white = "#FCF6E8";

const playPluck = makeRandomSoundPlayer([
  "./sounds/pluck1.mp3",
  "./sounds/pluck2.mp3",
  "./sounds/pluck3.mp3",
  "./sounds/pluck4.mp3",
  "./sounds/pluck5.mp3",
  "./sounds/pluck6.mp3",
]);

let textString = "A";
let lastLetterUpdate = Date.now();
let textColor = pink;
let balls = [];
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
    ? [pink, red][Math.round(randomBetween(0, 1))]
    : [yellow, turquoise, white][Math.round(randomBetween(0, 2))];

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
      makeBall(CTX, canvasManager.getWidth(), canvasManager.getHeight(), {
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
        fill: [pink, red, yellow, turquoise, white].filter(
          (color) => color !== textColor
        )[Math.floor(Math.random() * 4)],
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
    playPluck();
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

document.addEventListener("click", ({ clientX: x, clientY: y }) => {
  const collidingBall = findBallAtPoint(balls, { x, y });

  if (collidingBall) popBalls([collidingBall]);
});

document.addEventListener("keydown", ({ repeat }) => {
  if (!repeat) {
    scaleSpring.resetProps();
    scaleSpring.setEndValue(0.9);
  }
});

document.addEventListener("keyup", ({ key }) => {
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

// Balls have to stay tappable now that they gate the next letter. The canvas
// manager registers its own resize listener first, so the size is already new
window.addEventListener("resize", () => {
  balls.forEach((ball) =>
    ball.setCanvasSize(canvasManager.getWidth(), canvasManager.getHeight())
  );
});

animate((deltaTime, timeElapsed) => {
  CTX.clearRect(0, 0, canvasManager.getWidth(), canvasManager.getHeight());
  scaleSpring.update();

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

  balls.forEach((ballA) => {
    if (!ballA.isPopped()) {
      ballA.update(deltaTime);
      balls.forEach((ballB) => {
        if (!ballB.isPopped() && ballA !== ballB) {
          const collision = checkBallCollision(ballA, ballB);
          if (collision[0]) {
            adjustBallPositions(ballA, ballB, collision[1]);
            resolveBallCollision(ballA, ballB);
          }
        }
      });
    }
  });
  balls.forEach((b) => b.draw(deltaTime, 1));

  canvasManager.drawBlock((CTX) => {
    // Centered rotation and scale operations
    CTX.translate(canvasManager.getWidth() / 2, canvasManager.getHeight() / 2);
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
      CTX.stroke(new Path2D(allPaths[textString]));
    } else {
      CTX.fillStyle = textColor;
      CTX.fill(new Path2D(allPaths[textString]));
    }
  });
});
