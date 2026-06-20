import generalFinal from '../data/final_hindi/general_final.json' with { type: 'json' };
import loveFinal from '../data/final_hindi/love_final.json' with { type: 'json' };
import careerFinal from '../data/final_hindi/career_final.json' with { type: 'json' };
import wellnessFinal from '../data/final_hindi/wellness_final.json' with { type: 'json' };

/**
 * Returns a deterministic horoscope from the appropriate dataset based on intent and seed.
 * 
 * Mapping:
 * - love / love_marriage -> love_final.json
 * - career / job / money / business -> career_final.json
 * - health -> wellness_final.json
 * - default -> general_final.json
 * 
 * @param {string} intent - The user's detected intent.
 * @param {number} seed - The deterministic hash seed.
 * @returns {string} The selected horoscope string.
 */
export function getHoroscope(intent, seed) {
  let dataset = generalFinal;

  const normalizedIntent = (intent || '').toLowerCase().trim();

  if (normalizedIntent === 'love' || normalizedIntent === 'love_marriage') {
    dataset = loveFinal;
  } else if (
    normalizedIntent === 'career' ||
    normalizedIntent === 'job' ||
    normalizedIntent === 'money' ||
    normalizedIntent === 'business'
  ) {
    dataset = careerFinal;
  } else if (normalizedIntent === 'health') {
    dataset = wellnessFinal;
  }

  const index = Math.abs(seed) % dataset.length;
  return dataset[index];
}
