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
let textType = "letter";
let lastLetterUpdate = Date.now();
const initTime = Date.now();

const drawGuides = (CTX) => {
  CTX.save();
  CTX.fillStyle = "red";
  CTX.fillRect(canvasWidth / 2, 0, 1, canvasHeight);
  CTX.fillRect(0, canvasHeight / 2, canvasWidth, 1);
  CTX.fillStyle = "black";
  CTX.restore();
};

const updateText = (newText) => {
  textString = newText.toUpperCase();
  textType = /[a-zA-Z]/.test(newText) ? "letter" : "number";
  lastLetterUpdate = Date.now();
};

const setRandomText = () => {
  const options = "ABCDEFGHIJKLMNOPQRSTUVQXYZ0123456789";
  updateText(options.split("")[Math.floor(Math.random() * options.length)]);
};

document.addEventListener("keypress", ({ key }) => {
  console.log(key);
  const debounceTime = 0;
  if (
    Date.now() - lastLetterUpdate > debounceTime &&
    key.length === 1 &&
    /[a-zA-Z0-9]/.test(key)
  ) {
    updateText(key);
  } else if (key === " ") {
    setRandomText();
  }
});

new FontFace("Ginto", "url(./Ginto.woff2)").load().then((font) => {
  document.fonts.add(font);

  animate((deltaTime) => {
    CTX.clearRect(0, 0, canvasWidth, canvasHeight);

    drawGuides(CTX);

    CTX.save();
    const timeTransitionSize = progress(0, 1600, Date.now() - initTime);
    const timeTransitionRotate = progress(0, 1900, Date.now() - initTime);

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

    CTX.font = `600 ${fontSizeTransition}vmin Ginto`;
    CTX.textAlign = "center";
    CTX.textBaseline = "middle";
    const verticalOffset = CTX.measureText(textString).width / 8;
    CTX.translate(canvasWidth / 2, canvasHeight / 2 + verticalOffset);
    CTX.rotate(angleTransition);
    CTX.fillStyle = textType === "letter" ? "blue" : "red";
    CTX.fillText(textString, 0, 0);

    CTX.restore();
  });
});
