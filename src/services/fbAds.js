/**
 * Facebook Instant Games Rewarded Video Ads Service
 */

let rewardedAd = null;
let isReady = false;
let isPreloading = false;

export const isRewardedReady = () => isReady;

/**
 * Preloads a rewarded video ad
 * @param {string} placementId - The audience network placement ID
 */
export const preloadRewardedAd = async (placementId) => {
  if (typeof window === 'undefined' || !window.FBInstant) return;
  if (isReady || isPreloading) return;

  try {
    isPreloading = true;
    rewardedAd = await window.FBInstant.getRewardedVideoAsync(placementId);
    await rewardedAd.loadAsync();
    isReady = true;
  } catch (error) {
    console.error('FAN: Rewarded video load failed:', error);
    isReady = false;
  } finally {
    isPreloading = false;
  }
};

/**
 * Shows the preloaded rewarded video ad
 * @returns {Promise<boolean>} True if ad was watched to completion
 */
export const showRewardedAd = async () => {
  if (!rewardedAd || !isReady) {
    console.warn('FAN: Rewarded ad not ready');
    return false;
  }

  try {
    await rewardedAd.showAsync();
    // Ad watched to completion
    isReady = false; // Reset state after showing
    rewardedAd = null;
    return true;
  } catch (error) {
    console.error('FAN: Rewarded ad show failed or dismissed:', error);
    return false;
  }
};
