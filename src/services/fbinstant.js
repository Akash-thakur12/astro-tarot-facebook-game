/**
 * Facebook Instant Games Service
 * Handles SDK initialization and player data retrieval
 */

export const isFBInstant = () => {
  if (typeof window === 'undefined' || !window.FBInstant) return false;
  
  // FBInstant.getPlatform() returns null or throws if not in a real FB environment
  try {
    const platform = window.FBInstant.getPlatform();
    return !!platform;
  } catch (e) {
    return false;
  }
};

export const initializeFBInstant = async () => {
  if (!isFBInstant()) {
    console.log('FBInstant SDK not detected. Running in standard web mode.');
    return false;
  }

  try {
    console.log('Initializing FBInstant...');
    
    // Safety timeout: Never let SDK initialization hang the entire app more than 5 seconds
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('FBInstant Timeout')), 5000)
    );

    await Promise.race([
      window.FBInstant.initializeAsync(),
      timeoutPromise
    ]);
    
    // Set initial loading progress
    window.FBInstant.setLoadingProgress(100);
    
    console.log('Starting FBInstant game...');
    await window.FBInstant.startGameAsync();
    
    console.log('FBInstant Ready.');
    return true;
  } catch (error) {
    console.warn('FBInstant Initialization failed or timed out:', error);
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
