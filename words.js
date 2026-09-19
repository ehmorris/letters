import { randomBetween } from "./helpers.js";

// Short, concrete things a small kid already has a picture of in their head.
// Between them these use every letter of the alphabet, including the ones a
// pile of three letter words would never reach.
//
// Every word carries the sounds it's made of, because the deck is small enough
// to write them all out and a word can't be added without them. A rule that
// gets the SH of FISH right gets the silent E of CAKE and the split of MILES
// wrong, so none of this is worked out at runtime: it's a list, checked one
// word at a time, and a word whose chunks don't add back up to it is dropped
// rather than drawn.
//
// A word whose sounds are all single letters — CAT, whose letters already are
// its sounds — has nothing to say that spelling it didn't, so it goes straight
// from its letters to being read whole.
//
// Two calls worth knowing about. Blends are grouped where they open a syllable,
// which is where they're taught as one move: the TR of TRAIN, the BR of ZEBRA.
// The MP of JUMP and the LK of MILK close one instead, and both letters are
// heard, so they're left apart. And the silent E words — CAKE, NOSE, HORSE and
// the name MILES — are written out letter by letter and sit the pass out. The E
// makes no sound of its own and the vowel it's changing isn't next to it, so a
// bar under a run of letters can't tell that story. HORSE has an OR in it that
// would otherwise group, and sits out anyway rather than lighting up a letter
// that says nothing.
const words = {
  CAT: ["C", "A", "T"],
  DOG: ["D", "O", "G"],
  SUN: ["S", "U", "N"],
  HAT: ["H", "A", "T"],
  BUS: ["B", "U", "S"],
  CUP: ["C", "U", "P"],
  PIG: ["P", "I", "G"],
  COW: ["C", "OW"],
  BED: ["B", "E", "D"],
  EGG: ["E", "GG"],
  FOX: ["F", "O", "X"],
  VAN: ["V", "A", "N"],
  FISH: ["F", "I", "SH"],
  FROG: ["FR", "O", "G"],
  DUCK: ["D", "U", "CK"],
  BIRD: ["B", "IR", "D"],
  BEAR: ["B", "EAR"],
  TREE: ["TR", "EE"],
  STAR: ["ST", "AR"],
  MOON: ["M", "OO", "N"],
  RAIN: ["R", "AI", "N"],
  CAKE: ["C", "A", "K", "E"],
  BALL: ["B", "A", "LL"],
  BOOK: ["B", "OO", "K"],
  MILK: ["M", "I", "L", "K"],
  SHOE: ["SH", "OE"],
  SOCK: ["S", "O", "CK"],
  NOSE: ["N", "O", "S", "E"],
  JUMP: ["J", "U", "M", "P"],
  ZEBRA: ["Z", "E", "BR", "A"],
  QUEEN: ["QU", "EE", "N"],
  TIGER: ["T", "I", "G", "ER"],
  APPLE: ["A", "PP", "LE"],
  HORSE: ["H", "O", "R", "S", "E"],
  TRAIN: ["TR", "AI", "N"],
};

const names = {
  MILES: ["M", "I", "L", "E", "S"],
  CARY: ["C", "AR", "Y"],
};

// How long a sound is held when a word is being said slowly. Sounding out
// isn't an even beat, and giving it one is what made the pairs feel hurried:
// SH got the same flick as F, when saying it slowly means leaning on it.
//
// A stop is over the moment it starts — there's no holding the CK of DUCK — a
// consonant you can hum runs on for as long as there's breath, a vowel
// stretches furthest of all, and a blend is two sounds where everything else
// here is one. "D, uuu, ck" is the rhythm of DUCK said slowly, and it isn't
// three of anything.
const stopBeat = 500;
const heldBeat = 680;
const vowelBeat = 820;
const blendBeat = 900;

const soundBeats = {
  B: stopBeat, C: stopBeat, D: stopBeat, G: stopBeat, K: stopBeat,
  P: stopBeat, Q: stopBeat, T: stopBeat, X: stopBeat,
  CK: stopBeat, GG: stopBeat, PP: stopBeat,

  F: heldBeat, H: heldBeat, J: heldBeat, L: heldBeat, M: heldBeat,
  N: heldBeat, R: heldBeat, S: heldBeat, V: heldBeat, W: heldBeat,
  Y: heldBeat, Z: heldBeat,
  LE: heldBeat, LL: heldBeat, SH: heldBeat,

  A: vowelBeat, E: vowelBeat, I: vowelBeat, O: vowelBeat, U: vowelBeat,
  AI: vowelBeat, EE: vowelBeat, OE: vowelBeat, OO: vowelBeat, OW: vowelBeat,
  AR: vowelBeat, EAR: vowelBeat, ER: vowelBeat, IR: vowelBeat,

  BR: blendBeat, FR: blendBeat, QU: blendBeat, ST: blendBeat, TR: blendBeat,
};

// A sound nobody has timed is held as long as one you can hum, which is the
// middle of the range and never badly wrong
export const soundBeatFor = (sound) => soundBeats[sound] || heldBeat;

// Saying a word after spelling it goes through its sounds rather than its
// letters — "F, I, S, H... f-i-sh... fish". Nothing here means no second pass:
// either the word is all single letters, or its chunks don't add up to it,
// which would put the bar under the wrong letters for the rest of the word
export const soundGroupsFor = (word) => {
  const groups = { ...words, ...names }[word];

  return groups &&
    groups.join("") === word &&
    groups.some((sound) => sound.length > 1)
    ? groups
    : null;
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
        if (!nameDeck.length) nameDeck = shuffle(Object.keys(names));
        return nameDeck.pop();
      }

      wordsUntilName--;
      if (!deck.length) deck = shuffle(Object.keys(words));
      return deck.pop();
    },
  };
};
