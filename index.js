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
import { easeInOutSine, easeInOutBack } from "./easings.js";

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
let textColor = pink;
let balls = [];
let explosion = [];

const isValidText = (text) => /[a-zA-Z0-9]/.test(text);
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
    const radius = Math.min(maxSize, widthRequiredForEachBall / 2) - 2;

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
    explosion = [];
  } else {
    balls = [];
    explosion = [];
  }

  lastLetterUpdate = Date.now();
};

const removeBall = (collidingBall) => {
  balls = balls.filter((b) => b !== collidingBall);
  explosion = new Array(80).fill().map(() => {
    const originVelocity = collidingBall.getVelocity();
    const randomAngle = Math.random() * Math.PI * 2;

    return makeBall(CTX, canvasWidth, canvasHeight, {
      startPosition: {
        x:
          collidingBall.getPosition().x +
          Math.cos(randomAngle) * collidingBall.getRadius(),
        y:
          collidingBall.getPosition().y +
          Math.sin(randomAngle) * collidingBall.getRadius(),
      },
      startVelocity: {
        x: randomBetween(originVelocity.x - 3, originVelocity.x + 3),
        y: randomBetween(originVelocity.y - 8, 0),
      },
      radius: randomBetween(1, 4),
      fill: collidingBall.getFill(),
    });
  });
};

const reduceNumber = () => {
  const newNumber = parseInt(textString) - 1;
  textString = newNumber.toString();
  textColor = [yellow, turquoise, white][Math.round(randomBetween(0, 2))];
  lastLetterUpdate = Date.now();
};

const setRandomText = () => {
  const options = "ABCDEFGHIJKLMNOPQRSTUVQXYZ0123456789";
  updateText(options.split("")[Math.floor(Math.random() * options.length)]);
};

document.addEventListener("click", ({ clientX: x, clientY: y }) => {
  if (isNumber(textString) && parseInt(textString) > 1) {
    const collidingBall = findBallAtPoint(balls, { x, y });

    if (collidingBall) {
      removeBall(collidingBall);
      reduceNumber();
    }
  }
});

document.addEventListener("keypress", ({ key }) => {
  if (Date.now() - lastLetterUpdate > debounceTime) {
    isValidText(key) ? updateText(key) : setRandomText();
  }
});

document.addEventListener(
  "touchstart",
  (e) => {
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

  const sizeTransition = transition(
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
  const letterChangeBounce = transition(
    0.9,
    1,
    clampedProgress(0, 200, Date.now() - lastLetterUpdate),
    easeInOutBack
  );

  balls.forEach((ballA) => {
    ballA.update(deltaTime);
    balls.forEach((ballB) => {
      if (ballA !== ballB) {
        const collision = checkBallCollision(ballA, ballB);
        if (collision[0]) {
          adjustBallPositions(ballA, ballB, collision[1]);
          resolveBallCollision(ballA, ballB);
        }
      }
    });
  });

  balls.forEach((b) => b.draw(deltaTime));
  explosion.forEach((e) => {
    e.update(deltaTime);
    e.draw(deltaTime);
  });

  CTX.save();
  CTX.font = `500 100vmin Ginto`;
  CTX.textAlign = "center";
  CTX.textBaseline = "middle";
  const verticalOffset = CTX.measureText(textString).width / 8;
  CTX.translate(canvasWidth / 2, canvasHeight / 2 + verticalOffset);
  CTX.scale(sizeTransition, sizeTransition);
  CTX.scale(letterChangeBounce, letterChangeBounce);
  CTX.rotate(angleTransition);
  CTX.fillStyle = textColor;
  CTX.fillText(textString, 0, 0);
  CTX.restore();
});
