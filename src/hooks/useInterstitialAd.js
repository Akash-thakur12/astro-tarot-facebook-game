import { useState, useEffect, useCallback } from 'react';
import { preloadAd as sdkPreloadAd, showInterstitialAd as sdkShowInterstitial, isAdReady } from '../services/facebook/ads';
import { isFBInstant } from '../services/facebook/fbinstant';

/**
 * Custom React hook to interact with Facebook Interstitial Ads.
 * Handles background loading, status checks, and cooldown rate limit handles.
 * 
 * @param {string} placementId - The interstitial placement ID.
 */
export function useInterstitialAd(placementId) {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkStatus = useCallback(() => {
    setIsReady(isAdReady(placementId));
  }, [placementId]);

  const load = useCallback(async () => {
    if (!isFBInstant()) return;
    setIsLoading(true);
    setError(null);
    try {
      await sdkPreloadAd(placementId, 'interstitial');
      setIsReady(true);
    } catch (err) {
      setError(err.message || err);
      setIsReady(false);
    } finally {
      setIsLoading(false);
    }
  }, [placementId]);

  const show = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await sdkShowInterstitial(placementId);
      checkStatus();
      return result;
    } catch (err) {
      setError(err.message || err);
      checkStatus();
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [placementId, checkStatus]);

  useEffect(() => {
    checkStatus();
    load();
  }, [placementId, load, checkStatus]);

  return {
    isReady: !isFBInstant() ? true : isReady, // Mock true for browser fallback compatibility
    isLoading,
    error,
    showAd: show,
    preloadAd: load
  };
}
