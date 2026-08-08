import { GRAVITY } from "./constants.js";
import { makeParticle } from "./particle.js";
import {
  transition,
  randomBetween,
  clampedProgress,
  getHeadingInRadsFromTwoPoints,
} from "./helpers.js";
import { easeOutCubic } from "./easings.js";

// The ember color a firework's sparks burn at
const sparkColor = "oklch(74.2% 0.2146 50.82)";

export const makeBall = (
  canvasManager,
  {
    startPosition,
    startVelocity,
    radius,
    fill,
    gravity = GRAVITY,
    delay = 0,
    terminalVelocity = Infinity,
    bounce = true,
    // A tapped ball throws its pieces upward and lets gravity bring them back
    // down, which is a gentle pop. A firework has to go off in every direction
    radialPop = false,
  }
) => {
  const CTX = canvasManager.getContext();
  const popAnimationDurationMax = 2400;
  const popAnimationDuration = randomBetween(
    popAnimationDurationMax - 800,
    popAnimationDurationMax
  );
  let popped = false;
  let poppedTime = false;
  let poppedPieces = [];
  let sparks = [];
  let gone = false;

  const baseParticle = makeParticle(canvasManager, {
    radius,
    startPosition,
    startVelocity,
    gravity,
    terminalVelocity,
    bounce,
  });

  const inPlay = () =>
    !popped && !gone && baseParticle.getDuration() >= delay;

  const pop = (popperVelocity = false) => {
    // Two fingers can land on the same ball in one touchstart. Without this
    // the pop animation restarts and the ball counts as popped twice
    if (popped) return;

    popped = true;
    poppedTime = Date.now();

    const transferringVelocity = popperVelocity
      ? popperVelocity
      : baseParticle.getVelocity();

    // A big ball should shatter into more pieces than a small one. A firework
    // is small but still needs enough pieces to read as a burst
    const numberOfPopPieces = radialPop
      ? Math.round(randomBetween(20, 60))
      : Math.round(transition(18, 60, clampedProgress(30, 120, radius)));

    poppedPieces = new Array(numberOfPopPieces).fill().map(() => {
      const randomAngle = Math.random() * Math.PI * 2;
      const randomSpeed = randomBetween(3, 10);

      return {
        // Each piece fades out on its own schedule so they don't all wink out
        // of existence on the same frame
        shrinkDuration: randomBetween(
          popAnimationDurationMax - 800,
          popAnimationDurationMax
        ),
        particle: makeParticle(canvasManager, {
          radius: radialPop
            ? randomBetween(radius / 5, radius / 2)
            : randomBetween(radius / 30, radius / 11),
          startPosition: {
            x: baseParticle.getPosition().x + Math.cos(randomAngle) * radius,
            y: baseParticle.getPosition().y + Math.sin(randomAngle) * radius,
          },
          // Pieces keep some of the velocity of whatever they came from, but
          // mostly head straight out from the center at the given angle
          startVelocity: radialPop
            ? {
                x:
                  transferringVelocity.x / 3 +
                  Math.cos(randomAngle) * randomSpeed,
                y:
                  transferringVelocity.y / 3 +
                  Math.sin(randomAngle) * randomSpeed,
              }
            : {
                x: randomBetween(
                  transferringVelocity.x - 3,
                  transferringVelocity.x + 3
                ),
                y: randomBetween(transferringVelocity.y - 8, 0),
              },
          gravity,
          bounce,
        }),
      };
    });

    // Sparks are the part that actually reads as a firework: long thin embers
    // thrown clear of the burst and falling slowly
    sparks = radialPop
      ? new Array(16).fill().map(() => {
          const randomAngle = Math.random() * Math.PI * 2;
          const randomLength = randomBetween(20, 50);
          const randomSpeedMultiplier = randomBetween(8, 16);

          return makeParticle(canvasManager, {
            radius: randomLength,
            startPosition: {
              x: baseParticle.getPosition().x + Math.cos(randomAngle) * radius,
              y: baseParticle.getPosition().y + Math.sin(randomAngle) * radius,
            },
            startVelocity: {
              x:
                transferringVelocity.x / 3 +
                Math.cos(randomAngle) * randomSpeedMultiplier,
              y:
                transferringVelocity.y / 3 +
                Math.sin(randomAngle) * randomSpeedMultiplier,
            },
            gravity: 0.02,
            terminalVelocity: 110,
          });
        })
      : [];
  };

  const draw = (deltaTime) => {
    if (popped) {
      const timeSincePopped = Date.now() - poppedTime;

      if (timeSincePopped > popAnimationDurationMax) {
        gone = true;
        poppedPieces = [];
        sparks = [];
      } else {
        // Every piece of a ball is the same color, so they can all go into one
        // path and be rasterized in a single fill instead of sixty
        CTX.save();
        CTX.fillStyle = fill;
        CTX.beginPath();

        poppedPieces.forEach(({ particle, shrinkDuration }) => {
          particle.update(deltaTime);

          // Shrinking via the radius rather than a transform is what lets the
          // pieces share a path. clampedProgress matters here: an eased value
          // past 1 would produce a negative radius, which arc() throws on
          const scaledRadius =
            particle.getRadius() *
            transition(
              1,
              0,
              clampedProgress(0, shrinkDuration, timeSincePopped),
              easeOutCubic
            );

          if (scaledRadius > 0 && particle.inViewport(scaledRadius)) {
            const { x, y } = particle.getPosition();
            // Without a moveTo, each arc is joined to the previous one by a line
            CTX.moveTo(x + scaledRadius, y);
            CTX.arc(x, y, scaledRadius, 0, 2 * Math.PI);
          }
        });

        CTX.fill();
        CTX.restore();

        sparks.forEach((spark) => {
          spark.update(deltaTime);

          // A spark's radius stands in for its length
          const length = transition(
            spark.getRadius(),
            0,
            clampedProgress(0, popAnimationDuration, timeSincePopped),
            easeOutCubic
          );

          if (length > 0 && spark.inViewport(length)) {
            const { x, y } = spark.getPosition();
            CTX.save();
            CTX.fillStyle = sparkColor;
            CTX.translate(x, y);
            // Point each ember back at the burst it came from
            CTX.rotate(
              getHeadingInRadsFromTwoPoints(baseParticle.getPosition(), {
                x,
                y,
              })
            );
            CTX.fillRect(0, 0, length, 1);
            CTX.restore();
          }
        });
      }
    } else if (inPlay()) {
      baseParticle.update(deltaTime);

      if (baseParticle.inViewport()) {
        const { x, y } = baseParticle.getPosition();
        CTX.save();
        CTX.fillStyle = fill;
        CTX.beginPath();
        CTX.arc(x, y, radius, 0, 2 * Math.PI);
        CTX.fill();
        CTX.restore();
      }
    }
  };

  return {
    draw,
    pop,
    inPlay,
    getPosition: baseParticle.getPosition,
    getVelocity: baseParticle.getVelocity,
    getRadius: baseParticle.getRadius,
    setPosition: baseParticle.setPosition,
    setVelocity: baseParticle.setVelocity,
    getFill: () => fill,
    isPopped: () => popped,
    isGone: () => gone,
  };
};

export const checkBallCollision = (ballA, ballB) => {
  const rSum = ballA.getRadius() + ballB.getRadius();
  const dx = ballB.getPosition().x - ballA.getPosition().x;
  const dy = ballB.getPosition().y - ballA.getPosition().y;
  return [rSum * rSum > dx * dx + dy * dy, rSum - Math.sqrt(dx * dx + dy * dy)];
};

export const resolveBallCollision = (ballA, ballB) => {
  const relativeVelocity = {
    x: ballB.getVelocity().x - ballA.getVelocity().x,
    y: ballB.getVelocity().y - ballA.getVelocity().y,
  };

  const norm = {
    x: ballB.getPosition().x - ballA.getPosition().x,
    y: ballB.getPosition().y - ballA.getPosition().y,
  };
  const mag = Math.sqrt(norm.x * norm.x + norm.y * norm.y);
  norm.x /= mag;
  norm.y /= mag;

  const velocityAlongNorm =
    relativeVelocity.x * norm.x + relativeVelocity.y * norm.y;

  if (velocityAlongNorm > 0) return;

  const bounce = 0.7;
  let j = -(1 + bounce) * velocityAlongNorm;
  j /= 1 / ballA.getRadius() + 1 / ballB.getRadius();
  const impulse = { x: j * norm.x, y: j * norm.y };

  ballA.setVelocity({
    x: ballA.getVelocity().x - (1 / ballA.getRadius()) * impulse.x,
    y: ballA.getVelocity().y - (1 / ballA.getRadius()) * impulse.y,
  });

  ballB.setVelocity({
    x: ballB.getVelocity().x + (1 / ballB.getRadius()) * impulse.x,
    y: ballB.getVelocity().y + (1 / ballB.getRadius()) * impulse.y,
  });
};

export const adjustBallPositions = (ballA, ballB, depth) => {
  const percent = 0.2;
  const slop = 0.01;
  let correctionNum =
    (Math.max(depth - slop, 0) /
      (1 / ballA.getRadius() + 1 / ballB.getRadius())) *
    percent;

  const norm = {
    x: ballB.getPosition().x - ballA.getPosition().x,
    y: ballB.getPosition().y - ballA.getPosition().y,
  };
  const mag = Math.sqrt(norm.x * norm.x + norm.y * norm.y);
  norm.x /= mag;
  norm.y /= mag;

  const correction = { x: correctionNum * norm.x, y: correctionNum * norm.y };

  ballA.setPosition({
    x: ballA.getPosition().x - (1 / ballA.getRadius()) * correction.x,
    y: ballA.getPosition().y - (1 / ballA.getRadius()) * correction.y,
  });
  ballB.setPosition({
    x: ballB.getPosition().x + (1 / ballB.getRadius()) * correction.x,
    y: ballB.getPosition().y + (1 / ballB.getRadius()) * correction.y,
  });
};
