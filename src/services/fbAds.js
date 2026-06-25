/**
 * Facebook Instant Games Rewarded Video Ads Service
 * Single Owner of the Rewarded Video Ads responsibility.
 */

import { auth } from './firebase';
import { Placements } from './facebook/ads/placements';
import { AdErrors } from './facebook/ads/types';
import { isCooldownActive, setAdShown } from './facebook/ads/cooldown';
import { preloadAd, isAdReady, showAd } from './facebook/ads/lifecycle';
import { logAdEvent } from './facebook/ads/analytics';
import { verifyRewardOnServer } from './facebook/ads/rewardVerifier';

export const isRewardedReady = (placementId = Placements.REWARDED.TAROT_UNLOCK.id) => {
  return isAdReady(placementId);
};

/**
 * Preloads a rewarded video ad.
 * @param {string} placementId 
 */
export const preloadRewardedAd = async (placementId = Placements.REWARDED.TAROT_UNLOCK.id) => {
  return preloadAd(placementId, 'rewarded');
};

/**
 * Shows the preloaded rewarded video ad and calls server signature verification.
 * @param {string} placementId 
 * @returns {Promise<boolean>}
 */
export const showRewardedAd = async (placementId = Placements.REWARDED.TAROT_UNLOCK.id) => {
  const config = Object.values(Placements.REWARDED).find(p => p.id === placementId);
  const cooldownMs = config ? config.cooldownMs : 30000;

  if (isCooldownActive(placementId, cooldownMs)) {
    logAdEvent('ad_rejected_cooldown', placementId, { type: 'rewarded' });
    throw new Error(AdErrors.COOLDOWN_ACTIVE);
  }

  try {
    // Show Facebook ad
    await showAd(placementId, 'rewarded');

    // Callback function to get idToken from Firebase Auth
    const getToken = async () => {
      if (auth.currentUser) {
        return await auth.currentUser.getIdToken(true);
      }
      return null;
    };

    // Call server transaction to verify reward cryptographically and update DB
    logAdEvent('ad_verification_start', placementId);
    const verificationResult = await verifyRewardOnServer(getToken, placementId);

    setAdShown(placementId);
    logAdEvent('ad_reward_granted', placementId, verificationResult);
    return true;
  } catch (error) {
    if (error.message === 'AD_NOT_READY') {
      throw new Error(AdErrors.AD_NOT_READY);
    }
    if (error.message === 'DAILY_LIMIT') {
      throw new Error(AdErrors.DAILY_LIMIT);
    }
    if (error.message === 'DUPLICATE_REWARD') {
      throw new Error(AdErrors.DUPLICATE_REWARD);
    }
    throw error;
  }
};
