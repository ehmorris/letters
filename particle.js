import { GRAVITY, INTERVAL } from "./constants.js";

export const makeParticle = (
  CTX,
  canvasWidth,
  canvasHeight,
  startPosition,
  startVelocity,
  width,
  height,
  fill,
  customDraw = false
) => {
  const friction = 0.6;
  let position = { ...startPosition };
  let velocity = { ...startVelocity };

  const update = (deltaTime) => {
    const deltaTimeMultiplier = deltaTime / INTERVAL;

    velocity.y += deltaTimeMultiplier * GRAVITY;

    let nextPosition = {
      x: position.x + deltaTimeMultiplier * velocity.x,
      y: position.y + deltaTimeMultiplier * velocity.y,
    };

    if (nextPosition.x > canvasWidth || nextPosition.x - width < 0) {
      velocity.x = velocity.x * -friction;
      velocity.y = velocity.y * friction;
    }

    if (nextPosition.y > canvasHeight || nextPosition.y - height < 0) {
      velocity.x = velocity.x * friction;
      velocity.y = velocity.y * -friction;
    }

    // Recalculate with new velocities
    nextPosition = {
      x: position.x + deltaTimeMultiplier * velocity.x,
      y: position.y + deltaTimeMultiplier * velocity.y,
    };

    position.x = nextPosition.x;
    position.y = nextPosition.y;
  };

  const draw = (deltaTime) => {
    update(deltaTime);

    CTX.save();

    if (customDraw) {
      customDraw(CTX, position, velocity, fill);
    } else {
      CTX.fillStyle = fill;
      CTX.translate(position.x, position.y);
      CTX.beginPath();
      CTX.arc(-width / 2, -height / 2, width / 2, 0, 2 * Math.PI);
      CTX.closePath();
      CTX.fill();
    }

    CTX.restore();
  };

  return { draw, getPosition: () => position, getVelocity: () => velocity };
};
