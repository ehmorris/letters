// How long a session runs. A parent taps one of these and hands the phone over
const durationsInMinutes = [3, 5, 8, 12];

export const makeStartScreen = (element, onStart) => {
  const durationList = element.querySelector(".durations");

  durationsInMinutes.forEach((minutes) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "duration";
    button.textContent = minutes;
    button.setAttribute("aria-label", `${minutes} minutes`);

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
