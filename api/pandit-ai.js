import OpenAI from 'openai';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { buildResponse } from '../src/utils/responseBuilder.js';
import { detectIntent } from '../src/utils/intentDetector.js';
import { xmur3, mulberry32 } from '../src/utils/prng.js';

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

  if (mode === 'chat' || mode === 'personal') {
    const questionText = (userData.question || '').trim().toLowerCase();
    
    const greetings = ['hi', 'hlo', 'hello', 'hey', 'namaste', 'namaskar'];
    const thanks = ['thanks', 'thank you'];
    const ok = ['ok', 'okay', 'hmm'];
    const morning = ['good morning'];
    const night = ['good night'];

    if (greetings.includes(questionText)) {
      return res.status(200).json({
        text: "🙏 Namaste! Main Pandit AI hoon. Aaj kis vishay par margdarshan chahiye?"
      });
    }
    if (thanks.includes(questionText)) {
      return res.status(200).json({
        text: "🙏 Kalyan ho! Aashirwad sada aapke saath hai."
      });
    }
    if (ok.includes(questionText)) {
      return res.status(200).json({
        text: "🙏 Aashirwad! Grahon ki sthiti par vishwas rakhein. Kuch aur jaanna chahte hain?"
      });
    }
    if (morning.includes(questionText)) {
      return res.status(200).json({
        text: "🌅 Shubh Prabhat! Suryadev aapko urja aur safalta pradaan karein. Kalyan ho!"
      });
    }
    if (night.includes(questionText)) {
      return res.status(200).json({
        text: "🌌 Shubh Ratri! Chandradev aapko shanti pradaan karein. Shubh swapna!"
      });
    }
  }

  const BEDROCK_API_KEY = process.env.BEDROCK_API_KEY;
  const BEDROCK_BASE_URL = process.env.BEDROCK_BASE_URL;
  if (!BEDROCK_API_KEY || !BEDROCK_BASE_URL) {
    return res.status(500).json({ error: 'BEDROCK_API_KEY or BEDROCK_BASE_URL not configured.' });
  }

  // CRITICAL FIX #4: Move Coin Logic To Backend
  let deductedCoins = false;
  let usedFreePersonal = false;
  let usedFreeComp = false;
  const userRef = db.collection('users').doc(uid);

  try {
    await db.runTransaction(async (t) => {
      const doc = await t.get(userRef);
      
      let userDataDoc;
      if (!doc.exists) {
        // AUTO-CREATE
        userDataDoc = {
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
        t.set(userRef, userDataDoc);
      } else {
        userDataDoc = doc.data();
      }

      if (!userDataDoc) throw new Error("USER_DATA_EMPTY");

      if (!userDataDoc.premium) {
        const lastQDate = userDataDoc.lastQuestionDate ? userDataDoc.lastQuestionDate.toDate() : null;
        const lastCDate = userDataDoc.lastCompDate ? userDataDoc.lastCompDate.toDate() : null;
        const today = new Date();
        const isNewDay = (lastDate) => !lastDate || 
          lastDate.getDate() !== today.getDate() || 
          lastDate.getMonth() !== today.getMonth() || 
          lastDate.getFullYear() !== today.getFullYear();

        const dailyQUsed = !isNewDay(lastQDate) ? userDataDoc.dailyQuestionUsed : false;
        const dailyCUsed = !isNewDay(lastCDate) ? userDataDoc.dailyCompUsed : false;

        if (mode === 'chat' || mode === 'personal') {
          if (!dailyQUsed) {
            t.update(userRef, { dailyQuestionUsed: true, lastQuestionDate: FieldValue.serverTimestamp() });
            usedFreePersonal = true;
          } else {
            if ((userDataDoc.coins || 0) < AI_QUESTION_COST) throw new Error("INSUFFICIENT_COINS");
            t.update(userRef, { coins: FieldValue.increment(-AI_QUESTION_COST) });
            deductedCoins = true;
          }
        } else if (mode === 'compatibility') {
          // Compatibility mode check
          if (!dailyCUsed) {
            t.update(userRef, { dailyCompUsed: true, lastCompDate: FieldValue.serverTimestamp() });
            usedFreeComp = true;
          } else {
            if ((userDataDoc.coins || 0) < AI_QUESTION_COST) throw new Error("INSUFFICIENT_COINS");
            t.update(userRef, { coins: FieldValue.increment(-AI_QUESTION_COST) });
            deductedCoins = true;
          }
        } else {
           // Default to chat deduction if unknown mode but proceeding
           if ((userDataDoc.coins || 0) < AI_QUESTION_COST) throw new Error("INSUFFICIENT_COINS");
           t.update(userRef, { coins: FieldValue.increment(-AI_QUESTION_COST) });
           deductedCoins = true;
        }
      }
    });
  } catch (e) {
    if (e.message === "INSUFFICIENT_COINS") return res.status(403).json({ error: 'Not enough coins' });
    if (e.message === "USER_NOT_FOUND") return res.status(404).json({ error: 'User profile not found' });
    console.error("Transaction Error:", e);
    return res.status(500).json({ error: 'Failed to verify account balance' });
  }

  // Hybrid Routing Logic (Deterministic Local Fallback)
  if (mode === 'chat' || mode === 'personal') {
    const question = (userData.question || '').trim();
    detectedIntent = detectIntent(question);

    const datasetIntents = [
      'marriage_when',
      'government_job',
      'ex_back',
      'breakup',
      'business',
      'visa',
      'health',
      'mental_stress',
      'child_when'
    ];

    if (datasetIntents.includes(detectedIntent)) {
      const seedFn = xmur3(uid + detectedIntent + todayString);
      const seed = seedFn();
      const rand = mulberry32(seed);
      const randVal = rand();
      if (randVal < 0.60) {
        console.log(`[Hybrid Routing] Immediate local response (60% route) for intent "${detectedIntent}" (seed: ${seed}, rand: ${randVal})`);
        const localText = buildResponse(uid, detectedIntent, todayString);
        return res.status(200).json({
          text: localText
        });
      } else {
        console.log(`[Hybrid Routing] Bedrock AI (40% route) for intent "${detectedIntent}" (seed: ${seed}, rand: ${randVal})`);
      }
    }
  }

  // Initialize Bedrock OpenAI Client
  const openaiClient = new OpenAI({
    apiKey: BEDROCK_API_KEY,
    baseURL: BEDROCK_BASE_URL,
  });

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

  console.log("GENERATED DATE CONTEXT:", dateFormatted, weekdayName, season);

  const systemInstruction = `You are a warm Indian astrology pandit. 
Rules: 
Reply like a normal astrologer chatting with the user. 
Answer only what the user asked. 
Use simple Hindi + Hinglish. 
Plain text only. 
No headings. 
No sections. 
No markdown. 
No emojis. 
Maximum 120 words. 
No follow-up questions. 
Never say you are AI. 
Be confident, positive and natural. 
Use only this context: 
${dateContext} 
`;

  let contents = [];
  let ageDisplay = "Unknown";
  let profileContext = "";

  if (mode === 'chat' || mode === 'personal') {
    const { name, gender, dobDay, dobMonth, dobYear, tobHour, tobMinute, tobPeriod, pob } = userData;
    
    // Calculate current age server-side
    try {
      if (dobDay && dobMonth && dobYear) {
        const today = new Date();
        const birthDate = new Date(parseInt(dobYear), parseInt(dobMonth) - 1, parseInt(dobDay));
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        ageDisplay = age;
      }
    } catch (e) {
      console.error("Age calculation error:", e);
    }

    profileContext = `ACT AS PANDIT AI. USE THIS USER PROFILE:
Name: ${name || 'Unknown'}
Gender: ${gender || 'Unknown'}
Birth Date: ${dobDay || '?'}-${dobMonth || '?'}-${dobYear || '?'}
Birth Time: ${tobHour || '?'}:${tobMinute || '?'} ${tobPeriod || ''}
Birth Place: ${pob || 'Unknown'}
CURRENT AGE: ${ageDisplay}

Respond directly to the query. DO NOT ask for birth details again.`;

    contents = [{ role: 'user', parts: [{ text: profileContext }] }];
    if (Array.isArray(history) && history.length > 0) {
      history.forEach(msg => {
        if (msg && msg.role && msg.content) {
          contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] });
        }
      });
    }
  } else {
    // Compatibility mode
    const { p1, p2 } = userData;
    if (!p1 || !p2) {
      return res.status(400).json({ error: 'Compatibility mode requires p1 and p2 in userData' });
    }
    const compPrompt = `Person 1: ${p1.name} (${p1.gender}), DOB: ${p1.dobDay}-${p1.dobMonth}-${p1.dobYear}, Time: ${p1.tobHour}:${p1.tobMinute} ${p1.tobPeriod}, Place: ${p1.pob}
Person 2: ${p2.name} (${p2.gender}), DOB: ${p2.dobDay}-${p2.dobMonth}-${p2.dobYear}, Time: ${p2.tobHour}:${p2.tobMinute} ${p2.tobPeriod}, Place: ${p2.pob}

Instructions:
Generate a relationship compatibility analysis returning STRICTLY a JSON object matching this schema:
{
  "type": "compatibility",
  "score": 85,
  "guna": 28,
  "sections": [
    { "icon": "🧠", "title": "Communication Compatibility", "content": "..." },
    { "icon": "❤️", "title": "Emotional Compatibility", "content": "..." },
    { "icon": "💍", "title": "Marriage Potential", "content": "..." },
    { "icon": "⚖️", "title": "Strengths", "content": "..." },
    { "icon": "⚠️", "title": "Challenges", "content": "..." },
    { "icon": "🔮", "title": "Long-Term Outlook", "content": "..." }
  ],
  "guidance": "Guidance from Pandit AI in user's language"
}`;
    contents.push({ role: 'user', parts: [{ text: compPrompt }] });
  }

  // Construct prompt for API providers
  let fullPrompt = "";
  if (mode === 'chat' || mode === 'personal') {
    fullPrompt = `${systemInstruction}\n\n${userData.question || "Tell me about my destiny"}`;
  } else {
    // Compatibility mode fallback
    const { p1, p2 } = userData;
    fullPrompt = `Person 1: ${p1.name} (${p1.gender}), DOB: ${p1.dobDay}-${p1.dobMonth}-${p1.dobYear}, Time: ${p1.tobHour}:${p1.tobMinute} ${p1.tobPeriod}, Place: ${p1.pob}\nPerson 2: ${p2.name} (${p2.gender}), DOB: ${p2.dobDay}-${p2.dobMonth}-${p2.dobYear}, Time: ${p2.tobHour}:${p2.tobMinute} ${p2.tobPeriod}, Place: ${p2.pob}\n\nInstructions: Generate relationship compatibility analysis.`;
  }

  let jsonResponse = null;
  let success = false;
  let lastError = null;

  // Helper parser function (for compatibility mode only)
  function parseModelResponse(text, currentMode) {
    let cleanedText = text.trim();
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    
    let parsedData = null;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (parseError) {
      const scoreMatch = cleanedText.match(/"?score"?\s*:\s*(\d+)/);
      const guidanceMatch = cleanedText.match(/"?guidance"?\s*:\s*"(.*?)"/);
      parsedData = {
        score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
        guidance: guidanceMatch ? guidanceMatch[1] : cleanedText,
        sections: []
      };
    }
    return parsedData;
  }

  // Try Bedrock Fallback Chain
  const bedrockModels = [
    "deepseek.v3.2",
    "google.gemma-3-4b-it",
    "mistral.voxtral-mini-3b-2507",
    "mistral.ministral-3-3b-instruct",
    "qwen.qwen3-32b-v1:0"
  ];

  for (const modelName of bedrockModels) {
    console.log("Trying model:", modelName);
    try {
      const response = await openaiClient.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'user', content: fullPrompt }
        ],
        temperature: 0.7
      }, {
        timeout: 30000 // 30 seconds timeout
      });

      const aiText = response.choices?.[0]?.message?.content;
      if (!aiText || !aiText.trim()) {
        throw new Error("Empty output");
      }

      if (mode === 'chat' || mode === 'personal') {
        jsonResponse = {
          text: aiText.trim()
        };
      } else {
        const parsedData = parseModelResponse(aiText, mode);
        if (!parsedData || typeof parsedData !== "object" || typeof parsedData.score !== "number") {
          throw new Error("Invalid response");
        }
        jsonResponse = parsedData;
      }

      console.log("Model success:", modelName);
      success = true;
      break;
    } catch (err) {
      console.error("Model failed:", modelName);
      console.error(err);
      lastError = err;
    }
  }

  if (success && jsonResponse) {
    return res.status(200).json(jsonResponse);
  }

  // If we reach here, all models failed
  console.log("All providers failed");

  if (mode === 'chat' || mode === 'personal') {
    console.log("Using offline horoscope fallback");
    try {
      const fallbackText = buildResponse(uid, detectedIntent, todayString);
      return res.status(200).json({
        text: fallbackText
      });
    } catch (fallbackError) {
      console.error("Offline fallback failed:", fallbackError);
    }
  }

  console.error("ALL MODELS FAILED. Final error state recorded.");
  const finalStatusCode = lastError?.status || lastError?.response?.status || 500;
  const isQuotaError = finalStatusCode === 429 || lastError?.message?.includes("quota") || lastError?.message?.includes("429");
  
  const fallbackMessage = isQuotaError 
    ? "Pandit AI is temporarily busy. Please try again later."
    : "I apologize, but I am experiencing cosmic interference. Please try again later.";

  // CRITICAL FIX #5: Refund On Gemini Failure
  try {
    if (deductedCoins || usedFreePersonal || usedFreeComp) {
      await db.runTransaction(async (t) => {
        if (deductedCoins) {
          t.update(userRef, { coins: FieldValue.increment(AI_QUESTION_COST) });
        }
        if (usedFreePersonal) {
          t.update(userRef, { dailyQuestionUsed: false });
        }
        if (usedFreeComp) {
          t.update(userRef, { dailyCompUsed: false });
        }
      });
      console.log(`Refunded user ${uid} due to AI failure (Quota issue: ${isQuotaError})`);
    }
  } catch (refundError) {
    console.error("CRITICAL: Failed to refund user", uid, refundError);
  }

  // Provide a graceful fallback response if requested via chat mode
  if (mode === 'chat' || mode === 'personal') {
    return res.status(200).json({ 
      text: fallbackMessage
    });
  }

  return res.status(finalStatusCode === 429 ? 429 : 500).json({ 
    error: isQuotaError ? "Quota exceeded" : (lastError?.message || "Internal Server Error"),
  });
}




