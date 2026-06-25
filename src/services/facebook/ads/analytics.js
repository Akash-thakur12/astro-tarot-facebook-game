import { isFBInstant } from '../../fbinstant';

/**
 * Logs ad events locally and reports them to Facebook Instant Games custom analytics events.
 * Never performs billing or grants rewards.
 * 
 * @param {string} eventName - e.g. ad_preload, ad_loaded, ad_show_failed, ad_completed
 * @param {string} placementId - The FB ad placement ID
 * @param {object} [parameters] - Additional custom metadata parameters
 */
export function logAdEvent(eventName, placementId, parameters = {}) {
  console.log(`[Ad Analytics] Event: ${eventName}, Placement: ${placementId}`, parameters);
  
  if (isFBInstant() && window.FBInstant) {
    try {
      const params = {
        placementId,
        timestamp: Date.now().toString(),
        ...parameters
      };
      // FBInstant.logEvent accepts eventName, valueToSum, and parameters
      window.FBInstant.logEvent(eventName, 1, params);
    } catch (error) {
      console.warn('[Ad Analytics] Failed to log event to Facebook:', error);
    }
  }
}
