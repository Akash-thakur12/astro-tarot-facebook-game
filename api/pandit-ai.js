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

  const { mode, currentTone, userData, history } = req.body;

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
      if (!doc.exists) throw new Error("USER_NOT_FOUND");
      
      const userDataDoc = doc.data();
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
            if ((userDataDoc.coins || 0) < 10) throw new Error("INSUFFICIENT_COINS");
            t.update(userRef, { coins: FieldValue.increment(-10) });
            deductedCoins = true;
          }
        } else if (mode === 'compatibility') {
          // Compatibility mode check
          if (!dailyCUsed) {
            t.update(userRef, { dailyCompUsed: true, lastCompDate: FieldValue.serverTimestamp() });
            usedFreeComp = true;
          } else {
            if ((userDataDoc.coins || 0) < 10) throw new Error("INSUFFICIENT_COINS");
            t.update(userRef, { coins: FieldValue.increment(-10) });
            deductedCoins = true;
          }
        } else {
           // Default to chat deduction if unknown mode but proceeding
           if ((userDataDoc.coins || 0) < 10) throw new Error("INSUFFICIENT_COINS");
           t.update(userRef, { coins: FieldValue.increment(-10) });
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

  const systemInstruction = `You are AstroTarot AI, an intelligent spiritual guide combining Astrology, Tarot Wisdom, and Intuition.
    Context: Use ONLY the provided birth profile and current date context for guidance.
    
    ${dateContext}

    PURPOSE:
    Provide concise, high-impact, and meaningful readings that get to the point quickly.

    CRITICAL RESPONSE RULES:
    1. LENGTH: 80 - 180 words maximum. Avoid essays or long articles.
    2. STRUCTURE: Use exactly 5 short sections with clear emojis.
    3. PARAGRAPHS: Keep each section to 1-3 lines only. No large blocks of text.
    4. LANGUAGE: Always respond in the user's language (Hindi, English, Hinglish).
    5. SPEED: Deliver the core prediction/reading in the very first section.
    6. PERSONA: Warm, insightful, and confident but never claiming absolute certainty.

    PREFERRED OUTPUT FORMAT:

    🔮 Reading
    (2-4 lines: Core interpretation of the energy/situation)

    ✨ Insight
    (1-3 lines: A deeper observation or hidden factor)

    📆 Outlook
    (1-2 lines: What to expect in the near future/coming weeks)

    💡 Guidance
    (1-2 lines: Practical advice or best approach)

    🙏 Suggestion
    (1 line: A short spiritual remedy, affirmation, or reflection)

    IF USER ASKS ABOUT ANOTHER PERSON:
    Maintain the same concise length (80-180 words) and format, focusing the sections on personality, feelings, connection, future, and approach.

    STRICT OUTPUT FORMAT:
    Return ONLY valid JSON. All keys must be double-quoted. No markdown code blocks.
    Always end the response with a short, intriguing follow-up sentence.
    
    REQUIRED JSON SCHEMA:
    {
      "prediction": "The complete structured reading matching the 5-section format above. Use double newlines between sections.",
      "reasoning": "Brief symbolic reason (1 sentence).",
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

    const profileContext = `ACT AS PANDIT AI. USE THIS USER PROFILE FOR ALL PREDICTIONS:
Name: ${name || 'Unknown'}
Gender: ${gender || 'Unknown'}
Birth Date: ${dobDay || '?'}-${dobMonth || '?'}-${dobYear || '?'}
Birth Time: ${tobHour || '?'}:${tobMinute || '?'} ${tobPeriod || ''}
Birth Place: ${pob || 'Unknown'}
CURRENT AGE: ${ageDisplay}

User has already provided these details. NEVER ask for them again. USE THE PROVIDED AGE EXACTLY. Respond directly to the user's query using this data.`;

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
Preferred Tone: ${currentTone || 'Wise'}

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
  "guidance": "Guidance From Pandit AI in user language"
}`;
    contents.push({ role: 'user', parts: [{ text: compPrompt }] });
  }

  // Model selection and fallback logic
  const models = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash-001"
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
          temperature: 0.8,
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
        jsonResponse = {
          text: `🔮 Prediction\n${parsedData.prediction || ""}\n\n🔍 Reasoning\n${parsedData.reasoning || ""}\n\n🌟 Guidance\n${parsedData.guidance || ""}`
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

      // For other critical errors (like 401/403 Auth errors or 400 Bad Request), 
      // we might want to try the next model anyway for robustness, but usually these are permanent.
      // We will continue for now unless it's a clear 404 Model Not Found.
      if (statusCode === 404) {
        console.warn(`Model ${modelName} not found. Trying next...`);
        continue;
      }
      
      // Default behavior: try next model in the chain
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
          t.update(userRef, { coins: FieldValue.increment(10) });
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




