import { useState, useEffect, useCallback } from 'react';
import { preloadAd as sdkPreloadAd, showRewardedAd as sdkShowRewarded, isAdReady } from '../services/facebook/ads';
import { isFBInstant } from '../services/facebook/fbinstant';

/**
 * Custom React hook to interact with Facebook Rewarded Video Ads.
 * Handles state tracking, background preloading, and server reward claims.
 * 
 * @param {string} placementId - The rewarded video placement ID.
 * @param {function} getToken - Callback to retrieve user authentication token.
 */
export function useRewardedAd(placementId, getToken) {
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
      await sdkPreloadAd(placementId, 'rewarded');
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
      const result = await sdkShowRewarded(placementId, getToken);
      checkStatus();
      return result;
    } catch (err) {
      setError(err.message || err);
      checkStatus();
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [placementId, getToken, checkStatus]);

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
