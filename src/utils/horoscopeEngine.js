import generalFinal from '../data/final_hindi/general_final.json' with { type: 'json' };
import loveFinal from '../data/final_hindi/love_final.json' with { type: 'json' };
import careerFinal from '../data/final_hindi/career_final.json' with { type: 'json' };
import wellnessFinal from '../data/final_hindi/wellness_final.json' with { type: 'json' };

/**
 * Returns a deterministic horoscope from the appropriate dataset based on intent and seed.
 * 
 * Mapping:
 * - LOVE: marriage_when, breakup, ex_back, partner_loyal, married_life, love, love_marriage -> loveFinal
 * - CAREER: business, government_job, promotion, salary, job_change, career_field, startup, investment, debt, property, career, job, money -> careerFinal
 * - HEALTH: health, mental_stress, family_health -> wellnessFinal
 * - default -> generalFinal
 * 
 * @param {string} intent - The user's detected intent.
 * @param {number} seed - The deterministic hash seed.
 * @returns {string} The selected horoscope string.
 */
export function getHoroscope(intent, seed) {
  let dataset = generalFinal;

  const normalizedIntent = (intent || '').toLowerCase().trim();

  const loveIntents = ['love', 'love_marriage', 'marriage_when', 'breakup', 'ex_back', 'partner_loyal', 'married_life'];
  const careerIntents = ['career', 'job', 'money', 'business', 'government_job', 'promotion', 'salary', 'job_change', 'career_field', 'startup', 'investment', 'debt', 'property'];
  const healthIntents = ['health', 'mental_stress', 'family_health'];

  if (loveIntents.includes(normalizedIntent)) {
    dataset = loveFinal;
  } else if (careerIntents.includes(normalizedIntent)) {
    dataset = careerFinal;
  } else if (healthIntents.includes(normalizedIntent)) {
    dataset = wellnessFinal;
  }

  const index = Math.abs(seed) % dataset.length;
  return dataset[index];
}
