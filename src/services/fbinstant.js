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
    return false;
  }

  try {
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
    await window.FBInstant.startGameAsync();
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

export const isPaymentsSupported = () => {
  return isFBInstant() && !!window.FBInstant.payments;
};

export const getPaymentsInstance = () => {
  return isPaymentsSupported() ? window.FBInstant.payments : null;
};

export const onPaymentsReady = (callback) => {
  if (isPaymentsSupported()) {
    window.FBInstant.payments.onReady(callback);
  }
};

export const logFBEvent = (eventName, valueToSum = 1, parameters = {}) => {
  if (typeof window !== 'undefined' && window.FBInstant) {
    try {
      window.FBInstant.logEvent(eventName, valueToSum, parameters);
    } catch (e) {
      console.warn("FBInstant logEvent failed:", e);
    }
  }
};
