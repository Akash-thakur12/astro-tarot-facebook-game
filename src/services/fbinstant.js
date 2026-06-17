/**
 * Facebook Instant Games Service
 * Handles SDK initialization and player data retrieval
 */

export const isFBInstant = () => {
  return typeof window !== 'undefined' && !!window.FBInstant;
};

export const initializeFBInstant = async () => {
  if (!isFBInstant()) {
    console.log('FBInstant SDK not detected. Running in standard web mode.');
    return false;
  }

  try {
    console.log('Initializing FBInstant...');
    await window.FBInstant.initializeAsync();
    
    // Set initial loading progress
    window.FBInstant.setLoadingProgress(100);
    
    console.log('Starting FBInstant game...');
    await window.FBInstant.startGameAsync();
    
    console.log('FBInstant Ready.');
    return true;
  } catch (error) {
    console.error('FBInstant Initialization failed:', error);
    return false;
  }
};

export const getFBPlayer = () => {
  if (!isFBInstant()) return null;

  try {
    return {
      id: window.FBInstant.player.getID(),
      name: window.FBInstant.player.getName(),
      photo: window.FBInstant.player.getPhoto(),
      locale: window.FBInstant.getLocale(),
      platform: window.FBInstant.getPlatform()
    };
  } catch (error) {
    console.error('Error getting FBPlayer:', error);
    return null;
  }
};
