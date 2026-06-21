/**
 * Facebook Instant Games Banner Ads Service
 */
import { isFBInstant } from './fbinstant';

let bannerAd = null;
let isReady = false;
let isPreloading = false;
let currentPlacementId = null;

/**
 * Preloads a banner ad
 * @param {string} placementId - The audience network placement ID
 */
export const preloadBanner = async (placementId) => {
  if (!isFBInstant()) return;
  if (isReady || isPreloading) return;

  try {
    isPreloading = true;
    currentPlacementId = placementId;
    bannerAd = await window.FBInstant.getBannerAdAsync(placementId);
    await bannerAd.loadAsync();
    isReady = true;
  } catch (error) {
    console.error('FAN: Banner load failed:', error);
    isReady = false;
  } finally {
    isPreloading = false;
  }
};

/**
 * Shows the preloaded banner ad
 */
export const showBanner = async () => {
  if (!isFBInstant() || !bannerAd || !isReady) {
    console.warn('FAN: Banner not ready for show');
    return false;
  }

  try {
    await bannerAd.showAsync();
    return true;
  } catch (error) {
    console.error('FAN: Banner show failed:', error);
    return false;
  }
};

/**
 * Hides the banner ad
 */
export const hideBanner = async () => {
  if (!isFBInstant() || !bannerAd) return false;

  try {
    await bannerAd.hideAsync();
    return true;
  } catch (error) {
    console.error('FAN: Banner hide failed:', error);
    return false;
  }
};
