export const animate = (drawFunc) => {
  const initTimestamp = performance.now();
  let previousTimestamp = false;

  const drawFuncContainer = (timestamp) => {
    // Prevent deltaTime from producing huge values when e.g. user switches
    // tabs and then switches back. 20 represents the number of milliseconds
    // between frames when game is running at 50fps. Without the ceiling a
    // single long frame teleports every ball straight through its bounds check
    const deltaTime = Math.min(
      20,
      previousTimestamp
        ? timestamp - previousTimestamp
        : performance.now() - timestamp
    );
    const timeElapsed = timestamp - initTimestamp;
    drawFunc(deltaTime, timeElapsed);
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

export const findBallAtPoint = (balls, { x, y }) => {
  return balls.find((ball) => {
    if (!ball.isPopped()) {
      const dx = x - ball.getPosition().x;
      const dy = y - ball.getPosition().y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < ball.getRadius();
    }
  });
};
