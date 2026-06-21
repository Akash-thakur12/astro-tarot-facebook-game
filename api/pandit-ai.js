import { generateAIResponse } from '../services/aiService.js';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { buildResponse } from '../src/utils/responseBuilder.js';
import { detectIntent } from '../src/utils/intentDetector.js';
import { normalizeFacts } from '../src/utils/memoryEngine.js';
import { updateEvidenceMemory } from '../src/utils/evidenceMemoryEngine.js';
import { humanize } from '../src/utils/humanizer.js';
import { resolveIntentContradiction } from '../src/utils/contradictionEngine.js';


function getFactValue(field) {
  if (!field) return null;
  if (field.currentValue !== undefined) return field.currentValue;
  if (field.value !== undefined) return field.value;
  return null;
}

function getFactReliability(field) {
  if (!field) return 0;
  if (field.reliability !== undefined) return field.reliability;
  if (field.confidence !== undefined) {
    return Math.round((field.confidence / 5) * 100);
  }
  return 0;
}

function isNewDay(lastDate, today = new Date()) {
  return !lastDate ||
    lastDate.getDate() !== today.getDate() ||
    lastDate.getMonth() !== today.getMonth() ||
    lastDate.getFullYear() !== today.getFullYear();
}

function parseModelResponse(text) {
  let cleanedText = text.trim();
  cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleanedText);
  } catch (parseError) {
    const scoreMatch = cleanedText.match(/"?score"?\s*:\s*(\d+)/);
    const guidanceMatch = cleanedText.match(/"?guidance"?\s*:\s*"(.*?)"/);
    return {
      score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
      guidance: guidanceMatch ? guidanceMatch[1] : cleanedText,
      sections: []
    };
  }
}

function sanitizePromptInput(text) {
  if (!text || typeof text !== 'string') return '';
  
  let sanitized = text;
  
  // Remove potential instruction injection patterns
  sanitized = sanitized.replace(/ignore previous instructions/gi, '');
  sanitized = sanitized.replace(/system:/gi, '');
  sanitized = sanitized.replace(/assistant:/gi, '');
  sanitized = sanitized.replace(/developer:/gi, '');
  sanitized = sanitized.replace(/user:/gi, '');
  
  // Collapse repeated spaces
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  // Limit size to 1000 chars
  if (sanitized.length > 1000) {
    sanitized = sanitized.substring(0, 1000);
  }
  
  return sanitized.trim();
}

// Initialize Firebase Admin securely using modern SDK API
const apps = getApps();
if (!apps || apps.length === 0) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        })
      });
    } else {
      // Fallback for local / default creds
      initializeApp();
    }
  } catch (e) {
    console.error("Firebase Init Error:", e);
    // If already initialized by another process, ignore
    if (!e.message?.includes('already exists')) {
      throw e;
    }
  }
}

const db = getFirestore();
const adminAuth = getAuth();

const AI_QUESTION_COST = 30; // Increased from 25

// Rate limiting map (in-memory, per Vercel instance)
const rateLimits = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Ensure body exists
  if (!req.body) {
    return res.status(400).json({ error: 'Missing request body' });
  }

  // CRITICAL FIX #3: Server-Side Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized: Token missing after Bearer' });
  }

  let uid;
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    uid = decodedToken?.uid;
    if (!uid) throw new Error("No UID in token");
  } catch (error) {
    console.error("Auth Error:", error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  // CRITICAL FIX #6: Rate Limiting
  const now = new Date();
  const nowMs = now.getTime();
  const dayStr = String(now.getDate()).padStart(2, '0');
  const monthNum = now.getMonth(); // 0-indexed
  const monthStr = String(monthNum + 1).padStart(2, '0');
  const year = now.getFullYear();
  const todayString = `${year}-${monthStr}-${dayStr}`;

  const userRate = rateLimits.get(uid) || { count: 0, resetTime: nowMs + 60000 };
  if (nowMs > userRate.resetTime) {
    userRate.count = 0;
    userRate.resetTime = nowMs + 60000;
  }
  if (userRate.count >= 20) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
  }
  userRate.count++;
  rateLimits.set(uid, userRate);

  const { mode, userData, history } = req.body;
  let detectedIntent = 'general';

  if (!userData) {
    return res.status(400).json({ error: 'Missing userData in request body' });
  }

  // Request size hardening
  if (userData.question && userData.question.length > 1000) {
    return res.status(400).json({ error: 'Question too long (max 1000 characters)' });
  }

  if (Array.isArray(history)) {
    if (history.length > 100) {
      return res.status(400).json({ error: 'History too long (max 100 messages)' });
    }
    for (const msg of history) {
      if (msg && msg.content && msg.content.length > 1000) {
        return res.status(400).json({ error: 'Message too long (max 1000 characters per message)' });
      }
    }
  }

  if (mode === 'chat' || mode === 'personal') {
    const questionText = (userData.question || '').trim().toLowerCase();
    
    const greetings = ['hi', 'hlo', 'hello', 'hey', 'namaste', 'namaskar'];
    const thanks = ['thanks', 'thank you'];
    const ok = ['ok', 'okay', 'hmm'];
    const morning = ['good morning'];
    const night = ['good night'];

    if (greetings.includes(questionText)) {
      return res.status(200).json({
        text: "नमस्ते! मैं पंडित जी हूँ। आज किस विषय पर मार्गदर्शन चाहिए?"
      });
    }
    if (thanks.includes(questionText)) {
      return res.status(200).json({
        text: "कल्याण हो! आशीर्वाद सदा आपके साथ है।"
      });
    }
    if (ok.includes(questionText)) {
      return res.status(200).json({
        text: "आशीर्वाद! ग्रहों की स्थिति पर विश्वास रखें। कुछ और जानना चाहते हैं?"
      });
    }
    if (morning.includes(questionText)) {
      return res.status(200).json({
        text: "शुभ प्रभात! सूर्यदेव आपको ऊर्जा और सफलता प्रदान करें। कल्याण हो!"
      });
    }
    if (night.includes(questionText)) {
      return res.status(200).json({
        text: "शुभ रात्रि! चंद्रदेव आपको शांति प्रदान करें। शुभ स्वप्न!"
      });
    }
  }

  const BEDROCK_API_KEY = process.env.BEDROCK_API_KEY;
  const BEDROCK_BASE_URL = process.env.BEDROCK_BASE_URL;

  const userRef = db.collection('users').doc(uid);
  let userDoc;
  try {
    userDoc = await userRef.get();
    if (!userDoc.exists) {
      // AUTO-CREATE
      const defaultUser = {
        uid,
        coins: 0,
        xp: 0,
        streak: 1,
        premium: false,
        adsWatchedToday: 0,
        dailyQuestionUsed: false,
        dailyTarotUsed: false,
        dailySpinUsed: false,
        dailyChallengesClaimed: false,
        joinedAt: FieldValue.serverTimestamp()
      };
      await userRef.set(defaultUser);
      userDoc = await userRef.get();
    }
  } catch (e) {
    console.error("User initialization error:", e);
    return res.status(500).json({ error: 'Failed to initialize user session' });
  }

  const userDataDoc = userDoc.data();
  if (!userDataDoc) {
    return res.status(500).json({ error: 'User profile not found' });
  }

  const isPremium = !!userDataDoc.premium;

  // === CONTRADICTION SAFETY LAYER (PHASE 29B) ===
  const factsRef = db.collection('users').doc(uid).collection('facts').doc('current');
  let factsDoc;
  try {
    factsDoc = await factsRef.get();
  } catch (e) {
    console.error("Error reading facts from Firestore:", e);
  }

  let facts = {
    married: { value: null, confidence: 0 },
    hasChildren: { value: null, confidence: 0 },
    hasJob: { value: null, confidence: 0 },
    hasBusiness: { value: null, confidence: 0 },
    gender: { value: null, confidence: 0 }
  };

  if (factsDoc && factsDoc.exists) {
    facts = { ...facts, ...factsDoc.data() };
  }

  // Scan current question and history for new facts to update
  const questionText = sanitizePromptInput((userData.question || '').trim());
  const newFacts = normalizeFacts(questionText);

  const { storedFacts, updated } = updateEvidenceMemory(facts, newFacts, 'user', questionText);
  facts = storedFacts;

  if (updated) {
    try {
      await factsRef.set(facts);
    } catch (e) {
      console.error("Error writing updated facts to Firestore:", e);
    }
  }

  // === USER PROFILE INJECTION (PHASE 30B) ===
  const profileRef = db.collection('users').doc(uid).collection('profile').doc('main');
  let profileDoc;
  try {
    profileDoc = await profileRef.get();
  } catch (e) {
    console.error("Error reading user profile from Firestore:", e);
  }

  let profile = null;
  if (profileDoc && profileDoc.exists) {
    profile = profileDoc.data();
  }

  // Age calculation helper
  function calculateAge(dobString) {
    if (!dobString) return "Unknown";
    try {
      const today = new Date();
      const birthDate = new Date(dobString);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (err) {
      console.error("Age calculation error:", err);
      return "Unknown";
    }
  }

  const businessTypes = [
    "Business Owner",
    "Trader",
    "Freelancer",
    "Content Creator",
    "Self Employed"
  ];

  const userIsBusinessOwner = (profile && businessTypes.includes(profile.occupation)) || (getFactValue(facts.hasBusiness) === true);

  // Summary memory generation if chat history > 100 messages
  let summaryText = "";
  if (Array.isArray(history) && history.length > 100) {
    const marriedStr = getFactValue(facts.married) === true ? "is married" : (getFactValue(facts.married) === false ? "is single" : "relationship status is unknown");
    const jobStr = getFactValue(facts.hasBusiness) === true ? "runs a business" : (getFactValue(facts.hasJob) === true ? "has a job" : "career status is unknown");
    const childrenStr = getFactValue(facts.hasChildren) === true ? "has children" : "does not have children";
    
    const recentIntents = [];
    const recentMsgs = history.slice(-10);
    recentMsgs.forEach(m => {
      if (m.role === 'user' && m.content) {
        const dIntent = detectIntent(m.content);
        if (dIntent !== 'general' && !recentIntents.includes(dIntent)) {
          recentIntents.push(dIntent);
        }
      }
    });
    const topics = recentIntents.map(i => i.replace('_', ' ')).join(', ') || "relationship and life path matters";
    summaryText = sanitizePromptInput(`User ${marriedStr}, ${jobStr}, ${childrenStr} and recently discussed ${topics}.`);
  }

  // Intent detection and contradiction routing
  if (mode === 'chat' || mode === 'personal') {
    detectedIntent = detectIntent(questionText);
    detectedIntent = resolveIntentContradiction(
      detectedIntent,
      profile,
      facts,
      questionText
    );
  }
  // Client is initialized lazily inside generateAIResponse in services/aiService.js
  // Generate dynamic date context
  const dateFormatted = `${dayStr}-${monthStr}-${year}`;
  const monthName = now.toLocaleString('en-US', { month: 'long' });
  const weekdayName = now.toLocaleString('en-US', { weekday: 'long' });
  const quarter = `Q${Math.floor(monthNum / 3) + 1}`;
  
  // Seasonal Logic (approximate for general AI context)
  let season = "Winter";
  if (monthNum >= 2 && monthNum <= 4) season = "Spring";
  else if (monthNum >= 5 && monthNum <= 7) season = "Summer";
  else if (monthNum >= 8 && monthNum <= 10) season = "Autumn";

  const dateContext = `CURRENT DATE CONTEXT:
Today Date: ${dateFormatted}
Current Year: ${year}
Current Month: ${monthName}
Current Day: ${weekdayName}
Current Quarter: ${quarter}
Current Season: ${season}`;

  const systemInstruction = `You are a wise, warm, and elderly family Pandit Ji (an Indian astrologer) talking to a relative. Respond in Hindi.
CRITICAL RULES:
1. Tone & Style: Sound like a kind, experienced family elder. Use simple, everyday Hindi. Avoid excessive astrology jargon, dramatic language, or mystical statements.
2. Structure: Provide a short reasoning, a realistic prediction, one simple practical remedy, and end with exactly one natural follow-up question.
3. Word Variety: Avoid repetitive wording naturally. Vary your opening greetings and sentence structures across responses.
4. Length: STRICTLY maximum 80 words. Be very concise.
5. Formatting: Plain text only. No headings, no sections, no lists, no bullet points, and no markdown (do not use bold **, italics, etc.).
6. No Emojis: Do not use any emojis at all.
7. No AI: Never mention AI, chatbot, models, assistant, or prompts. Act as a real person.
8. Respect Facts: Align with and respect the user's marital status, occupation, and children facts. Never contradict stored facts.`;

  let ageDisplay = "Unknown";

  if (mode === 'chat' || mode === 'personal') {
    const { dobDay, dobMonth, dobYear } = userData;

    if (dobDay && dobMonth && dobYear) {
      const dobStr = `${dobYear}-${String(dobMonth).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;
      ageDisplay = calculateAge(dobStr);
    }
  } else {
    const { p1, p2 } = userData;
    if (!p1 || !p2) {
      return res.status(400).json({ error: 'Compatibility mode requires p1 and p2 in userData' });
    }
  }

  // Construct prompt for API providers
  let fullPrompt = "";
  if (mode === 'chat' || mode === 'personal') {
    let promptSections = [];

    // 1. USER PROFILE SECTION (Part 6)
    let userProfileBlock = "USER PROFILE\n";
    if (profile) {
      const age = calculateAge(profile.dob);
      const location = [profile.district, profile.state, profile.country].filter(Boolean).join(', ') || 'Unknown';
      userProfileBlock += `Name: ${profile.name || 'Unknown'}
Gender: ${profile.gender || 'Unknown'}
Age: ${age}
Marital Status: ${profile.maritalStatus || 'Unknown'}
Occupation: ${profile.occupation || 'Unknown'}
Education: ${profile.education || 'Unknown'}
Location: ${location}`;
    } else {
      userProfileBlock += `Name: ${userData.name || 'Unknown'}
Gender: ${userData.gender || 'Unknown'}
Age: ${ageDisplay || 'Unknown'}
Marital Status: Unknown
Occupation: Unknown
Education: Unknown
Location: Unknown`;
    }
    promptSections.push(userProfileBlock);

    // 2. FACT MEMORY SECTION
    let factMemoryBlock = "FACT MEMORY\n";
    if (getFactValue(facts.married) !== null) factMemoryBlock += `User is ${getFactValue(facts.married) ? "married" : "single"}.\n`;
    if (getFactValue(facts.hasChildren) !== null) factMemoryBlock += `User ${getFactValue(facts.hasChildren) ? "has children" : "does not have children"}.\n`;
    if (getFactValue(facts.hasJob) !== null) factMemoryBlock += `User ${getFactValue(facts.hasJob) ? "has a job" : "does not have a job"}.\n`;
    if (getFactValue(facts.hasBusiness) !== null) factMemoryBlock += `User ${getFactValue(facts.hasBusiness) ? "runs a business" : "does not run a business"}.\n`;
    if (getFactValue(facts.gender) !== null) factMemoryBlock += `User gender is ${getFactValue(facts.gender)}.\n`;
    promptSections.push(factMemoryBlock.trim());

    // 3. SUMMARY MEMORY SECTION
    if (summaryText) {
      promptSections.push(`SUMMARY MEMORY\n${summaryText}`);
    }

    // 4. CONVERSATION SECTION
    let conversationHistory = "CONVERSATION:\n";
    const activeHistory = Array.isArray(history) ? history.slice(-20) : [];
    if (activeHistory.length > 0) {
      activeHistory.forEach(msg => {
        if (msg && msg.role && msg.content) {
          const roleLabel = msg.role === "user" ? "USER" : "PANDIT";
          conversationHistory += `${roleLabel}: ${sanitizePromptInput(msg.content)}\n`;
        }
      });
    }
    promptSections.push(conversationHistory.trim());

    // Adjust system instruction for personalization & contradiction rules (Part 7 & 8)
    let activeSystemInstruction = systemInstruction;
    const occupation = profile?.occupation || '';
    const isEngineer = (profile?.education || '').toLowerCase().includes('engineer') || (profile?.occupation || '').toLowerCase().includes('engineer');
    
    let personalizationRule = "";
    if (occupation === "Student") {
      personalizationRule = "\nCRITICAL: Since the user is a student, focus predictions and guidance on education, exams, studies, concentration, and scholarships.";
    } else if (isEngineer) {
      personalizationRule = "\nCRITICAL: Since the user is an engineer, focus predictions and guidance on promotions, technical career growth, skill development, and overseas opportunities.";
    } else if (occupation === "Business Owner") {
      personalizationRule = "\nCRITICAL: Since the user is a business owner, focus predictions and guidance on business expansion, clients, cashflow, and market opportunities.";
    } else if (occupation === "Homemaker") {
      personalizationRule = "\nCRITICAL: Since the user is a homemaker, focus predictions and guidance on family harmony, domestic happiness, children's well-being, and peace.";
    } else if (occupation === "Retired") {
      personalizationRule = "\nCRITICAL: Since the user is retired, focus predictions and guidance on health, longevity, spirituality, peace of mind, and simple remedies.";
    }
    activeSystemInstruction += personalizationRule;

    if (userIsBusinessOwner) {
      activeSystemInstruction += "\nCRITICAL BUSINESS OWNER RULE: If the user asks about getting a job, unemployment, or searching for work, DO NOT frame your answer around them being unemployed. Instead, describe this transition as career expansion, cashflow improvements, and business growth opportunities.";
    }

    activeSystemInstruction += `\nUse only this context:\n${dateContext}\n`;

    fullPrompt = `
${activeSystemInstruction}

${promptSections.join('\n\n')}

<user_query>
${sanitizePromptInput(userData.question || "Tell me about my destiny")}
</user_query>
`;
  } else {
    // Compatibility mode fallback
    const { p1, p2 } = userData;
    fullPrompt = `Person 1: ${p1.name} (${p1.gender}), DOB: ${p1.dobDay}-${p1.dobMonth}-${p1.dobYear}, Time: ${p1.tobHour}:${p1.tobMinute} ${p1.tobPeriod}, Place: ${p1.pob}\nPerson 2: ${p2.name} (${p2.gender}), DOB: ${p2.dobDay}-${p2.dobMonth}-${p2.dobYear}, Time: ${p2.tobHour}:${p2.tobMinute} ${p2.tobPeriod}, Place: ${p2.pob}\n\nInstructions: Generate relationship compatibility analysis.`;
  }

  let jsonResponse = null;
  let success = false;
  let lastError = null;

  const useOfflineFallback = !BEDROCK_API_KEY || !BEDROCK_BASE_URL;

  if (!useOfflineFallback) {
    try {
      const aiText = await generateAIResponse(fullPrompt);

      if (!aiText || !aiText.trim()) {
        throw new Error("Empty AI output");
      }

      if (mode === 'chat' || mode === 'personal') {
        jsonResponse = {
          text: humanize(aiText)
        };
      } else {
        const parsedData = parseModelResponse(aiText);
        if (!parsedData || typeof parsedData !== "object" || typeof parsedData.score !== "number") {
          throw new Error("Invalid response");
        }
        jsonResponse = parsedData;
      }
      success = true;
    } catch (err) {
      console.error("AI Generation failed:", err.message || err);
      lastError = err;
    }
  }

  if (!success) {
    if (mode === 'chat' || mode === 'personal') {
      try {
        const fallbackText = buildResponse(uid, detectedIntent, todayString, questionText);
        jsonResponse = {
          text: fallbackText
        };
        success = true;
      } catch (fallbackError) {
        console.error("Offline fallback failed:", fallbackError);
        lastError = fallbackError;
      }
    }
  }

  if (success && jsonResponse) {
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const latestUserData = snap.data();
        if (!latestUserData) {
          throw new Error("User data empty");
        }

        const isPremiumLatest = !!latestUserData.premium;

        if (!isPremiumLatest) {
          const lastQDate = latestUserData.lastQuestionDate ? latestUserData.lastQuestionDate.toDate() : null;
          const lastCDate = latestUserData.lastCompDate ? latestUserData.lastCompDate.toDate() : null;
          const today = new Date();

          const dailyQUsedLatest = !isNewDay(lastQDate, today) ? latestUserData.dailyQuestionUsed : false;
          const dailyCUsedLatest = !isNewDay(lastCDate, today) ? latestUserData.dailyCompUsed : false;

          if (mode === 'chat' || mode === 'personal') {
            if (!dailyQUsedLatest) {
              tx.update(userRef, { dailyQuestionUsed: true, lastQuestionDate: FieldValue.serverTimestamp() });
            } else {
              const coins = snap.data()?.coins || 0;
              if (coins < AI_QUESTION_COST) {
                throw new Error("Insufficient coins");
              }
              tx.update(userRef, { coins: coins - AI_QUESTION_COST });
            }
          } else if (mode === 'compatibility') {
            if (!dailyCUsedLatest) {
              tx.update(userRef, { dailyCompUsed: true, lastCompDate: FieldValue.serverTimestamp() });
            } else {
              const coins = snap.data()?.coins || 0;
              if (coins < AI_QUESTION_COST) {
                throw new Error("Insufficient coins");
              }
              tx.update(userRef, { coins: coins - AI_QUESTION_COST });
            }
          } else {
            const coins = snap.data()?.coins || 0;
            if (coins < AI_QUESTION_COST) {
              throw new Error("Insufficient coins");
            }
            tx.update(userRef, { coins: coins - AI_QUESTION_COST });
          }
        }
      });
    } catch (txError) {
      console.error("Deduction Transaction failed:", txError);
      if (txError.message === "Insufficient coins") {
        return res.status(403).json({ error: 'Not enough coins' });
      }
    }
    return res.status(200).json(jsonResponse);
  }

  console.error("ALL MODELS FAILED. Final error state recorded.");
  const finalStatusCode = lastError?.status || lastError?.response?.status || 500;
  const isQuotaError = finalStatusCode === 429 || lastError?.message?.includes("quota") || lastError?.message?.includes("429");
  
  const fallbackMessage = isQuotaError 
    ? "Pandit AI is temporarily busy. Please try again later."
    : "I apologize, but I am experiencing cosmic interference. Please try again later.";

  if (mode === 'chat' || mode === 'personal') {
    return res.status(200).json({ 
      text: fallbackMessage
    });
  }

  return res.status(finalStatusCode === 429 ? 429 : 500).json({ 
    error: isQuotaError ? "Quota exceeded" : (lastError?.message || "Internal Server Error"),
  });
}
