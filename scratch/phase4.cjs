const fs = require('fs');

// 1. Update api/pandit-ai.js to instruct LLM
let panditFile = fs.readFileSync('api/pandit-ai.js', 'utf8');
const oldInstruction = `\\nFORMATTING RULE: At the absolute end of your response, on a new line, you MUST write:
CLIFFHANGER: <the exact open loop question you asked under \${cliffhangerHeading}>`;
const newInstruction = `\\nFORMATTING RULE: At the absolute end of your response, on new lines, you MUST write:
DAILY_SECRET: <generate a hyper-personalized, hidden "Daily Secret" (1 short sentence) based on the user's current planetary transit/astrological data. This must not be repetitive and must feel like a deep, custom astrological revelation tailored specifically to that user for that specific day.>
CLIFFHANGER: <the exact open loop question you asked under \${cliffhangerHeading}>`;

panditFile = panditFile.replace(oldInstruction, newInstruction);
fs.writeFileSync('api/pandit-ai.js', panditFile);

// 2. Update aiExecution.js to extract DAILY_SECRET and inject it
let execFile = fs.readFileSync('api/services/aiExecution.js', 'utf8');
// Rewrite extractAndRemoveCliffhanger to also extract DAILY_SECRET
const oldExtract = `function extractAndRemoveCliffhanger(text) {
  if (!text || typeof text !== 'string') return { cleanText: text, cliffhanger: "" };
  let cliffhanger = "";
  let cleanText = text;
  const lowerText = text.toLowerCase();
  const matchIndex = lowerText.indexOf("cliffhanger:");
  if (matchIndex !== -1) {
    cliffhanger = text.substring(matchIndex + "cliffhanger:".length).trim();
    cleanText = text.substring(0, matchIndex).trim();
  } else {
    // Fallback: look for ?? heading or emoji patterns
    const fallbackMatch = text.match(/??.*?\\?/);
    if (fallbackMatch) {
      cliffhanger = fallbackMatch[0].trim();
    } else {
      // Split by lines and check the last non-empty line
      const lines = text.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 0) {
        const last = lines[lines.length - 1];
        if (last.endsWith('?')) {
          cliffhanger = last;
          cleanText = lines.slice(0, -1).join('\\n');
        }
      }
    }
  }
  return { cleanText, cliffhanger };
}`;

const newExtract = `function extractAndRemoveSecrets(text) {
  if (!text || typeof text !== 'string') return { cleanText: text, cliffhanger: "", dailySecret: "" };
  let cliffhanger = "";
  let dailySecret = "";
  let cleanText = text;
  
  // Extract DAILY_SECRET
  const dsMatch = cleanText.match(/DAILY_SECRET:\\s*(.*?)(?=\\n|$)/i);
  if (dsMatch) {
    dailySecret = dsMatch[1].trim();
    cleanText = cleanText.replace(dsMatch[0], "").trim();
  }
  
  // Extract CLIFFHANGER
  const chMatch = cleanText.match(/CLIFFHANGER:\\s*(.*?)(?=\\n|$)/i);
  if (chMatch) {
    cliffhanger = chMatch[1].trim();
    cleanText = cleanText.replace(chMatch[0], "").trim();
  } else {
    // Fallback
    const lines = cleanText.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0) {
      const last = lines[lines.length - 1];
      if (last.endsWith('?')) {
        cliffhanger = last;
        cleanText = lines.slice(0, -1).join('\\n');
      }
    }
  }
  
  return { cleanText, cliffhanger, dailySecret };
}`;
execFile = execFile.replace(oldExtract, newExtract);

// Replace calls to extractAndRemoveCliffhanger with extractAndRemoveSecrets
// Also we need to pass dailySecret down.
// Let's modify the executeAIWithRetries logic
const oldCall1 = `const parsed = extractAndRemoveCliffhanger(aiText);
    aiText = humanize(parsed.cleanText);
    if (parsed.cliffhanger) cliffhangerText = parsed.cliffhanger;`;
const newCall1 = `const parsed = extractAndRemoveSecrets(aiText);
    aiText = humanize(parsed.cleanText);
    if (parsed.cliffhanger) cliffhangerText = parsed.cliffhanger;
    options.llmSecret = parsed.dailySecret;`;
execFile = execFile.replace(oldCall1, newCall1);

const oldCall2 = `const parsedRetry = extractAndRemoveCliffhanger(aiText);
      aiText = humanize(parsedRetry.cleanText);
      if (parsedRetry.cliffhanger) cliffhangerText = parsedRetry.cliffhanger;`;
const newCall2 = `const parsedRetry = extractAndRemoveSecrets(aiText);
      aiText = humanize(parsedRetry.cleanText);
      if (parsedRetry.cliffhanger) cliffhangerText = parsedRetry.cliffhanger;
      options.llmSecret = parsedRetry.dailySecret;`;
execFile = execFile.replace(oldCall2, newCall2);

// Now update injectSecretAndScore
const oldInjectDef = `async function injectSecretAndScore(text, uid, userData, cachedProgress = null, category = 'General', pastHistory = []) {`;
const newInjectDef = `async function injectSecretAndScore(text, uid, userData, cachedProgress = null, category = 'General', pastHistory = [], llmSecret = "") {`;
execFile = execFile.replace(oldInjectDef, newInjectDef);

const oldSecretCall = `const secret = getDailySecret(dobKey, today, category, pastHistory);`;
const newSecretCall = `const secret = getDailySecret(dobKey, today, category, pastHistory, llmSecret);`;
execFile = execFile.replace(oldSecretCall, newSecretCall);

// Now update injectSecretAndScore calls inside aiExecution.js
execFile = execFile.replace(
  `const validatedRetryText = await injectSecretAndScore(aiText, uid, userData, progress, getSecretCategory(detectedIntent), pastHistory);`,
  `const validatedRetryText = await injectSecretAndScore(aiText, uid, userData, progress, getSecretCategory(detectedIntent), pastHistory, options.llmSecret);`
);
execFile = execFile.replace(
  `const validatedRetryText2 = await injectSecretAndScore(aiText, uid, userData, progress, getSecretCategory(detectedIntent), pastHistory);`,
  `const validatedRetryText2 = await injectSecretAndScore(aiText, uid, userData, progress, getSecretCategory(detectedIntent), pastHistory, options.llmSecret);`
);
execFile = execFile.replace(
  `const fallbackInjected = await injectSecretAndScore(friendlyFallbackText, uid, userData, progress, getSecretCategory(detectedIntent), pastHistory);`,
  `const fallbackInjected = await injectSecretAndScore(friendlyFallbackText, uid, userData, progress, getSecretCategory(detectedIntent), pastHistory, options.llmSecret);`
);
execFile = execFile.replace(
  `let completedResponse = await injectSecretAndScore(deduplicatedText, uid, userData, progress, getSecretCategory(detectedIntent), pastHistory);`,
  `let completedResponse = await injectSecretAndScore(deduplicatedText, uid, userData, progress, getSecretCategory(detectedIntent), pastHistory, options.llmSecret);`
);

fs.writeFileSync('api/services/aiExecution.js', execFile);


// 3. Update src/utils/progressEngine.js
let progressFile = fs.readFileSync('src/utils/progressEngine.js', 'utf8');

// Replace the entire getDailySecret function
const oldGetDailySecretRegex = /export function getDailySecret\([\s\S]*?return pool\[index\];\n\}/;
const newGetDailySecret = `export function getDailySecret(dob, today, category = 'General', pastHistory = [], llmSecret = "") {
  // If the AI generated a dynamic hyper-personalized secret, use it directly!
  if (llmSecret && llmSecret.trim().length > 0) {
    return llmSecret;
  }
  
  // Fallback to a single generic secret if AI failed to generate one
  return "Krodh aur jaldbazi se bachein, aaj ka din shubh rahega.";
}`;

progressFile = progressFile.replace(oldGetDailySecretRegex, newGetDailySecret);
fs.writeFileSync('src/utils/progressEngine.js', progressFile);

console.log("Phase 4 Refactor complete!");
