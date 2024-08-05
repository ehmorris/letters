import {
  animate,
  generateCanvas,
  transition,
  progress,
  clampedProgress,
  easeInOutSine,
  easeInOutBack,
  degToRag,
  randomBetween,
} from "./helpers.js";

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
let textType = "letter";
let lastLetterUpdate = Date.now();
let letterColor = pink;

const updateText = (newText) => {
  textString = newText.toUpperCase();
  textType = /[a-zA-Z]/.test(newText) ? "letter" : "number";
  letterColor =
    textType === "letter"
      ? [pink, red][Math.round(randomBetween(0, 1))]
      : [yellow, turquoise, white][Math.round(randomBetween(0, 2))];
  lastLetterUpdate = Date.now();
};

const setRandomText = () => {
  const options = "ABCDEFGHIJKLMNOPQRSTUVQXYZ0123456789";
  updateText(options.split("")[Math.floor(Math.random() * options.length)]);
};

document.addEventListener("keypress", ({ key }) => {
  if (
    Date.now() - lastLetterUpdate > debounceTime &&
    key.length === 1 &&
    /[a-zA-Z0-9]/.test(key)
  ) {
    updateText(key);
  } else if (Date.now() - lastLetterUpdate > debounceTime && key === " ") {
    setRandomText();
  }
});

document.addEventListener("touchstart", () => {
  if (Date.now() - lastLetterUpdate > debounceTime) {
    setRandomText();
  }
});

new FontFace("Ginto", "url(./Ginto.woff2)").load().then((font) => {
  document.fonts.add(font);

  animate(() => {
    CTX.clearRect(0, 0, canvasWidth, canvasHeight);

    CTX.save();
    const timeTransitionSize = progress(0, 1600, Date.now() - initTime);
    const timeTransitionRotate = progress(0, 1900, Date.now() - initTime);
    const letterChangeProgress = clampedProgress(
      0,
      200,
      Date.now() - lastLetterUpdate
    );

    const fontSizeTransition = transition(
      97,
      103,
      timeTransitionSize,
      easeInOutSine
    );
    const angleTransition = transition(
      degToRag(-2),
      degToRag(2),
      timeTransitionRotate,
      easeInOutSine
    );
    const letterChangeBounce = transition(
      0.9,
      1,
      letterChangeProgress,
      easeInOutBack
    );

    CTX.font = `600 ${fontSizeTransition}vmin Ginto`;
    CTX.textAlign = "center";
    CTX.textBaseline = "middle";
    const verticalOffset = CTX.measureText(textString).width / 8;
    CTX.translate(canvasWidth / 2, canvasHeight / 2 + verticalOffset);
    CTX.scale(letterChangeBounce, letterChangeBounce);
    CTX.rotate(angleTransition);
    CTX.fillStyle = letterColor;
    CTX.fillText(textString, 0, 0);

    CTX.restore();
  });
});
