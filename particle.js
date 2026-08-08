import { GRAVITY, INTERVAL } from "./constants.js";

// Everything that moves is a particle: the balls, the pieces they break into,
// and the fireworks. A particle is deliberately small. A ball used to be built
// out of 60 more balls, so popping a screenful allocated hundreds of full ball
// objects — each one poppable in turn — inside a touch handler
export const makeParticle = (
  canvasManager,
  {
    radius,
    startPosition,
    startVelocity,
    gravity = GRAVITY,
    // Uncapped by default so balls keep the motion they've always had
    terminalVelocity = Infinity,
    // Balls stay on screen. Fireworks launch from below the bottom edge, so
    // bouncing would flip them around before they ever got going
    bounce = false,
  }
) => {
  const particleStart = Date.now();
  let position = { ...startPosition };
  let velocity = { ...startVelocity };

  const update = (deltaTime) => {
    const deltaTimeMultiplier = deltaTime / INTERVAL;
    position.x += deltaTimeMultiplier * velocity.x;
    position.y += Math.min(deltaTimeMultiplier * velocity.y, terminalVelocity);
    velocity.y += deltaTimeMultiplier * gravity;

    if (bounce) {
      if (position.x > canvasManager.getWidth() - radius) {
        position.x = canvasManager.getWidth() - radius;
        velocity.x *= -0.7;
      } else if (position.x < radius) {
        position.x = radius;
        velocity.x *= -0.7;
      }

      if (position.y > canvasManager.getHeight() - radius) {
        position.y = canvasManager.getHeight() - radius;
        velocity.y *= -0.7;
      } else if (position.y < radius) {
        position.y = radius + 1;
        velocity.y *= -0.7;
      }
    }
  };

  // Drawing something that's left the screen costs the same as drawing
  // something that hasn't. Shrinking pieces pass their current radius
  const inViewport = (currentRadius = radius) =>
    position.x < canvasManager.getWidth() + currentRadius &&
    position.x > -currentRadius &&
    position.y < canvasManager.getHeight() + currentRadius &&
    position.y > -currentRadius;

  return {
    update,
    inViewport,
    getDuration: () => Date.now() - particleStart,
    getPosition: () => position,
    getRadius: () => radius,
    getVelocity: () => velocity,
    setPosition: (passedPosition) => (position = passedPosition),
    setVelocity: (passedVelocity) => (velocity = passedVelocity),
  };
};
