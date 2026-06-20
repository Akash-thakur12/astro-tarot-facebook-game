import { xmur3, mulberry32 } from './prng.js';
import { humanize, buildStructuredResponse } from './humanizer.js';
import { getHoroscope } from './horoscopeEngine.js';
import { getIntentPrediction } from './intentDatasetEngine.js';
import openings from '../data/openings.json' with { type: 'json' };

// List of intents supported by buildStructuredResponse (deprecated)
// const structuredIntents = [
//   'marriage_when',
//   'government_job',
//   'business',
//   'health',
//   'child_when'
// ];

/**
 * Builds a deterministic response using JSON arrays and a hash seed.
 * 
 * @param {string} uid - The unique user ID.
 * @param {string} intent - The detected intent (e.g. 'marriage_when').
 * @param {string} date - The date string 'YYYY-MM-DD'.
 * @returns {string} The formatted Pandit AI response.
 */
export function buildResponse(uid, intent, date) {
  const seedFn = xmur3(uid + intent + date);
  const seed = seedFn();
  const rand = mulberry32(seed);

  const data = getIntentPrediction(intent, seed);

  if (data && typeof data === "object") {
    const structuredResponse = buildStructuredResponse(data, seed);
    return humanize(structuredResponse, seed);
  }

  // Legacy string prediction fallback from intent datasets (if any)
  if (data) {
    return humanize(data, seed);
  }

  // Fallback to existing horoscopeEngine
  const opening = openings[Math.floor(rand() * openings.length)];
  const pred = getHoroscope(intent, seed);
  const response = `${opening} ${pred}`;

  return humanize(response, seed);
}
