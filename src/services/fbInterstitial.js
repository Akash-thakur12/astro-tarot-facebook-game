/**
 * Facebook Instant Games Interstitial Ads Service
 */

import { INTERSTITIAL_TAROT_ID } from '../config/adConfig';

let interstitialAd = null;
let isReady = false;
let isPreloading = false;
let lastInterstitialTime = 0;
const COOLDOWN_MS = 60000;
let currentPlacementId = INTERSTITIAL_TAROT_ID;

/**
 * Preloads an interstitial ad
 * @param {string} placementId - The audience network placement ID
 */
export const preloadInterstitial = async (placementId = INTERSTITIAL_TAROT_ID) => {
  if (typeof window === 'undefined' || !window.FBInstant) return;
  if (isReady || isPreloading) return;

  try {
    isPreloading = true;
    currentPlacementId = placementId;
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
  if (typeof window === 'undefined' || !window.FBInstant) return false;

  const now = Date.now();
  if (now - lastInterstitialTime < COOLDOWN_MS) {
    console.warn('FAN: Interstitial cooldown active');
    return false;
  }

  if (!interstitialAd || !isReady) {
    console.warn('FAN: Interstitial not ready');
    preloadInterstitial(currentPlacementId);
    return false;
  }

  try {
    await interstitialAd.showAsync();
    lastInterstitialTime = Date.now();
    isReady = false; // Reset state after showing
    interstitialAd = null;
    preloadInterstitial(currentPlacementId);
    return true;
  } catch (error) {
    console.error('FAN: Interstitial show failed:', error);
    isReady = false;
    interstitialAd = null;
    preloadInterstitial(currentPlacementId);
    return false;
  }
};
