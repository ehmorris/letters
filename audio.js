// Sounds are decoded once into AudioBuffers and played through throwaway
// AudioBufferSourceNodes. An <audio> element goes through the media pipeline
// every time it starts, which stalls the main thread for milliseconds — most
// noticeably when several pops land at once, which is exactly what a
// multi-finger pop does
const pluckPaths = [
  "./sounds/pluck1.mp3",
  "./sounds/pluck2.mp3",
  "./sounds/pluck3.mp3",
  "./sounds/pluck4.mp3",
  "./sounds/pluck5.mp3",
  "./sounds/pluck6.mp3",
];

// Everything that isn't a pop is synthesized rather than loaded. The plucks
// are soft mallet hits — a quick attack and a long tail with an octave ringing
// over the fundamental — and a sine pair with the same envelope sits next to
// them without sounding like it came from somewhere else
//
// A major pentatonic, so two of these landing on top of each other — a letter
// lighting up while a firework goes off — is still a chord rather than a clash
const pentatonicSemitones = [0, 2, 4, 7, 9];
const baseFrequency = 523.25;

// Steps climb through the scale and keep climbing into the next octave, so a
// run of notes can be as long as the longest word without running out
const scaleFrequency = (step) => {
  const octave = Math.floor(step / pentatonicSemitones.length);
  const semitones =
    pentatonicSemitones[step % pentatonicSemitones.length] + octave * 12;

  return baseFrequency * Math.pow(2, semitones / 12);
};

export const makeAudioManager = () => {
  let hasInitialized = false;
  let audioCTX;
  let silenceAudio;
  // These hold promises, not buffers, so a sound triggered before its file has
  // finished decoding still plays once it's ready
  let pluckBuffers = [];
  let lastPluckIndex = null;

  async function _loadFile(context, filePath) {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    return context.decodeAudioData(arrayBuffer);
  }

  // Call this from inside a user gesture. Decoding every pluck up front is what
  // keeps the first pop of a session from being the slowest one
  const initialize = () => {
    if (hasInitialized) return;
    hasInitialized = true;

    // Playing silence in a loop in the background through the HTML audio API
    // routes Web Audio to the main sound channel on iOS, rather than the
    // ringer channel
    silenceAudio = new Audio("./sounds/silence.mp3");
    silenceAudio.loop = true;
    silenceAudio.play().catch(() => {});

    audioCTX = new AudioContext();
    pluckBuffers = pluckPaths.map((path) => _loadFile(audioCTX, path));
  };

  async function _playTrack(audioBuffer, loop = false) {
    if (!hasInitialized) initialize();

    try {
      const [, buffer] = await Promise.all([audioCTX.resume(), audioBuffer]);
      const trackSource = new AudioBufferSourceNode(audioCTX, { buffer, loop });
      trackSource.connect(audioCTX.destination);
      trackSource.start();
      return trackSource;
    } catch (e) {
      // A blocked context or a file that failed to decode isn't recoverable,
      // and an unhandled rejection just fills the console with noise
    }
  }

  // One voice: a sine with a quieter octave above it, swelling in a few
  // milliseconds and then decaying the way a struck key does. A linear fade
  // would click at the end; an exponential one lands on silence
  const _playNote = (frequency, startTime, duration, gain) => {
    const envelope = new GainNode(audioCTX, { gain: 0 });
    envelope.connect(audioCTX.destination);
    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    [
      [frequency, 1],
      [frequency * 2, 0.22],
    ].forEach(([partialFrequency, level]) => {
      const oscillator = new OscillatorNode(audioCTX, {
        type: "sine",
        frequency: partialFrequency,
      });
      const partialGain = new GainNode(audioCTX, { gain: level });
      oscillator.connect(partialGain).connect(envelope);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  };

  // Notes are scale steps rather than frequencies, and stagger is the gap
  // between one and the next, which is what makes a chord an arpeggio
  async function _playNotes(
    steps,
    { duration = 0.6, gain = 0.16, stagger = 0 } = {}
  ) {
    if (!hasInitialized) initialize();

    try {
      await audioCTX.resume();

      // Scheduled against the clock as it reads after the resume, so a context
      // that took a moment to open doesn't play the whole run at once
      const startTime = audioCTX.currentTime;

      steps.forEach((step, index) => {
        _playNote(
          scaleFrequency(step),
          startTime + index * stagger,
          duration,
          gain
        );
      });
    } catch (e) {
      // Same as above: a context that won't open isn't worth a console full of
      // rejections
    }
  }

  // Stepping through the plucks in order reads as deliberate when a handful of
  // balls pop together. Picking at random reads like a mistake
  const playSequentialPluck = () => {
    if (!pluckBuffers.length) return;

    lastPluckIndex =
      lastPluckIndex === null
        ? 0
        : (lastPluckIndex + 1) % pluckBuffers.length;

    _playTrack(pluckBuffers[lastPluckIndex]);
  };

  const resetPluckSequence = () => (lastPluckIndex = null);

  // Picking a time limit is the one tap of a session a grown up makes, and it
  // used to be answered by nothing at all. Two notes, so it reads as a door
  // opening rather than as something being confirmed
  const playSessionStart = () => _playNotes([0, 4], { stagger: 0.1 });

  // A new letter or digit arriving. During a word the pitch climbs with the
  // letter's place in it, which is the same thing the bar along the bottom is
  // saying: this is going somewhere and you're partway there
  const playGlyphChange = (step = 0) =>
    _playNotes([step], { duration: 0.45, gain: 0.14 });

  // Each letter of a finished word as it lights up. Short, since the next one
  // is only a beat behind, and climbing so the word is read rather than listed
  const playSpellOutLetter = (index) =>
    _playNotes([index], { duration: 0.4, gain: 0.15 });

  // Sounding a word out, a chunk at a time, after its letters have been said
  // one at a time. The same climb the letters got, further back, so it reads
  // as the same phrase said again rather than as a new one.
  //
  // A note rings for as long as its sound is held rather than for a fixed
  // flick, so a stretched vowel sounds stretched and the rest of the beat is
  // the gap before the next one
  const playSoundGroup = (index, holdMs) =>
    _playNotes([index], { duration: (holdMs * 0.7) / 1000, gain: 0.12 });

  // The word whole, once its sounds have been said. A chord rather than
  // another step up the scale, spread out across about as long as the line
  // under the word takes to draw, so the two land as one gesture
  const playWordSpelled = () =>
    _playNotes([0, 2, 4], { duration: 1.1, gain: 0.13, stagger: 0.2 });

  // Time's up. Rolled out slowly and left to ring under the fireworks, so the
  // end of a session sounds like a wind down rather than a buzzer
  const playSessionEnd = () =>
    _playNotes([0, 2, 4, 7], { duration: 1.8, gain: 0.12, stagger: 0.16 });

  return {
    initialize,
    playSequentialPluck,
    resetPluckSequence,
    playSessionStart,
    playGlyphChange,
    playSpellOutLetter,
    playSoundGroup,
    playWordSpelled,
    playSessionEnd,
  };
};
