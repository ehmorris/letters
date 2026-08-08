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

  return { initialize, playSequentialPluck, resetPluckSequence };
};
