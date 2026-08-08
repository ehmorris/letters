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
