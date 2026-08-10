export const pink = "#EA98AA";
export const red = "#DF432A";
export const yellow = "#F4BF2A";
export const turquoise = "#79CAEC";
export const white = "#FCF6E8";

export const background = "#2D2D74";

export const letterColors = [pink, red];
export const numberColors = [yellow, turquoise, white];
export const ballColors = [pink, red, yellow, turquoise, white];

export const randomColor = () =>
  ballColors[Math.floor(Math.random() * ballColors.length)];

// Canvas takes an eight digit hex the same way CSS does, so a color can be
// held back without being split into channels first. Every color here is six
// digit hex, which is what makes that work
export const withAlpha = (color, alpha) =>
  `${color}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;
