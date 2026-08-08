import { makeWordPicker } from "./words.js";
import { randomBetween } from "./helpers.js";

export const spelling = "spelling";
export const wordComplete = "wordComplete";
export const numberInterlude = "numberInterlude";

// Nine balls is a lot to keep track of when you're three, and an interlude is
// meant to be a breather between words rather than the main event
const smallestInterlude = 1;
const largestInterlude = 6;

// A session is a loop: spell a word one letter at a time, get the whole word
// back as a celebration, then pop a few balls before the next one
export const makeSequence = () => {
  const picker = makeWordPicker();
  let word = picker.next();
  let letterIndex = 0;
  let interludeNumber = 0;
  let step = spelling;

  const advance = () => {
    if (step === spelling) {
      letterIndex++;
      if (letterIndex >= word.length) step = wordComplete;
    } else if (step === wordComplete) {
      step = numberInterlude;
      interludeNumber = Math.round(
        randomBetween(smallestInterlude, largestInterlude)
      );
    } else {
      word = picker.next();
      letterIndex = 0;
      step = spelling;
    }

    return step;
  };

  return {
    advance,
    getStep: () => step,
    getWord: () => word,
    getLetter: () => word[letterIndex],
    getLetterIndex: () => letterIndex,
    getInterludeNumber: () => interludeNumber,
  };
};
