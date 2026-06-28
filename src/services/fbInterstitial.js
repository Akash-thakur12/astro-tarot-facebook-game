/**
 * Facebook Instant Games Interstitial Ads Service
 * Single Owner of the Interstitial Ads responsibility.
 */

import { Placements } from './facebook/ads/placements';
import { AdErrors } from './facebook/ads/types';
import { isCooldownActive, setAdShown } from './facebook/ads/cooldown';
import { preloadAd, isAdReady, showAd } from './facebook/ads/lifecycle';
import { logAdEvent } from './facebook/ads/analytics';

/**
 * Preloads an interstitial ad.
 * @param {string} placementId 
 */
export const preloadInterstitial = async (placementId = Placements.INTERSTITIAL.TAROT.id) => {
  return preloadAd(placementId, 'interstitial');
};

/**
 * Shows the preloaded interstitial ad.
 * @param {string} placementId
 * @returns {Promise<boolean>}
 */
export const showInterstitial = async (placementId = Placements.INTERSTITIAL.TAROT.id, user = null) => {
  let actualPlacementId = placementId;
  let currentUser = user;
  if (placementId && typeof placementId === 'object' && 'premium' in placementId) {
    currentUser = placementId;
    actualPlacementId = Placements.INTERSTITIAL.TAROT.id;
  }

  if (currentUser?.premium) {
    console.log("Premium user: Skipping interstitial ad display.");
    return false;
  }

  const config = Object.values(Placements.INTERSTITIAL).find(p => p.id === actualPlacementId);
  const cooldownMs = config ? config.cooldownMs : 60000;

  if (isCooldownActive(actualPlacementId, cooldownMs)) {
    logAdEvent('ad_rejected_cooldown', actualPlacementId, { type: 'interstitial' });
    return false;
  }

  try {
    await showAd(actualPlacementId, 'interstitial');
    setAdShown(actualPlacementId);
    return true;
  } catch (error) {
    if (error.message === 'AD_NOT_READY') {
      console.warn('FAN: Interstitial not ready for placement:', actualPlacementId);
      // Auto-trigger preloading for the next time
      preloadInterstitial(actualPlacementId).catch(() => {});
      return false;
    }
    console.error('FAN: Interstitial show failed:', error);
    preloadInterstitial(actualPlacementId).catch(() => {});
    return false;
  }
};
