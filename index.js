import {
  animate,
  generateCanvas,
  transition,
  progress,
  clampedProgress,
  degToRag,
  randomBetween,
} from "./helpers.js";
import { easeInOutSine, easeInOutBack } from "./easings.js";
import { makeParticle } from "./particle.js";

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
let letterColor = pink;
let particles = [];

const isValidText = (text) => /[a-zA-Z0-9]/.test(text);
const isLetter = (text) => /[a-zA-Z]/.test(text);
const isNumber = (text) => /[0-9]/.test(text);

const updateText = (newText) => {
  textString = newText.toUpperCase();
  letterColor = isLetter(newText)
    ? [pink, red][Math.round(randomBetween(0, 1))]
    : [yellow, turquoise, white][Math.round(randomBetween(0, 2))];

  if (isNumber(newText)) {
    const number = parseInt(newText);
    const size = Math.min(canvasHeight, canvasWidth) / 8;
    particles = new Array(number).fill().map(() =>
      makeParticle(
        CTX,
        canvasWidth,
        canvasHeight,
        {
          x: randomBetween(canvasWidth / 8, canvasWidth - canvasWidth / 8),
          y: randomBetween(canvasHeight / 8, canvasHeight - canvasHeight / 8),
        },
        { x: randomBetween(-3, 3), y: randomBetween(-4, -2) },
        size,
        size,
        [pink, red, yellow, turquoise, white].filter(
          (color) => color !== letterColor
        )[Math.floor(Math.random() * 4)]
      )
    );
  } else {
    particles = [];
  }

  lastLetterUpdate = Date.now();
};

const setRandomText = () => {
  const options = "ABCDEFGHIJKLMNOPQRSTUVQXYZ0123456789";
  updateText(options.split("")[Math.floor(Math.random() * options.length)]);
};

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

  particles.forEach((particle) => particle.draw(deltaTime));

  CTX.save();
  CTX.font = `500 100vmin Ginto`;
  CTX.textAlign = "center";
  CTX.textBaseline = "middle";
  const verticalOffset = CTX.measureText(textString).width / 8;
  CTX.translate(canvasWidth / 2, canvasHeight / 2 + verticalOffset);
  CTX.scale(sizeTransition, sizeTransition);
  CTX.scale(letterChangeBounce, letterChangeBounce);
  CTX.rotate(angleTransition);
  CTX.fillStyle = letterColor;
  CTX.fillText(textString, 0, 0);
  CTX.restore();
});
