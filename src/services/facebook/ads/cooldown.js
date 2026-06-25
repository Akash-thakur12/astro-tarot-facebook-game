/**
 * Tracks client-side ad display times and counts to enforce cooldowns and limits.
 * Note: These checks are duplicated and authoritatively verified on the server-side.
 */

const lastShownMap = new Map();
const dailyCountMap = new Map();

/**
 * Marks a placement as shown and updates local timestamps and counts.
 * @param {string} placementId 
 */
export function setAdShown(placementId) {
  const now = Date.now();
  lastShownMap.set(placementId, now);
  
  const todayKey = `${placementId}_${new Date().getUTCDate()}`;
  const currentCount = dailyCountMap.get(todayKey) || 0;
  dailyCountMap.set(todayKey, currentCount + 1);
}

/**
 * Checks if a placement is currently in its cooldown window.
 * @param {string} placementId 
 * @param {number} cooldownMs 
 * @returns {boolean}
 */
export function isCooldownActive(placementId, cooldownMs) {
  if (!cooldownMs) return false;
  const lastShown = lastShownMap.get(placementId) || 0;
  return Date.now() - lastShown < cooldownMs;
}

/**
 * Returns remaining cooldown time in milliseconds.
 * @param {string} placementId 
 * @param {number} cooldownMs 
 * @returns {number}
 */
export function getRemainingCooldown(placementId, cooldownMs) {
  if (!cooldownMs) return 0;
  const lastShown = lastShownMap.get(placementId) || 0;
  const elapsed = Date.now() - lastShown;
  return Math.max(0, cooldownMs - elapsed);
}

/**
 * Returns local ad impressions for the current UTC day.
 * @param {string} placementId 
 * @returns {number}
 */
export function getDailyCount(placementId) {
  const todayKey = `${placementId}_${new Date().getUTCDate()}`;
  return dailyCountMap.get(todayKey) || 0;
}
