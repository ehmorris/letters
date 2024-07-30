import {
  animate,
  generateCanvas,
  transition,
  progress,
  easeInOutSine,
  degToRag,
} from "./helpers.js";

const [CTX, canvasWidth, canvasHeight] = generateCanvas({
  width: window.innerWidth,
  height: window.innerHeight,
  attachNode: "#canvas",
});

let textString = "A";
let lastLetterUpdate = Date.now();
let lastKeyPress = Date.now();

animate((deltaTime) => {
  CTX.clearRect(0, 0, canvasWidth, canvasHeight);

  CTX.fillStyle = "red";
  CTX.fillRect(canvasWidth / 2, 0, 1, canvasHeight);
  CTX.fillRect(0, canvasHeight / 2, canvasWidth, 1);
  CTX.fillStyle = "black";

  CTX.save();
  const timeTransitionSize = progress(0, 1600, Date.now() - lastKeyPress);
  const timeTransitionRotate = progress(0, 1900, Date.now() - lastKeyPress);

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

  CTX.font = `600 ${fontSizeTransition}vmin -apple-system, BlinkMacSystemFont`;
  CTX.textAlign = "center";

  const measurement = CTX.measureText(textString);
  const actualHeight =
    measurement.actualBoundingBoxAscent + measurement.actualBoundingBoxDescent;

  CTX.translate(canvasWidth / 2, canvasHeight / 2);
  CTX.rotate(angleTransition);
  CTX.fillText(textString, 0, actualHeight / 2);
  CTX.restore();
});

document.addEventListener("keypress", ({ key }) => {
  lastKeyPress = Date.now();
  if (
    Date.now() - lastLetterUpdate > 500 &&
    key.length === 1 &&
    /[a-zA-Z0-9]/.test(key)
  ) {
    textString = key.toUpperCase();
    lastLetterUpdate = Date.now();
  }
});
