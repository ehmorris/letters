export const generateCanvas = ({ width, height, attachNode }) => {
  const element = document.createElement("canvas");
  const context = element.getContext("2d");

  element.style.width = width + "px";
  element.style.height = height + "px";

  const scale = window.devicePixelRatio;
  element.width = Math.floor(width * scale);
  element.height = Math.floor(height * scale);
  context.scale(scale, scale);

  document.querySelector(attachNode).appendChild(element);

  return [context, width, height, element];
};

export const animate = (drawFunc) => {
  let previousTimestamp = false;

  const drawFuncContainer = (timestamp) => {
    const deltaTime = previousTimestamp
      ? timestamp - previousTimestamp
      : performance.now() - timestamp;
    drawFunc(deltaTime);
    window.requestAnimationFrame(drawFuncContainer);
    previousTimestamp = timestamp;
  };

  window.requestAnimationFrame(drawFuncContainer);
};

export const progress = (start, end, current) =>
  (current - start) / (end - start);

export const clampedProgress = (start, end, current) =>
  Math.max(0, Math.min(1, (current - start) / (end - start)));

export const transition = (start, end, progress, easingFunc) => {
  const easedProgress = easingFunc ? easingFunc(progress) : progress;
  return start + Math.sign(end - start) * Math.abs(end - start) * easedProgress;
};

export const degToRag = (degree) => (degree * Math.PI) / 180;

export const randomBool = (probability = 0.5) => Math.random() >= probability;

export const randomBetween = (min, max) => Math.random() * (max - min) + min;

export const forCollidingParticles = (particles, onCollide) => {
  particles.forEach((p1) => {
    const p1Position = p1.getPosition();
    const p1Diameter = p1.getDiameter();

    particles.forEach((p2) => {
      if (p1 !== p2) {
        // Calculate the distance between the centers of the two particles
        const p2Position = p2.getPosition();
        const dx = p2Position.x - p1Position.x;
        const dy = p2Position.y - p1Position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate the sum of the radii
        const radiusSum = p1Diameter / 2 + p2.getDiameter() / 2;

        // If the distance is less than or equal to the sum of the radii, they are colliding
        if (distance <= radiusSum) {
          onCollide(p1, p2);
        }
      }
    });
  });
};
