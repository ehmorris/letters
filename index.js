import {
  animate,
  generateCanvas,
  transition,
  progress,
  clampedProgress,
  degToRag,
  randomBetween,
  findBallAtPoint,
} from "./helpers.js";
import {
  makeBall,
  checkBallCollision,
  adjustBallPositions,
  resolveBallCollision,
} from "./ball.js";
import { easeInOutSine, easeOutQuart } from "./easings.js";

const [CTX, canvasWidth, canvasHeight] = generateCanvas({
  width: window.innerWidth,
  height: window.innerHeight,
  attachNode: "#canvas",
});

const initTime = Date.now();
const debounceTime = 400;

const pink = "#e79fae";
const red = "#da4b34";
const yellow = "#f5c347";
const turquoise = "#8bcbf3";
const white = "#fbfbf8";

let textString = "A";
let lastLetterUpdate = Date.now();
let isKeyOrTouchDown = false;
let lastKeydownOrTouchTime = Date.now();
let textColor = pink;
let balls = [];

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
    const widthRequiredForEachBall = canvasWidth / number;
    const maxSize = Math.min(canvasWidth / 4, canvasHeight / 3);
    const minSize = 44;
    const radius = Math.max(
      minSize,
      Math.min(maxSize, widthRequiredForEachBall / 2)
    );

    balls = new Array(number).fill().map(() =>
      makeBall(CTX, canvasWidth, canvasHeight, {
        startPosition: {
          x: randomBetween(canvasWidth / 8, canvasWidth - canvasWidth / 8),
          y: randomBetween(canvasHeight / 8, canvasHeight - canvasHeight / 8),
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

const reduceNumber = () => {
  const newNumber = parseInt(textString) - 1;
  textString = newNumber.toString();
  lastLetterUpdate = Date.now();
};

const setRandomText = () => {
  const options = "ABCDEFGHIJKLMNOPQRSTUVQXYZ0123456789";
  updateText(options.split("")[Math.floor(Math.random() * options.length)]);
};

document.addEventListener("click", ({ clientX: x, clientY: y }) => {
  if (isNumber(textString) && parseInt(textString) > 0) {
    const collidingBall = findBallAtPoint(balls, { x, y });

    if (collidingBall) {
      collidingBall.pop();
      reduceNumber();
    }
  }
});

document.addEventListener("keydown", ({ repeat }) => {
  if (!repeat) {
    isKeyOrTouchDown = true;
    lastKeydownOrTouchTime = Date.now();
  }
});

document.addEventListener("keyup", ({ key }) => {
  isKeyOrTouchDown = false;
  if (Date.now() - lastLetterUpdate > debounceTime) {
    isValidText(key) ? updateText(key) : setRandomText();
  }
});

document.addEventListener(
  "touchstart",
  (e) => {
    if (isNumber(textString) && parseInt(textString) > 0) {
      const allCollidingBalls = [];
      for (let index = 0; index < e.touches.length; index++) {
        const collidingBall = findBallAtPoint(balls, {
          x: e.touches[index].clientX,
          y: e.touches[index].clientY,
        });

        if (collidingBall) allCollidingBalls.push(collidingBall);
      }

      if (allCollidingBalls.length > 0) {
        allCollidingBalls.forEach((ball) => {
          ball.pop();
          reduceNumber();
        });
      } else {
        isKeyOrTouchDown = true;
        lastKeydownOrTouchTime = Date.now();
      }
    } else {
      isKeyOrTouchDown = true;
      lastKeydownOrTouchTime = Date.now();
    }
    e.preventDefault();
  },
  { passive: false }
);

document.addEventListener(
  "touchend",
  (e) => {
    isKeyOrTouchDown = false;
    if (Date.now() - lastLetterUpdate > debounceTime) {
      setRandomText();
    }
    e.preventDefault();
  },
  { passive: false }
);

document.addEventListener("touchmove", (e) => e.preventDefault(), {
  passive: false,
});

animate((deltaTime) => {
  CTX.clearRect(0, 0, canvasWidth, canvasHeight);

  const gentleContinuousSizeTransition = transition(
    0.97,
    1.03,
    progress(0, 1600, Date.now() - initTime),
    easeInOutSine
  );
  const angleTransition = transition(
    degToRag(-2),
    degToRag(2),
    progress(0, 1900, Date.now() - initTime),
    easeInOutSine
  );
  const letterKeydownTransition = transition(
    1,
    0.9,
    clampedProgress(0, 300, Date.now() - lastKeydownOrTouchTime),
    easeOutQuart
  );
  const letterKeyupTransition = transition(
    0.9,
    1,
    clampedProgress(0, 300, Date.now() - lastLetterUpdate),
    easeOutQuart
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

  CTX.save();
  CTX.font = `500 100vmin Ginto`;
  CTX.textAlign = "center";
  CTX.textBaseline = "middle";
  const verticalAdjustment = Math.min(canvasHeight, canvasHeight) / 14;
  CTX.translate(canvasWidth / 2, canvasHeight / 2 + verticalAdjustment);
  CTX.scale(gentleContinuousSizeTransition, gentleContinuousSizeTransition);
  isKeyOrTouchDown
    ? CTX.scale(letterKeydownTransition, letterKeydownTransition)
    : CTX.scale(letterKeyupTransition, letterKeyupTransition);
  CTX.rotate(angleTransition);
  CTX.fillStyle = textColor;
  CTX.fillText(textString, 0, 0);
  CTX.restore();
});
