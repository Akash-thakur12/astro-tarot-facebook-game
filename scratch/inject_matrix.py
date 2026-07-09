import sys

with open('api/services/aiExecution.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_exec = '''export async function executeAIWithRetries(options) {
  const {
    fullPrompt, history, astroData, mode, uid, userData, progress,
    detectedIntent, pastHistory, skipDashaPreservation, resolvedLanguage,
    isDevanagari, maritalStatus, updatedFacts
  } = options;
  let aiText = await generateBase(fullPrompt);'''

new_exec = '''export async function executeAIWithRetries(options) {
  const {
    fullPrompt, history, astroData, mode, uid, userData, progress,
    detectedIntent, pastHistory, skipDashaPreservation, resolvedLanguage,
    isDevanagari, maritalStatus, updatedFacts
  } = options;
  
  let injectedPrompt = fullPrompt;
  
  if (astroData && (mode === 'chat' || mode === 'personal')) {
    let detectedHouses = "1st, 5th, 9th";
    const i = (detectedIntent || "").toLowerCase();
    if (i.includes("marriage") || i.includes("love")) detectedHouses = "7th, 5th";
    else if (i.includes("career") || i.includes("job") || i.includes("business") || i.includes("work")) detectedHouses = "10th, 11th";
    else if (i.includes("health") || i.includes("disease") || i.includes("medical")) detectedHouses = "6th, 8th";
    else if (i.includes("money") || i.includes("finance") || i.includes("wealth")) detectedHouses = "2nd, 11th";
    
    const grokContext = `
--- USER ASTROLOGICAL MATRIX ---
- Calculated Ascendant (Lagna): ${astroData.lagna || 'Unknown'}
- Moon Sign (Rashi): ${astroData.rashi || 'Unknown'}
- Active Major Planet (Mahadasha): ${astroData.mahadasha || 'Unknown'}
- Active Sub Planet (Antardasha): ${astroData.antardasha || 'Unknown'}
- Target Houses for Query: ${detectedHouses}
- Current Calendar Year: 2026
---------------------------------

RULE A: You are forbidden from inventing planetary dashas or years. You must strictly timeline your predictions based on the 'Active Major/Sub Planet' and 'Current Calendar Year (2026)' provided in the Matrix above.
RULE B: Do not repeat generic placeholder dates like 'May 2027' or default every career query to 'Trading/Finance' unless the user's specific Lagna and 10th House Lord in the Matrix heavily support it.
RULE C: Read the provided \`history\` array to maintain 100% logical consistency. If you previously discouraged an action, do not contradict yourself in subsequent responses.
`;
    injectedPrompt = grokContext + "\\n" + fullPrompt;
  }
  
  let aiText = await generateBase(injectedPrompt);'''

old_retry = '''  let retryCount = 0;
  while (needsRetry && retryCount < 2) {
    let retryPrompt = fullPrompt;'''

new_retry = '''  let retryCount = 0;
  while (needsRetry && retryCount < 2) {
    let retryPrompt = injectedPrompt;'''


if old_exec in content:
    content = content.replace(old_exec, new_exec)
    print("Replaced main exec block!")
elif old_exec.replace('\\n', '\\r\\n') in content:
    content = content.replace(old_exec.replace('\\n', '\\r\\n'), new_exec.replace('\\n', '\\r\\n'))
    print("Replaced main exec block! (CRLF)")
else:
    print("Could not find main exec block.")

if old_retry in content:
    content = content.replace(old_retry, new_retry)
    print("Replaced retry prompt loop!")
elif old_retry.replace('\\n', '\\r\\n') in content:
    content = content.replace(old_retry.replace('\\n', '\\r\\n'), new_retry.replace('\\n', '\\r\\n'))
    print("Replaced retry prompt loop! (CRLF)")
else:
    print("Could not find retry prompt loop.")

with open('api/services/aiExecution.js', 'w', encoding='utf-8') as f:
    f.write(content)
