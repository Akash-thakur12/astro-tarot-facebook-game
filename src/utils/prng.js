/**
 * xmur3 is a fast, 32-bit hashing function designed for seeding PRNGs.
 * It takes a string of any length and returns a function that, when called,
 * yields a new 32-bit unsigned integer hash value.
 * 
 * @param {string} str - The string to hash.
 * @returns {function} A function returning deterministic 32-bit unsigned integers.
 */
export function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return function() {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

/**
 * mulberry32 is a simple, fast 32-bit pseudo-random number generator.
 * It takes a 32-bit unsigned integer seed and returns a generator function
 * that yields numbers between 0 (inclusive) and 1 (exclusive).
 * 
 * @param {number} seed - The seed value.
 * @returns {function} A function returning pseudo-random float values in [0, 1).
 */
export function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
