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

  const collision = (otherParticlePosition, otherParticleVelocity) => {
    const dx = otherParticlePosition.x - position.x;
    const dy = otherParticlePosition.y - position.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate the normal vector (direction of collision)
    const nx = dx / distance;
    const ny = dy / distance;

    // Calculate relative velocity
    const dvx = otherParticleVelocity.x - velocity.x;
    const dvy = otherParticleVelocity.y - velocity.y;

    // Calculate relative velocity in the direction of the normal
    const impactSpeed = dvx * nx + dvy * ny;

    // Calculate and apply the impulse
    const impulse = 2 * impactSpeed;

    velocity.x -= impulse * nx;
    velocity.y -= impulse * ny;
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

  return {
    draw,
    collision,
    getPosition: () => position,
    getVelocity: () => velocity,
    getDiameter: () => width,
  };
};
