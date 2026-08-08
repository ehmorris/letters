import { makeGlyphSvg } from "./glyphElement.js";

// How long a session runs. A parent taps one of these and hands the phone over.
// 0 is no limit: no countdown, no fireworks, play until someone stops it
const durationsInMinutes = [3, 5, 8, 12, 0];

export const makeStartScreen = (element, onStart) => {
  const durationList = element.querySelector(".durations");

  durationsInMinutes.forEach((minutes) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "duration";
    button.appendChild(makeGlyphSvg(minutes === 0 ? "NONE" : String(minutes)));
    button.setAttribute(
      "aria-label",
      minutes === 0 ? "No time limit" : `${minutes} minutes`
    );

    button.addEventListener("click", (e) => {
      // The game listens for clicks on the document. Without this, the tap that
      // starts a session carries on into the session and pops a ball
      e.stopPropagation();

      element.hidden = true;
      onStart(minutes * 60 * 1000);
    });

    durationList.appendChild(button);
  });

  return {
    show: () => (element.hidden = false),
    hide: () => (element.hidden = true),
    isShowing: () => !element.hidden,
  };
};
