import {
  allPaths,
  advanceFor,
  advanceAt,
  wordBoundingBoxWidth,
  letterBoundingBoxHeight,
  letterBoundingBoxWidth,
} from "./letterPaths.js";

const svgNamespace = "http://www.w3.org/2000/svg";

// The same letterforms the game is drawn in, for the bits of the interface
// that live in the DOM rather than on the canvas. Laid out with the same
// advances, so a word set here matches one set on the canvas
export const makeGlyphSvg = (text, { tabularDigits = false } = {}) => {
  const width = wordBoundingBoxWidth(text, { tabularDigits });
  const svg = document.createElementNS(svgNamespace, "svg");

  svg.setAttribute("viewBox", `0 0 ${width} ${letterBoundingBoxHeight}`);
  // An intrinsic size is what lets CSS scale these down by whichever of width
  // or height runs out first, without the shape going with it
  svg.setAttribute("width", width);
  svg.setAttribute("height", letterBoundingBoxHeight);
  svg.setAttribute("fill", "currentColor");
  // The readable name lives on whatever element this goes into
  svg.setAttribute("aria-hidden", "true");

  let offset = 0;

  text.split("").forEach((character, index) => {
    const pathData = allPaths[character];

    if (pathData) {
      const centering =
        (advanceFor(character, { tabularDigits }) - letterBoundingBoxWidth) / 2;
      const path = document.createElementNS(svgNamespace, "path");
      path.setAttribute("d", pathData);
      path.setAttribute("transform", `translate(${offset + centering} 0)`);
      svg.appendChild(path);
    }

    offset += advanceAt(text, index, { tabularDigits });
  });

  return svg;
};
