import { randomBetween } from "./helpers.js";

// Short, concrete things a small kid already has a picture of in their head.
// Between them these use every letter of the alphabet, including the ones a
// pile of three letter words would never reach
const words = [
  "CAT",
  "DOG",
  "SUN",
  "HAT",
  "BUS",
  "CUP",
  "PIG",
  "COW",
  "BED",
  "EGG",
  "FOX",
  "VAN",
  "FISH",
  "FROG",
  "DUCK",
  "BIRD",
  "BEAR",
  "TREE",
  "STAR",
  "MOON",
  "RAIN",
  "CAKE",
  "BALL",
  "BOOK",
  "MILK",
  "SHOE",
  "SOCK",
  "NOSE",
  "JUMP",
  "ZEBRA",
  "QUEEN",
  "TIGER",
  "APPLE",
  "HORSE",
  "TRAIN",
];

const names = ["MILES", "CARY"];

// Saying a word after spelling it goes through its sounds rather than its
// letters — "F, I, S, H... f-i-sh... fish" — so a finished word gets read back
// in chunks as well as in letters. These are the chunks.
//
// Checked one word at a time rather than worked out from a rule. A rule that
// gets the SH of FISH right gets the silent E of CAKE and the split I_E of
// MILES wrong, and a word nobody has looked at is better off with no sound
// pass at all than with a bar under the wrong letters. Words that aren't here
// — the silent E ones, and the ones like CAT whose letters are already their
// sounds — get spelled out and then read whole, which is what every word did
// before this existed.
//
// Blends are grouped where they open a syllable, which is where they're taught
// as one move: the TR of TRAIN, the BR of ZEBRA. The LK of MILK and the MP of
// JUMP close one instead, and both letters are heard, so they're left apart.
const soundGroups = {
  COW: ["C", "OW"],
  EGG: ["E", "GG"],
  FISH: ["F", "I", "SH"],
  FROG: ["FR", "O", "G"],
  DUCK: ["D", "U", "CK"],
  BIRD: ["B", "IR", "D"],
  BEAR: ["B", "EAR"],
  TREE: ["TR", "EE"],
  STAR: ["ST", "AR"],
  RAIN: ["R", "AI", "N"],
  BALL: ["B", "A", "LL"],
  BOOK: ["B", "OO", "K"],
  SHOE: ["SH", "OE"],
  SOCK: ["S", "O", "CK"],
  MOON: ["M", "OO", "N"],
  ZEBRA: ["Z", "E", "BR", "A"],
  QUEEN: ["QU", "EE", "N"],
  TIGER: ["T", "I", "G", "ER"],
  APPLE: ["A", "PP", "LE"],
  TRAIN: ["TR", "AI", "N"],
  CARY: ["C", "AR", "Y"],
};

// A word whose chunks don't add back up to it would put the bar under the
// wrong letters for the rest of the word, so it doesn't get a sound pass
export const soundGroupsFor = (word) => {
  const groups = soundGroups[word];

  return groups && groups.join("") === word ? groups : null;
};

// Your own name showing up once every time a 35 word deck runs out isn't often
// enough when you're the one it belongs to. But on a fixed beat it gets
// predictable, so the gap moves around and a session doesn't always open on one
const fewestWordsBetweenNames = 2;
const mostWordsBetweenNames = 4;

const wordsUntilNextName = () =>
  Math.round(randomBetween(fewestWordsBetweenNames, mostWordsBetweenNames));

const shuffle = (items) => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
};

// Dealing from a shuffled deck rather than picking at random, so the same word
// can't turn up twice in a row
export const makeWordPicker = () => {
  let deck = [];
  let nameDeck = [];
  // Some sessions open on a name, some work up to one
  let wordsUntilName = Math.round(randomBetween(0, mostWordsBetweenNames));

  return {
    next: () => {
      if (wordsUntilName <= 0) {
        wordsUntilName = wordsUntilNextName();
        if (!nameDeck.length) nameDeck = shuffle(names);
        return nameDeck.pop();
      }

      wordsUntilName--;
      if (!deck.length) deck = shuffle(words);
      return deck.pop();
    },
  };
};
