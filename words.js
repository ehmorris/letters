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
