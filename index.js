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

const isValidText = (text) => /[a-zA-Z0-9]/.test(text);
const isLetter = (text) => /[a-zA-Z]/.test(text);
const updateText = (newText) => {
  textString = newText.toUpperCase();
  letterColor = isLetter(newText)
    ? [pink, red][Math.round(randomBetween(0, 1))]
    : [yellow, turquoise, white][Math.round(randomBetween(0, 2))];
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

document.addEventListener("touchstart", () => {
  if (Date.now() - lastLetterUpdate > debounceTime) {
    setRandomText();
  }
});

animate(() => {
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
