// A parent sets this before handing the phone over. The readout is a DOM node
// rather than canvas text: the canvas draws SVG letterforms and has no fonts
// in it, and the DOM gets safe area insets and crisp small text for free
export const makeTimer = (element) => {
  let durationMs = 0;
  let startTime = null;
  let expired = false;
  let lastRenderedSecond = null;

  const isRunning = () => startTime !== null && !expired;

  const getRemaining = () =>
    startTime === null ? durationMs : Math.max(0, durationMs - (Date.now() - startTime));

  const start = (passedDurationMs) => {
    durationMs = passedDurationMs;
    startTime = durationMs > 0 ? Date.now() : null;
    expired = false;
    lastRenderedSecond = null;
    element.hidden = durationMs === 0;
  };

  const stop = () => {
    startTime = null;
    expired = false;
    element.hidden = true;
  };

  // Returns true on the one frame the timer runs out, so the caller can start
  // the celebration exactly once
  const update = () => {
    if (!isRunning()) return false;

    const remaining = getRemaining();
    const totalSeconds = Math.ceil(remaining / 1000);

    // Touching the DOM only when the number actually changes, rather than on
    // all sixty frames a second
    if (totalSeconds !== lastRenderedSecond) {
      lastRenderedSecond = totalSeconds;
      element.textContent = `${Math.floor(totalSeconds / 60)}:${String(
        totalSeconds % 60
      ).padStart(2, "0")}`;
    }

    if (remaining <= 0) {
      expired = true;
      element.hidden = true;
      return true;
    }

    return false;
  };

  return { start, stop, update, isRunning, getRemaining };
};
