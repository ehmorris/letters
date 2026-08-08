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
// enough when you're the one it belongs to
const wordsBetweenNames = 3;

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
  // Start high so the very first word of a session is a name
  let sinceLastName = wordsBetweenNames;

  return {
    next: () => {
      if (sinceLastName >= wordsBetweenNames) {
        sinceLastName = 0;
        if (!nameDeck.length) nameDeck = shuffle(names);
        return nameDeck.pop();
      }

      sinceLastName++;
      if (!deck.length) deck = shuffle(words);
      return deck.pop();
    },
  };
};
