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
import { getAstrologyData } from '../src/utils/astroEngine.js';


function buildAstrologyBlock(astroData) {
  if (!astroData) {
    return `PROVIDED ASTROLOGY DATA\nDATA UNAVAILABLE`;
  }

  const planetPos = astroData.planets 
    ? Object.entries(astroData.planets).map(([p, sign]) => `${p} in ${sign}`).join(", ")
    : "DATA UNAVAILABLE";

  return `PROVIDED ASTROLOGY DATA
Lagna: ${astroData.lagna || "DATA UNAVAILABLE"}
Moon Sign: ${astroData.moonSign || "DATA UNAVAILABLE"}
Nakshatra: ${astroData.nakshatra || "DATA UNAVAILABLE"}
Mahadasha: ${astroData.mahadasha || "DATA UNAVAILABLE"}
Antardasha: ${astroData.antardasha || "DATA UNAVAILABLE"}
Planet Positions: ${planetPos}
Gochar: ${astroData.gochar || "DATA UNAVAILABLE"}`;
}

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", 
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", 
  "Hasta", "Chitra", "Swati", "Visakha", "Anuradha", "Jyeshtha", 
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Sravana", "Dhanishta", "Shatabhisha", 
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

const DASHA_LORDS = [
  { name: "Ketu", years: 7 },
  { name: "Venus", years: 20 },
  { name: "Sun", years: 6 },
  { name: "Moon", years: 10 },
  { name: "Mars", years: 7 },
  { name: "Rahu", years: 18 },
  { name: "Jupiter", years: 16 },
  { name: "Saturn", years: 19 },
  { name: "Mercury", years: 17 }
];

function validateAstroResponse(text, astroData) {
  if (!text) return true;
  const lower = text.toLowerCase();
  const hasAstro = !!astroData;

  if (lower.includes("dhaiya")) {
    if (!astroData || !astroData.gochar || !astroData.gochar.toLowerCase().includes("dhaiya")) {
      console.log("Validation rejected: hallucinated Shani Dhaiya");
      return false;
    }
  }

  if (lower.includes("kanya lagna") || lower.includes("कन्या लग्न")) {
    if (!hasAstro || astroData.lagna !== "Kanya") {
      console.log("Validation rejected: hallucinated Kanya Lagna");
      return false;
    }
  }

  if (lower.includes("nakshatra") || lower.includes("नक्षत्र")) {
    if (!hasAstro || !astroData.nakshatra) {
      console.log("Validation rejected: Nakshatra mentioned but data unavailable");
      return false;
    }
    const calcNak = astroData.nakshatra.toLowerCase();
    for (const nak of NAKSHATRAS) {
      const nakLower = nak.toLowerCase();
      if (nakLower !== calcNak && lower.includes(nakLower)) {
        console.log(`Validation rejected: hallucinated Nakshatra ${nak}`);
        return false;
      }
    }
  }

  if (lower.includes("mahadasha") || lower.includes("महादशा") || lower.includes("dasha") || lower.includes("दशा")) {
    if (!hasAstro || !astroData.mahadasha) {
      console.log("Validation rejected: Dasha mentioned but data unavailable");
      return false;
    }
    const calcMaha = astroData.mahadasha.toLowerCase();
    const calcAntar = astroData.antardasha ? astroData.antardasha.toLowerCase() : "";
    for (const lord of DASHA_LORDS) {
      const lordLower = lord.name.toLowerCase();
      if (lordLower !== calcMaha && lordLower !== calcAntar && lower.includes(lordLower + " dasha")) {
        console.log(`Validation rejected: hallucinated Dasha of ${lord.name}`);
        return false;
      }
    }
  }

  if (lower.includes("gochar") || lower.includes("गोचर")) {
    if (!hasAstro || !astroData.gochar) {
      console.log("Validation rejected: Gochar mentioned but data unavailable");
      return false;
    }
  }

  return true;
}

function containsForbiddenPhrases(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  
  if (lower.includes("bhagwan ki kripa")) return true;
  if (lower.includes("sab theek ho jayega")) return true;
  if (lower.includes("taare dekho")) return true;
  
  const betaRegex = /\b(?:beta|atkal)\b/i;
  if (betaRegex.test(lower)) return true;

  // Devanagari equivalents:
  if (lower.includes("भगवान की कृपा") || lower.includes("सब ठीक हो") || lower.includes("तारे देखो") || /\b(?:बेटा|अटकल)\b/.test(lower)) {
    return true;
  }

  return false;
}

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

function getJaccardSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.trim().length > 0);
  const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.trim().length > 0);
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

function getCleanTopicName(intent) {
  if (!intent || intent === 'general') return null;
  if (intent.includes('marriage') || intent === 'breakup' || intent === 'ex_back' || intent === 'partner_loyal') return 'marriage';
  if (intent.includes('job') || intent === 'promotion' || intent === 'salary' || intent === 'career_field' || intent === 'unemployment' || intent === 'career') return 'career';
  if (intent === 'child_when') return 'children';
  if (intent === 'startup' || intent === 'investment' || intent === 'debt' || intent === 'property' || intent === 'house_purchase' || intent === 'business' || intent === 'money') return 'finance';
  if (intent.includes('foreign') || intent === 'visa') return 'travel';
  if (intent.includes('health') || intent === 'mental_stress') return 'health';
  if (intent === 'education') return 'education';
  if (intent === 'family') return 'family';
  return intent.split('_')[0]; // fallback to first word
}

function removeDuplicateSentences(text) {
  if (!text || typeof text !== 'string') return text;
  
  const sentences = text.match(/[^.!?।|]+(?:[.!?।|]+|\s*$)/g) || [text];
  
  const uniqueSentences = [];
  const seenRecords = [];
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    
    const normalized = trimmed.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/gi, '');
    
    let isDuplicate = false;
    for (const record of seenRecords) {
      if (normalized === record.normalized) {
        isDuplicate = true;
        break;
      }
      const sim = getJaccardSimilarity(trimmed, record.original);
      if (sim > 0.70) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      uniqueSentences.push(trimmed);
      seenRecords.push({ original: trimmed, normalized: normalized });
    }
  }
  
  return uniqueSentences.join(' ');
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
  let marriedGuardInstruction = "";

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
    const questionTextNormalized = (userData.question || '').trim().toLowerCase();
    
    // Check for AI identity questions: "tuje kisne banaya" (Step 3)
    if (questionTextNormalized.includes("tuje kisne banaya") || 
        questionTextNormalized.includes("tujhe kisne banaya") || 
        questionTextNormalized.includes("tumhe kisne banaya") || 
        /who\s+(created|made|built)\s+you/i.test(questionTextNormalized) ||
        (questionTextNormalized.includes("kisne") && questionTextNormalized.includes("banaya"))) {
      return res.status(200).json({
        text: "Main AstroTarot AI hoon. Mujhe AI models aur AstroTarot system ne banaya hai."
      });
    }

    if (questionTextNormalized.includes("tum galat yaad kar rahe ho")) {
      return res.status(200).json({
        text: "Ho sakta hai maine pehle ki baaton ko galat samjha ho."
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
  let userQueryForLLM = questionText;
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



  // Intent detection and contradiction routing
  if (mode === 'chat' || mode === 'personal') {
    const originalIntent = detectIntent(questionText);
    detectedIntent = resolveIntentContradiction(
      originalIntent,
      profile,
      facts,
      questionText
    );

    // Structured married-user guard (Step 5)
    const questionTextNormalized = (userData.question || '').trim().toLowerCase();
    const isMarried = (profile?.maritalStatus === "Married") || (getFactValue(facts.married) === true);
    const asksMarriageWhen = (originalIntent === 'marriage_when') || 
                             questionTextNormalized.includes("shadi kab") || 
                             questionTextNormalized.includes("shaadi kab") ||
                             questionTextNormalized.includes("marriage when");

    if (isMarried && asksMarriageWhen) {
      return res.status(200).json({
        text: "🔮 Prediction:\nAap pehle se vivahit hain.\n\n📿 Reasoning:\nProfile me marital status Married hai.\n\n🪔 Guidance:\nYadi vivaahik jeevan ya punarvivah sambandhit prashn hai to uske baare me pooch sakte hain."
      });
    }
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

  const systemInstruction = `Speak as an AstroTarot AI Predictor. Respond in natural, conversational Hindi. Remove any baba or generic GPT behavior.

CRITICAL RULES:
1. You must always structure your response exactly in this format:
🔮 Prediction:
[Direct answer first, addressing the query]

📿 Reasoning:
[Astrological reason. You MUST ONLY use the supplied astrology calculations from the "User Astrology Profile" and "PROVIDED ASTROLOGY DATA" section. Do NOT invent, assume, or hallucinate any Lagna, Mahadasha, Antardasha, Nakshatra, Gochar, planet positions, Shani Dhaiya, house positions, or timelines. If the astrology data is unavailable, you must explicitly say: "Kundali data uplabdh nahi hai."]

🪔 Guidance:
[Specific practical remedy]

2. Do not include any motivational speeches, generic motivation, or long lectures. No "bhagwan ki kripa", "sab theek ho jayega", "beta", "taare dekho", or "atkal".
3. Word count must be between 80 to 130 words in total.`;

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

  // Extract and resolve astrology variables (Step 1)
  let name = 'Unknown';
  let gender = 'Unknown';
  let maritalStatus = 'Unknown';
  let dob = 'Unknown';
  let tob = 'Unknown';
  let pob = 'Unknown';

  if (mode === 'chat' || mode === 'personal') {
    name = profile?.name || userData?.name || 'Unknown';
    gender = profile?.gender || getFactValue(facts.gender) || userData?.gender || 'Unknown';
    maritalStatus = profile?.maritalStatus || (getFactValue(facts.married) === true ? 'Married' : getFactValue(facts.married) === false ? 'Unmarried' : 'Unknown');

    // DOB
    const dobDay = userData?.dobDay || profile?.dobDay;
    const dobMonth = userData?.dobMonth || profile?.dobMonth;
    const dobYear = userData?.dobYear || profile?.dobYear;
    if (dobDay && dobMonth && dobYear) {
      dob = `${dobYear}-${String(dobMonth).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;
    } else if (profile?.dob) {
      dob = profile.dob;
    } else if (profile?.dateOfBirth) {
      dob = profile.dateOfBirth;
    }

    // Time (TOB)
    const tobHour = userData?.tobHour || profile?.tobHour;
    const tobMinute = userData?.tobMinute || profile?.tobMinute;
    const tobPeriod = userData?.tobPeriod || profile?.tobPeriod;
    if (tobHour !== undefined && tobMinute !== undefined) {
      tob = `${tobHour}:${String(tobMinute).padStart(2, '0')} ${tobPeriod || ''}`.trim();
    } else if (profile?.tob) {
      tob = profile.tob;
    } else if (profile?.timeOfBirth) {
      tob = profile.timeOfBirth;
    }

    // Place (POB)
    pob = profile?.pob || profile?.placeOfBirth || userData?.pob || 'Unknown';
  }

  const astroData = (mode === 'chat' || mode === 'personal')
    ? await getAstrologyData({ dob, tob, pob })
    : null;

  // Construct prompt for API providers
  let fullPrompt = "";
  if (mode === 'chat' || mode === 'personal') {
    let promptSections = [];

    // Fact Memory (Married, Gender, Occupation) & Language Preference
    let factMemoryBlock = "Fact Memory:\n";
    
    const isMarried = (profile?.maritalStatus === "Married") || (getFactValue(facts.married) === true);
    factMemoryBlock += `Married: ${isMarried ? "Yes" : "No"}\n`;
    factMemoryBlock += `Gender: ${gender}\n`;
    
    const occupation = profile?.occupation || userData?.occupation || 'Unknown';
    factMemoryBlock += `Occupation: ${occupation}\n`;

    const language = req.body.language || userData?.language || 'Hindi';
    factMemoryBlock += `Language Preference: ${language}`;

    promptSections.push(factMemoryBlock.trim());

    // Inject User Astrology Profile before user question (Step 2)
    let astrologyProfileBlock = `User Astrology Profile:
Name: ${name}
Gender: ${gender}
DOB: ${dob}
Time: ${tob}
Place: ${pob}
Marital Status: ${maritalStatus}`;

    promptSections.push(astrologyProfileBlock);

    // Inject calculated astroData (Step 8)
    promptSections.push(buildAstrologyBlock(astroData));

    // Recent Conversation (Recent 3 turns)
    const allHistoryMsgs = Array.isArray(history) ? history : [];
    
    // Ensure we exclude the current question if it is the last message
    let pastHistory = [];
    if (allHistoryMsgs.length > 0) {
      const lastMsg = allHistoryMsgs[allHistoryMsgs.length - 1];
      if (lastMsg.role === 'user' && lastMsg.content === userData.question) {
        pastHistory = allHistoryMsgs.slice(0, -1);
      } else {
        pastHistory = allHistoryMsgs;
      }
    }
    const pastUserMsgs = pastHistory.filter(m => m.role === 'user');
    const pastAssistantMsgs = pastHistory.filter(m => m.role === 'model' || m.role === 'assistant');

    const recentUserQuestions = pastUserMsgs.slice(-3).map(m => `- ${sanitizePromptInput(m.content)}`).join('\n');
    
    const recentPanditReplies = pastAssistantMsgs.slice(-3).map((m) => {
      const content = sanitizePromptInput(m.content);
      const words = content.split(/\s+/);
      const truncated = words.length > 35 ? words.slice(0, 35).join(' ') + '...' : content;
      return `- ${truncated}`;
    }).join('\n');

    let recentHistoryBlock = `Recent Conversation:
Recent User Questions:
${recentUserQuestions || "None"}

Recent Pandit Replies:
${recentPanditReplies || "None"}`;
    promptSections.push(recentHistoryBlock);

    fullPrompt = `
${systemInstruction}

${promptSections.join('\n\n')}

User Query:
${sanitizePromptInput(userQueryForLLM || "Tell me about my destiny")}
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

  let responseSource = "AI";

  console.log("=== AI REQUEST START ===");
  console.log("mode:", mode);
  console.log("question:", userData?.question);
  console.log("intent:", detectedIntent);
  if (mode === 'chat' || mode === 'personal') {
    console.log("Astrology Input Verification:");
    console.log(`Name: ${name}`);
    console.log(`Gender: ${gender}`);
    console.log(`DOB: ${dob}`);
    console.log(`Time: ${tob}`);
    console.log(`Place: ${pob}`);
    console.log(`Marital Status: ${maritalStatus}`);
    console.log(`Question: ${userQueryForLLM}`);
  }

  if (!useOfflineFallback) {
    try {
      console.log("Calling AI...");
      let aiText = await generateAIResponse(fullPrompt);
      console.log("AI returned text length:", aiText.length);

      let needsRetry = false;
      let retryReason = "";

      // Check forbidden phrases (Step 4)
      if (containsForbiddenPhrases(aiText)) {
        needsRetry = true;
        retryReason = "blacklist";
      }

      // Check astrology hallucinations (Step 11)
      if (!needsRetry && !validateAstroResponse(aiText, astroData)) {
        needsRetry = true;
        retryReason = "hallucination";
      }

      // Check repetition (if no retry triggered yet)
      const lastAssistantMsg = Array.isArray(history) 
        ? [...history].reverse().find(m => m.role === 'model' || m.role === 'assistant')
        : null;

      if (!needsRetry && lastAssistantMsg && lastAssistantMsg.content) {
        const similarity = getJaccardSimilarity(aiText, lastAssistantMsg.content);
        console.log(`Generated response Jaccard similarity to last response: ${similarity.toFixed(2)}`);
        if (similarity > 0.70) {
          needsRetry = true;
          retryReason = "repetition";
        }
      }

      if (needsRetry) {
        let retryPrompt = fullPrompt;
        if (retryReason === "blacklist") {
          console.log("Forbidden phrase detected! Retrying generation once...");
          retryPrompt += `\n\n[SYSTEM WARNING: Your previous response contained forbidden terms (like 'bhagwan ki kripa', 'sab theek ho jayega', 'beta', 'taare dekho', or 'atkal'). Please generate a new, different response completely free of these words. Ensure you use the required format with 🔮 Prediction:, 📿 Reasoning:, and 🪔 Guidance: headers.]`;
        } else if (retryReason === "hallucination") {
          console.log("Astrology hallucination detected! Retrying generation once...");
          retryPrompt += `\n\n[SYSTEM WARNING: Your previous response contained hallucinated astrological parameters (such as a wrong Lagna, Mahadasha, Nakshatra, Gochar, or Shani Dhaiya) that did not exist in the provided calculations. Please calculate and write your response using ONLY the provided astrology data. Never invent any astrological parameters.]`;
        } else {
          console.log("Repetition detected! Retrying generation once...");
          retryPrompt += `\n\n[SYSTEM WARNING: Please generate a new response. Answer differently and avoid repeating previous wording.]`;
        }
        aiText = await generateAIResponse(retryPrompt);
        console.log(`AI returned text length on retry (${retryReason}):`, aiText.length);
      }

      if (!aiText || !aiText.trim()) {
        throw new Error("Empty AI output");
      }

      if (mode === 'chat' || mode === 'personal') {
        const humanizedText = humanize(aiText);
        console.log("Humanized text length:", humanizedText.length);
        jsonResponse = {
          text: removeDuplicateSentences(humanizedText)
        };
      } else {
        const parsedData = parseModelResponse(aiText);
        if (!parsedData || typeof parsedData !== "object" || typeof parsedData.score !== "number") {
          throw new Error("Invalid response");
        }
        jsonResponse = parsedData;
      }
      console.log("AI SUCCESS");
      success = true;
    } catch (err) {
      console.log("AI FAILED:", err.message);
      console.error("AI Generation failed:", err.message || err);
      lastError = err;
    }
  }

  if (!success) {
    console.log("OFFLINE FALLBACK TRIGGERED");
    responseSource = "OFFLINE";
    if (mode === 'chat' || mode === 'personal') {
      try {
        console.log("Using horoscopeEngine / dataset fallback");
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
    console.log("RESPONSE SOURCE =", responseSource);
    return res.status(200).json(jsonResponse);
  }

  console.error("ALL MODELS FAILED. Final error state recorded.");
  const finalStatusCode = lastError?.status || lastError?.response?.status || 500;
  const isQuotaError = finalStatusCode === 429 || lastError?.message?.includes("quota") || lastError?.message?.includes("429");
  
  const fallbackMessage = isQuotaError 
    ? "Pandit AI is temporarily busy. Please try again later."
    : "I apologize, but I am experiencing cosmic interference. Please try again later.";

  if (mode === 'chat' || mode === 'personal') {
    console.log("RESPONSE SOURCE = OFFLINE");
    return res.status(200).json({ 
      text: fallbackMessage
    });
  }

  console.log("RESPONSE SOURCE = OFFLINE");
  return res.status(finalStatusCode === 429 ? 429 : 500).json({ 
    error: isQuotaError ? "Quota exceeded" : (lastError?.message || "Internal Server Error"),
  });
}
