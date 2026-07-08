import { detectMultiIntent, getTopicAndSubType } from '../api/pandit-ai.js';

const q = "meri job kab hogi, shaadi kab hogi, love hogi ya arrange, bacha kab hoga, paisa kab aayega, foreign kab jaunga";
const result = detectMultiIntent(q);

console.log(JSON.stringify(result, null, 2));
