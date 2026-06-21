import { xmur3 } from './prng.js';
import { humanize, buildStructuredResponse } from './humanizer.js';
import { getHoroscope } from './horoscopeEngine.js';
import { getIntentPrediction } from './intentDatasetEngine.js';

function normalizeQuestion(question) {
  if (!question || typeof question !== 'string') return '';
  return question.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Builds a deterministic response using JSON arrays and a hash seed.
 * 
 * @param {string} uid - The unique user ID.
 * @param {string} intent - The detected intent (e.g. 'marriage_when').
 * @param {string} date - The date string 'YYYY-MM-DD'.
 * @param {string} [question] - The user's question, used to vary same-day responses.
 * @returns {string} The formatted Pandit AI response.
 */
export function buildResponse(uid, intent, date, question = '') {
  const normalizedQuestion = normalizeQuestion(question);
  const seedFn = xmur3(uid + intent + date + normalizedQuestion);
  const seed = seedFn();

  let data = getIntentPrediction(intent, seed);

  if (!data) {
    const pred = getHoroscope(intent, seed) || "";
    data = {
      reasoning: "",
      prediction: pred,
      remedy: "",
      followup: "क्या आप इस बारे में कुछ और पूछना चाहते हैं?"
    };
  } else {
    data = {
      reasoning: data.reasoning || "",
      prediction: data.prediction || "",
      remedy: data.remedy || "",
      followup: data.followup || ""
    };
  }

  // Ensure prediction is never empty
  if (!data.prediction || data.prediction === "") {
    data.prediction = "धीरे-धीरे स्थिति बेहतर होने की उम्मीद है।";
  }

  return humanize(
    buildStructuredResponse(data, seed),
    seed
  );
}
