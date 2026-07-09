import sys

with open('api/services/aiExecution.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_exec = '''export async function executeAIWithRetries(options) {'''
new_exec = '''function extractAndRemoveSecrets(text) {
  if (!text || typeof text !== 'string') return { cleanText: text, dailySecret: "", cliffhanger: "", memoryState: null };
  let dailySecret = "";
  let cliffhanger = "";
  let memoryState = null;
  let cleanText = text;

  // Extract MEMORY_STATE
  const memoryMatch = text.match(/MEMORY_STATE:\\s*({[\\s\\S]*?})/);
  if (memoryMatch) {
    try {
      memoryState = JSON.parse(memoryMatch[1].trim());
    } catch(e) {
      console.error("Failed to parse MEMORY_STATE", e);
    }
    cleanText = cleanText.replace(/MEMORY_STATE:\\s*({[\\s\\S]*?})/g, "");
  }

  // Extract DAILY_SECRET
  const dailySecretMatch = cleanText.match(/DAILY_SECRET:\\s*(.*)/i);
  if (dailySecretMatch) {
    dailySecret = dailySecretMatch[1].trim();
    cleanText = cleanText.replace(/DAILY_SECRET:\\s*(.*)/ig, "");
  }

  // Extract CLIFFHANGER
  const cliffhangerMatch = cleanText.match(/CLIFFHANGER:\\s*(.*)/i);
  if (cliffhangerMatch) {
    cliffhanger = cliffhangerMatch[1].trim();
    cleanText = cleanText.replace(/CLIFFHANGER:\\s*(.*)/ig, "");
  }

  return { cleanText: cleanText.trim(), dailySecret, cliffhanger, memoryState };
}

export async function executeAIWithRetries(options) {'''

old_context = '''    const grokContext = `
--- USER ASTROLOGICAL MATRIX ---'''
new_context = '''    const recommendationMemory = progress?.recommendationMemory || {};

    const grokContext = `
--- USER ASTROLOGICAL MATRIX ---'''

old_rules = '''RULE C: Read the provided \`history\` array to maintain 100% logical consistency. If you previously discouraged an action, do not contradict yourself in subsequent responses.
`;'''
new_rules = '''RULE C: CROSS-REFERENCE WITH STATEFUL MEMORY. Read the 'STRICTLY DISCOURAGED PATHS' array. If a path (e.g., 'Fashion Designing') is listed there, you are ABSOLUTELY FORBIDDEN from recommending it. Maintain 100% logical consistency across the entire session.
RULE D: VAGUE QUERY HANDLING. If the user query is extremely short/vague (e.g., 'Family', 'Tum btao'), do not fail. Synthesize the memory matrix and the last 2 lines of history, summarize the pending bottleneck, and provide a direct astrological remedy.

--- STATEFUL RECOMMENDATION MEMORY (HISTORICAL TRUTH) ---
- Previously Advised Career Path: ${recommendationMemory.advisedCareer || "None yet"}
- Previously Advised Business Path: ${recommendationMemory.advisedBusiness || "None yet"}
- STRICTLY DISCOURAGED PATHS: [${(recommendationMemory.discouragedPaths || []).join(', ') || "None yet"}]
- Last Major Prediction Summary: ${recommendationMemory.lastPrediction || "No prior history"}
---------------------------------------------------------

FORMATTING RULE EXTENSION:
At the absolute end of your response, right after DAILY_SECRET, you MUST output a stateful memory update block in this exact JSON format:
MEMORY_STATE: {"advisedCareer": "...", "advisedBusiness": "...", "discouragedPaths": ["..."], "lastPrediction": "..."}
`;'''

old_return = '''  return { jsonResponse, aiText, cliffhangerText };'''
new_return = '''  return { jsonResponse, aiText, cliffhangerText, memoryState: options.memoryState };'''

old_parsed_retry = '''      if (parsedRetry.cliffhanger) cliffhangerText = parsedRetry.cliffhanger;
      options.llmSecret = parsedRetry.dailySecret;'''
new_parsed_retry = '''      if (parsedRetry.cliffhanger) cliffhangerText = parsedRetry.cliffhanger;
      options.llmSecret = parsedRetry.dailySecret;
      options.memoryState = parsedRetry.memoryState;'''

old_parsed = '''    if (parsed.cliffhanger) cliffhangerText = parsed.cliffhanger;
    options.llmSecret = parsed.dailySecret;'''
new_parsed = '''    if (parsed.cliffhanger) cliffhangerText = parsed.cliffhanger;
    options.llmSecret = parsed.dailySecret;
    options.memoryState = parsed.memoryState;'''

def do_replace(content, old, new):
    if old in content:
        return content.replace(old, new)
    elif old.replace('\\n', '\\r\\n') in content:
        return content.replace(old.replace('\\n', '\\r\\n'), new.replace('\\n', '\\r\\n'))
    return content

content = do_replace(content, old_exec, new_exec)
content = do_replace(content, old_context, new_context)
content = do_replace(content, old_rules, new_rules)
content = do_replace(content, old_return, new_return)
content = do_replace(content, old_parsed_retry, new_parsed_retry)
content = do_replace(content, old_parsed, new_parsed)

with open('api/services/aiExecution.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("aiExecution updated!")

with open('api/pandit-ai.js', 'r', encoding='utf-8') as f:
    pandit = f.read()

old_pandit = '''      if (aiResult.cliffhangerText) {
        cliffhangerText = aiResult.cliffhangerText;
      }'''
new_pandit = '''      if (aiResult.cliffhangerText) {
        cliffhangerText = aiResult.cliffhangerText;
      }
      if (aiResult.memoryState) {
        try {
          const progressUid = userData?.uid || uid || 'guest';
          progress.recommendationMemory = { ...(progress.recommendationMemory || {}), ...aiResult.memoryState };
          await updateProgress(progressUid, 'memory_update', progress);
        } catch(e) {
          console.error("Failed to update progress with memory state", e);
        }
      }'''

pandit = do_replace(pandit, old_pandit, new_pandit)

with open('api/pandit-ai.js', 'w', encoding='utf-8') as f:
    f.write(pandit)
print("pandit-ai updated!")
