// A browser won't restart an <audio> element that's already playing, and
// calling play() on one is a silent no-op. Two pops close together — or a
// multi-touch pop — would drop sounds, so every sound gets a small pool of
// voices that can overlap.
const maxVoicesPerSound = 4;

const makeSound = (path) => {
  const firstVoice = new Audio(path);
  firstVoice.preload = "auto";

  const voices = [firstVoice];
  let stealIndex = 0;

  return () => {
    let voice = voices.find((v) => v.paused || v.ended);

    // Clone instead of building from the path again so the browser can reuse
    // the audio data it already fetched
    if (!voice && voices.length < maxVoicesPerSound) {
      voice = firstVoice.cloneNode();
      voices.push(voice);
    }

    // Every voice is busy, so cut off the oldest one
    if (!voice) {
      voice = voices[stealIndex];
      stealIndex = (stealIndex + 1) % voices.length;
    }

    // Safari throws if currentTime is set before metadata has loaded
    if (voice.readyState > 0) voice.currentTime = 0;

    // play() rejects when the browser blocks playback outside a user gesture,
    // or when a voice is retriggered mid load. Neither is recoverable, and an
    // unhandled rejection just fills the console with noise
    voice.play().catch(() => {});
  };
};

export const makeRandomSoundPlayer = (paths) => {
  const sounds = paths.map(makeSound);
  let lastIndex = -1;

  return () => {
    let index = Math.floor(Math.random() * sounds.length);

    // The same pluck twice in a row reads as a missed sound
    if (index === lastIndex) index = (index + 1) % sounds.length;

    lastIndex = index;
    sounds[index]();
  };
};
