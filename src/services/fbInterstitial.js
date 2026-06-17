/**
 * Facebook Instant Games Interstitial Ads Service
 */

let interstitialAd = null;
let isReady = false;
let isPreloading = false;

/**
 * Preloads an interstitial ad
 * @param {string} placementId - The audience network placement ID
 */
export const preloadInterstitial = async (placementId) => {
  if (typeof window === 'undefined' || !window.FBInstant) return;
  if (isReady || isPreloading) return;

  try {
    isPreloading = true;
    console.log('FAN: Preloading interstitial...', placementId);
    
    interstitialAd = await window.FBInstant.getInterstitialAdAsync(placementId);
    await interstitialAd.loadAsync();
    
    isReady = true;
    console.log('FAN: Interstitial ready.');
  } catch (error) {
    console.error('FAN: Interstitial load failed:', error);
    isReady = false;
  } finally {
    isPreloading = false;
  }
};

/**
 * Shows the preloaded interstitial ad
 */
export const showInterstitial = async () => {
  if (!interstitialAd || !isReady) {
    console.warn('FAN: Interstitial not ready');
    return false;
  }

  try {
    await interstitialAd.showAsync();
    isReady = false; // Reset state after showing
    interstitialAd = null;
    return true;
  } catch (error) {
    console.error('FAN: Interstitial show failed:', error);
    return false;
  }
};
