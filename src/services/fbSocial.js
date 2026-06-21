import { isFBInstant } from './fbinstant';

export const shareTarotResult = async (cardName) => {
  if (!isFBInstant()) {
    const text = '🔮 I just discovered my destiny in AstroTarot!\nCan you reveal your future too?';
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AstroTarot',
          text: text,
          url: window.location.origin
        });
        return true;
      } catch (err) {
        console.error("Web share failed", err);
        return false;
      }
    } else {
      try {
        await navigator.clipboard.writeText(text + " " + window.location.origin);
        return true;
      } catch(err) {
        return false;
      }
    }
  }

  try {
    const payload = {
      intent: 'SHARE',
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // 1x1 transparent pixel
      text: '🔮 I just discovered my destiny in AstroTarot!\nCan you reveal your future too?',
      data: { card: cardName },
    };
    
    await window.FBInstant.shareAsync(payload);
    return true;
  } catch (error) {
    console.error("Error sharing to FB:", error);
    throw new Error('Share canceled or failed');
  }
};

export const chooseFriendsContext = async () => {
  if (!isFBInstant()) {
    throw new Error('Play with Friends is only available on Facebook');
  }

  try {
    await window.FBInstant.context.chooseAsync();
    sendChallengeUpdate('Join me in AstroTarot!');
    return true;
  } catch (error) {
    console.error("Error choosing context:", error);
    throw new Error('Failed to open friends list');
  }
};

export const sendChallengeUpdate = async (message) => {
  if (!isFBInstant()) {
    return false;
  }

  try {
    const payload = {
      action: 'CUSTOM',
      cta: 'Play Now',
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      text: message || 'I challenge you to AstroTarot!',
      data: { challenge: true },
      strategy: 'IMMEDIATE',
      notification: 'NO_PUSH'
    };
    await window.FBInstant.updateAsync(payload);
    return true;
  } catch (error) {
    console.error("Error sending update:", error);
    return false;
  }
};
