import { makeCanvasManager } from "./canvas.js";
import {
  animate,
  transition,
  progress,
  clampedProgress,
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
import { easeInOutSine, easeOutElastic } from "./easings.js";
import { makeAudioManager } from "./audio.js";
import { makeFirework } from "./firework.js";
import { makeTimer } from "./timer.js";
import { makeStartScreen } from "./startScreen.js";
import {
  makeSequence,
  spelling,
  wordComplete,
  numberInterlude,
} from "./sequence.js";
import { letterColors, numberColors, ballColors } from "./colors.js";
import {
  allPathObjects,
  fillWord,
  wordBoundingBoxWidth,
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

const wordEntranceDuration = 900;

// The word along the bottom is a fraction of the size of the one that fills
// the screen, and tracking that reads as tight and deliberate at display size
// reads as clumped at this one
const progressTracking = { extraTracking: 16 };

// A session ends with a fireworks show rather than a screen that just stops.
// Eight at a time is what bubbles launches, and since each one carries its own
// delay of up to 1.2s a batch steps itself out rather than going up as a wall
const fireworksPerBatch = 8;
const fireworkRounds = 3;
// Long enough that a batch has mostly finished before the next one goes up.
// Stacking them closer just puts more on screen at once than anyone can watch
const fireworkLaunchInterval = 2600;

// Stacked lines are set closer together than a full glyph box, since the ink
// only fills the middle of it
const lineAdvance = 96;

const audioManager = makeAudioManager();
const sequence = makeSequence();

const start = "start";
const playing = "playing";
const celebrating = "celebrating";
let gameState = start;

let displayLines = [];
let textColor = letterColors[0];
let balls = [];
let fireworks = [];
let entranceStart = 0;
let fireworkRoundsLaunched = 0;
let lastStepChange = Date.now();
let lastFireworkLaunch = 0;

const scaleSpring = makeSpring(1, {
  stiffness: 100,
  damping: 10,
  mass: 1.4,
  precision: 350,
});

const randomFrom = (options) =>
  options[Math.floor(Math.random() * options.length)];

// Letters and numbers come and go too fast for a repeat to register, but a
// celebration is a moment — two in a row in the same color reads as a bug
let lastCelebrationColor = null;

const nextCelebrationColor = () => {
  lastCelebrationColor = randomFrom(
    ballColors.filter((color) => color !== lastCelebrationColor)
  );

  return lastCelebrationColor;
};

const spawnBalls = (number) => {
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

  return new Array(number).fill().map(() =>
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
      fill: randomFrom(ballColors.filter((color) => color !== textColor)),
    })
  );
};

const showCurrentStep = () => {
  const step = sequence.getStep();

  if (step === spelling) {
    displayLines = [sequence.getLetter()];
    textColor = randomFrom(letterColors);
    balls = [];
  } else if (step === wordComplete) {
    displayLines = [`${sequence.getWord()}!`];
    // A finished word takes a turn through the whole palette the same way a
    // single letter does, rather than always arriving in yellow
    textColor = nextCelebrationColor();
    balls = [];
    entranceStart = Date.now();
    addFireworks(fireworksPerBatch);
  } else {
    const number = sequence.getInterludeNumber();
    displayLines = [String(number)];
    textColor = randomFrom(numberColors);
    balls = spawnBalls(number);
  }

  lastStepChange = Date.now();
};

const unpoppedBalls = () => balls.filter((ball) => !ball.isPopped());

// The number on screen is whatever is left to pop, rather than its own
// countdown that can drift out of sync with the balls
const syncNumberToBalls = () => {
  displayLines = [unpoppedBalls().length.toString()];
  lastStepChange = Date.now();
};

const popBalls = (ballsToPop) => {
  ballsToPop.forEach((ball) => {
    ball.pop();
    audioManager.playSequentialPluck();
  });

  syncNumberToBalls();
};

// A finished word waits for a tap like everything else, but it gets long
// enough on screen to land its entrance before a stray one can move past it
const minimumOnScreen = () =>
  sequence.getStep() === wordComplete ? wordEntranceDuration : debounceTime;

// Missing a ball shouldn't wipe the screen and start over. Once balls are out
// there, the only way forward is to pop all of them
const canAdvance = () =>
  unpoppedBalls().length === 0 &&
  Date.now() - lastStepChange > minimumOnScreen();

const advanceSequence = () => {
  if (!canAdvance()) return;

  sequence.advance();
  showCurrentStep();
};

// With a keyboard, spelling a word means typing it. Everywhere else — the
// celebration, the count left after the last ball — any key will do
const keyAdvancesSequence = (key) =>
  sequence.getStep() === spelling
    ? key.toUpperCase() === sequence.getLetter()
    : true;

const addFireworks = (count) => {
  fireworks = fireworks.concat(
    new Array(count).fill().map(() => makeFirework(canvasManager, audioManager))
  );
  lastFireworkLaunch = Date.now();
};

// Time being up should feel like the end of something good, not like the game
// froze mid-letter. The screen stays here afterwards: nobody needs to be asked
// a question at the end of a session, and taps still set off more fireworks
const startCelebration = () => {
  gameState = celebrating;
  displayLines = ["ALL", "DONE"];
  textColor = nextCelebrationColor();
  entranceStart = Date.now();
  balls = [];
  fireworks = [];
  fireworkRoundsLaunched = 0;
  timer.stop();
  launchFireworkRound();
};

const launchFireworkRound = () => {
  fireworkRoundsLaunched++;
  addFireworks(fireworksPerBatch);
};

const timer = makeTimer(document.querySelector("#timer"));

// Shown once on load and never again — a session ends on ALL DONE, not back
// at a question
makeStartScreen(
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
    showCurrentStep();
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

  // Every key gets the squash, right or wrong, so a miss still feels like
  // something happened
  if (!repeat) {
    scaleSpring.resetProps();
    scaleSpring.setEndValue(0.9);
  }
});

document.addEventListener("keyup", ({ key }) => {
  if (gameState === celebrating) return addFireworks(1);
  if (gameState !== playing) return;

  scaleSpring.updateProps({ stiffness: 80, damping: 6, mass: 0.9 });
  scaleSpring.setEndValue(1);

  if (keyAdvancesSequence(key)) advanceSequence();
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

    // No keyboard to type on, so any tap moves the word along
    advanceSequence();
    e.preventDefault();
  },
  { passive: false }
);

document.addEventListener("touchmove", (e) => e.preventDefault(), {
  passive: false,
});

// The word so far, small and dim along the bottom, so a run of letters reads
// as a word being built rather than letters that happen to be in order
const drawSpellingProgress = () => {
  const word = sequence.getWord();
  const letterIndex = sequence.getLetterIndex();
  const glyphHeight = Math.min(30, canvasManager.getHeight() / 22);
  const scaleFactor = glyphHeight / letterBoundingBoxHeight;
  const width = wordBoundingBoxWidth(word, progressTracking) * scaleFactor;

  canvasManager.drawBlock((CTX) => {
    CTX.translate(
      canvasManager.getWidth() / 2 - width / 2,
      canvasManager.getHeight() - glyphHeight * 2.2
    );
    CTX.scale(scaleFactor, scaleFactor);

    fillWord(
      CTX,
      word,
      (index) =>
        index < letterIndex
          ? "rgba(252, 246, 232, .7)"
          : "rgba(252, 246, 232, .2)",
      progressTracking
    );
  });
};

animate((deltaTime) => {
  CTX.clearRect(0, 0, canvasManager.getWidth(), canvasManager.getHeight());
  scaleSpring.update();

  if (gameState === playing && timer.update()) startCelebration();

  if (
    gameState === celebrating &&
    fireworkRoundsLaunched < fireworkRounds &&
    Date.now() - lastFireworkLaunch > fireworkLaunchInterval
  ) {
    launchFireworkRound();
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

  fireworks.forEach((firework) => firework.draw(deltaTime));
  fireworks = fireworks.filter((firework) => !firework.isGone());

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

  if (displayLines.length) {
    // A lone letter or digit fills the screen edge to edge. Anything longer is
    // a word, which gets a margin and an entrance
    const isSingleGlyph =
      displayLines.length === 1 && displayLines[0].length === 1;
    const lineWidths = displayLines.map(wordBoundingBoxWidth);
    const contentWidth = isSingleGlyph
      ? letterBoundingBoxWidth
      : Math.max(...lineWidths);
    const contentHeight =
      (displayLines.length - 1) * lineAdvance + letterBoundingBoxHeight;

    canvasManager.drawBlock((CTX) => {
      // Centered rotation and scale operations
      CTX.translate(
        canvasManager.getWidth() / 2,
        canvasManager.getHeight() / 2
      );
      CTX.scale(gentleContinuousSizeTransition, gentleContinuousSizeTransition);
      CTX.scale(scaleSpring.getCurrentValue(), scaleSpring.getCurrentValue());
      CTX.rotate(continuousRotationTransition);

      if (!isSingleGlyph) {
        const entrance = transition(
          0.4,
          1,
          clampedProgress(0, wordEntranceDuration, Date.now() - entranceStart),
          easeOutElastic
        );
        CTX.scale(entrance, entrance);
      }

      // Word placement, scaling, and rendering
      const scaleFactor = Math.min(
        (canvasManager.getHeight() * (isSingleGlyph ? 1 : 0.9)) / contentHeight,
        (canvasManager.getWidth() * (isSingleGlyph ? 1 : 0.9)) / contentWidth
      );
      CTX.scale(scaleFactor, scaleFactor);
      CTX.translate(-contentWidth / 2, -contentHeight / 2);

      if (isSingleGlyph) {
        CTX.fillStyle = textColor;
        CTX.fill(allPathObjects[displayLines[0]]);
      } else {
        displayLines.forEach((line, index) => {
          CTX.save();
          // Each line centered against the widest one
          CTX.translate(
            (contentWidth - lineWidths[index]) / 2,
            index * lineAdvance
          );
          fillWord(CTX, line, textColor);
          CTX.restore();
        });
      }
    });
  }

  if (gameState === playing && sequence.getStep() === spelling) {
    drawSpellingProgress();
  }
});
