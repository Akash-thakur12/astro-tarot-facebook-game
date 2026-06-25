import { isFBInstant } from '../../fbinstant';
import { retryWithBackoff } from './retry';
import { logAdEvent } from './analytics';

const loadedAds = new Map(); // placementId -> adInstance
const preloadingMap = new Map(); // placementId -> Promise

/**
 * Preloads an ad placement (rewarded or interstitial) and stores the loaded instance.
 * Automatically retries loading using backoff parameters if it fails.
 * 
 * @param {string} placementId 
 * @param {'rewarded'|'interstitial'} type 
 * @returns {Promise<any>} The loaded ad instance or null
 */
export async function preloadAd(placementId, type) {
  if (!isFBInstant()) return null;
  
  if (loadedAds.has(placementId)) {
    return loadedAds.get(placementId);
  }
  
  if (preloadingMap.has(placementId)) {
    return preloadingMap.get(placementId);
  }
  
  const preloadPromise = (async () => {
    try {
      logAdEvent('ad_preload_start', placementId, { type });
      let adInstance;
      
      if (type === 'rewarded') {
        adInstance = await window.FBInstant.getRewardedVideoAsync(placementId);
      } else if (type === 'interstitial') {
        adInstance = await window.FBInstant.getInterstitialAdAsync(placementId);
      } else {
        throw new Error(`Unsupported ad type: ${type}`);
      }
      
      // Load with backoff retry
      await retryWithBackoff(async () => {
        await adInstance.loadAsync();
      }, { maxRetries: 2, initialDelayMs: 2000 });
      
      loadedAds.set(placementId, adInstance);
      logAdEvent('ad_loaded', placementId, { type });
      return adInstance;
    } catch (error) {
      logAdEvent('ad_load_failed', placementId, { type, error: error.message });
      throw error;
    } finally {
      preloadingMap.delete(placementId);
    }
  })();
  
  preloadingMap.set(placementId, preloadPromise);
  return preloadPromise;
}

/**
 * Checks if the ad placement is fully loaded and ready to show.
 * @param {string} placementId 
 * @returns {boolean}
 */
export function isAdReady(placementId) {
  return loadedAds.has(placementId);
}

/**
 * Shows a loaded ad placement. Disposes it after show and triggers subsequent preloads.
 * @param {string} placementId 
 * @param {'rewarded'|'interstitial'} type 
 * @returns {Promise<boolean>} True if shown successfully
 */
export async function showAd(placementId, type) {
  if (!isFBInstant()) {
    console.warn(`[Ad Lifecycle] Not in Facebook Instant context, mock showing ${placementId}`);
    return true;
  }
  
  const adInstance = loadedAds.get(placementId);
  if (!adInstance) {
    logAdEvent('ad_show_attempt_not_ready', placementId, { type });
    throw new Error('AD_NOT_READY');
  }
  
  try {
    logAdEvent('ad_show_start', placementId, { type });
    await adInstance.showAsync();
    logAdEvent('ad_show_success', placementId, { type });
    
    // Consume and dispose
    loadedAds.delete(placementId);
    
    // Auto-preload the next one in background
    preloadAd(placementId, type).catch(() => {});
    return true;
  } catch (error) {
    logAdEvent('ad_show_failed', placementId, { type, error: error.message });
    loadedAds.delete(placementId); // clear corrupted/failed state
    throw error;
  }
}

/**
 * Disposes an ad instance from memory.
 * @param {string} placementId 
 */
export function disposeAd(placementId) {
  if (loadedAds.has(placementId)) {
    loadedAds.delete(placementId);
    logAdEvent('ad_disposed', placementId);
  }
}

/**
 * Disposes all loaded ads.
 */
export function disposeAllAds() {
  loadedAds.clear();
  preloadingMap.clear();
  console.log('[Ad Lifecycle] Disposed all active ads.');
}

// Handle visibility change: reset or preload as needed
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      logAdEvent('app_visible', 'none');
    }
  });
}
