import marriage_when from '../data/intents/marriage_when.json' with { type: 'json' };
import government_job from '../data/intents/government_job.json' with { type: 'json' };
import ex_back from '../data/intents/ex_back.json' with { type: 'json' };
import breakup from '../data/intents/breakup.json' with { type: 'json' };
import business from '../data/intents/business.json' with { type: 'json' };
import visa from '../data/intents/visa.json' with { type: 'json' };
import health from '../data/intents/health.json' with { type: 'json' };
import mental_stress from '../data/intents/mental_stress.json' with { type: 'json' };
import child_when from '../data/intents/child_when.json' with { type: 'json' };
import married_life from '../data/intents/married_life.json' with { type: 'json' };

const datasets = {
  marriage_when,
  government_job,
  ex_back,
  breakup,
  business,
  visa,
  health,
  mental_stress,
  child_when,
  married_life
};

/**
 * Returns a deterministic horoscope entry from the matching intent dataset.
 * Returns null if the intent does not have a specific dataset.
 * 
 * @param {string} intent - The detected intent.
 * @param {number} seed - The deterministic seed value.
 * @returns {object|null} The dataset entry with only reasoning, prediction, remedy, and followup, or null.
 */
export function getIntentPrediction(intent, seed) {
  const dataset = datasets[intent];
  if (!dataset) {
    return null;
  }
  const index = Math.abs(seed) % dataset.length;
  const item = dataset[index];

  if (!item) {
    return null;
  }

  return {
    reasoning: item.reasoning || "",
    prediction: item.prediction || "",
    remedy: item.remedy || "",
    followup: item.followup || ""
  };
}
