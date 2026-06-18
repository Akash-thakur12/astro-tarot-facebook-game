import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

  if (!userData) {
    return res.status(400).json({ error: 'Missing userData in request body' });
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured.' });
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

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(API_KEY);

  // Generate dynamic date context
  const dayStr = String(now.getDate()).padStart(2, '0');
  const monthNum = now.getMonth(); // 0-indexed
  const monthStr = String(monthNum + 1).padStart(2, '0');
  const year = now.getFullYear();
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

  const systemInstruction = `You are Pandit AI, a warm, intelligent, spiritual astrology and tarot guide.
    Context: Use ONLY the provided birth profile and current date context for guidance.
    
    ${dateContext}

    PURPOSE:
    Provide engaging, helpful, and personalized guidance that feels natural, human, and trustworthy.

    LANGUAGE RULES:
    1. If user writes in Hinglish, reply in pure Hindi (Devanagari).
    2. If user writes in Hindi, reply in pure Hindi.
    3. If user writes in English, reply in English.
    4. NEVER mix Hindi and English in the same answer.
    5. NEVER use English headings inside Hindi responses.
    6. NUMBERS: Always use standard English digits (e.g., 2026, 5, 100) for all numbers, dates, and years, even in Hindi responses. NEVER use Devanagari numerals (like २०२६).

    STRICTLY PROHIBITED HEADINGS (DO NOT USE):
    Prediction, Reading, Reasoning, Guidance, Insight, Outlook, Suggestion.

    PROHIBITED ASTROLOGY TERMS:
    NEVER mention: 5th/7th/11th house, Jupiter/Saturn transit, Mahadasha, Antardasha, Navamsha, Planetary degrees, Horoscope chart analysis, or Kundali calculations.
    Avoid phrases like "Your chart shows" or "Jupiter is transiting". Speak about energy and tendencies instead.

    RESPONSE STYLE:
    - LENGTH: 80-150 words.
    - EMOJIS: Maximum 2 emojis in the entire response.
    - PARAGRAPHS: Short, 2-3 sentence blocks.
    - SECTIONS: Use 3-4 short sections.
    - FORMAT: Use bold headers for sections.

    SECTION NAMES (HINDI):
    प्रमुख संकेत
    भविष्य की संभावना
    क्या करें
    शुभ उपाय

    SECTION NAMES (ENGLISH):
    Key Indications
    Future Possibilities
    What to Do
    Auspicious Remedy

    IF ASKING ABOUT ANOTHER PERSON (HINDI):
    उनके स्वभाव के संकेत
    भावनात्मक स्थिति
    भविष्य की संभावना
    शुभ उपाय

    IF ASKING ABOUT ANOTHER PERSON (ENGLISH):
    Nature Indications
    Emotional State
    Future Possibilities
    Auspicious Remedy

    TONE: Warm, Wise, Personal, Positive, Concise. Never sound like a technical AI.

    STRICT OUTPUT FORMAT:
    Return ONLY valid JSON. All keys must be double-quoted. No markdown code blocks.
    Always end the response with one natural follow-up question.
    
    REQUIRED JSON SCHEMA:
    {
      "prediction": "The complete structured reading containing the sections and the follow-up question. Use double newlines between sections.",
      "reasoning": "A very brief symbolic note (1 sentence).",
      "guidance": "Key spiritual takeaway (1 sentence)."
    }`;

  let contents = [];

  if (mode === 'chat' || mode === 'personal') {
    const { name, gender, dobDay, dobMonth, dobYear, tobHour, tobMinute, tobPeriod, pob } = userData;
    
    // Calculate current age server-side
    let ageDisplay = "Unknown";
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

    const profileContext = `ACT AS PANDIT AI. USE THIS USER PROFILE:
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

  // Model selection and fallback logic
  const models = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-flash-latest"
  ];

  let jsonResponse = null;
  let success = false;
  let lastError = null;

  for (const modelName of models) {
    try {
      console.log("Attempting model:", modelName);
      
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction
      });

      const result = await model.generateContent({
        contents,
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      });

      if (!result || !result.response) {
        throw new Error("No response from Gemini");
      }

      const text = result.response.text();
      console.log("RAW GEMINI RESPONSE:", text);

      if (!text || !text.trim()) {
        throw new Error("Empty Gemini response");
      }

      let cleanedText = text.trim();
      // Remove any potential markdown code blocks
      cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      
      let parsedData = null;
      try {
        parsedData = JSON.parse(cleanedText);
      } catch (parseError) {
        console.warn("JSON.parse failed, attempting regex fallback:", parseError.message);
        
        // Regex Fallback Parser - handles both "key": and key:
        const extractField = (field) => {
          const regex = new RegExp(`"?${field}"?\\s*:\\s*"(.*?)"`, "is");
          const match = cleanedText.match(regex);
          return match ? match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n") : "";
        };

        if (mode === 'chat' || mode === 'personal') {
          parsedData = {
            prediction: extractField("prediction"),
            reasoning: extractField("reasoning"),
            guidance: extractField("guidance")
          };
          
          if (!parsedData.prediction && !parsedData.reasoning && !parsedData.guidance) {
            parsedData = {
              prediction: cleanedText,
              reasoning: "",
              guidance: ""
            };
          }
        } else {
          // Compatibility mode fallback
          const scoreMatch = cleanedText.match(/"?score"?\s*:\s*(\d+)/);
          const guidanceMatch = cleanedText.match(/"?guidance"?\s*:\s*"(.*?)"/);
          parsedData = {
            score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
            guidance: guidanceMatch ? guidanceMatch[1] : cleanedText,
            sections: []
          };
        }
      }

      // Final Normalization and Shape Validation
      if (mode === 'chat' || mode === 'personal') {
        // Return only the prediction text which now contains the standardized headers
        jsonResponse = {
          text: parsedData.prediction || ""
        };
      } else {
        // Compatibility mode validation
        if (!parsedData || typeof parsedData !== "object" || typeof parsedData.score !== "number") {
           throw new Error("Invalid compatibility response shape");
        }
        jsonResponse = parsedData;
      }

      console.log("Model success:", modelName);
      success = true;
      break; // Exit loop on success

    } catch (error) {
      lastError = error;
      const statusCode = error?.status || error?.response?.status || "Unknown";
      console.error("Model failed:", modelName, {
        message: error.message,
        status: statusCode,
        details: error.response?.data || "No extra data"
      });

      // If it's a 429 (quota) or 503 (unavailable), continue to the next model
      if (statusCode === 429 || statusCode === 503 || error.message?.includes("quota") || error.message?.includes("429")) {
        console.warn(`Fallback triggered from ${modelName} due to status ${statusCode}.`);
        continue;
      }

      if (statusCode === 404) {
        console.warn(`Model ${modelName} not found. Trying next...`);
        continue;
      }
    }
  }

  if (success && jsonResponse) {
    return res.status(200).json(jsonResponse);
  }

  // If we reach here, all models failed
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




