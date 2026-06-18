let sounds = {
  cardFlip: null,
  coin: null,
  button: null
};

export const preloadAudio = () => {
  if (typeof window === 'undefined') return;
  if (sounds.cardFlip) return;
  
  sounds.cardFlip = new Audio('/audio/card-flip.mp3');
  sounds.coin = new Audio('/audio/coin.mp3');
  sounds.button = new Audio('/audio/button.mp3');
};

const playSound = (audio) => {
  if (!audio) return;
  try {
    const isMuted = localStorage.getItem('pandit_sound_enabled') === 'false';
    if (isMuted) return;

    audio.currentTime = 0;
    const promise = audio.play();
    if (promise !== undefined) {
      promise.catch(() => { /* Fail silently */ });
    }
  } catch (e) {
    // Fail silently
  }
};

export const playCardFlip = () => playSound(sounds.cardFlip);
export const playCoinSound = () => playSound(sounds.coin);
export const playButtonSound = () => playSound(sounds.button);
