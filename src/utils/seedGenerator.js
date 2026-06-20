/**
 * Generates a deterministic positive integer seed based on uid, intent, and date.
 * 
 * Requirements:
 * - Same user + same intent + same date = same seed.
 * - Different users should get different seeds.
 * - Different dates should produce different seeds.
 * - Uses a lightweight hash function (Java String.hashCode variant).
 * 
 * @param {string} uid - The unique user ID.
 * @param {string} intent - The detected intent category.
 * @param {string} date - The date string (e.g. 'YYYY-MM-DD').
 * @returns {number} A positive 32-bit integer seed.
 */
export function generateSeed(uid, intent, date) {
  const combined = `${uid || ''}_${intent || ''}_${date || ''}`;
  
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to signed 32-bit integer
  }
  
  // Return absolute value to ensure positive integer, fallback to 1 if 0
  return Math.abs(hash) || 1;
}
