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
  const now = Date.now();
  const userRate = rateLimits.get(uid) || { count: 0, resetTime: now + 60000 };
  if (now > userRate.resetTime) {
    userRate.count = 0;
    userRate.resetTime = now + 60000;
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
  const systemInstruction = `You are Pandit AI, a wise and compassionate astrology-inspired assistant. 
    You provide guidance based on birth details (Name, Gender, DOB, Time, Place).
    Rules:
    1. ALWAYS be helpful, natural, and conversational.
    2. NEVER reject a question. If a question is not about astrology, provide thoughtful guidance, symbolic interpretation, or practical suggestions.
    3. Use the user's birth details for context but don't force astrology if it doesn't fit.
    4. Maintain the conversation flow. Understand previous messages in the history.
    5. Detect user language (Hindi, English, Hinglish, etc.) and respond in the same language.
    6. For 'chat' mode, respond with a JSON object: { "text": "Your detailed response here..." }. 
    7. For 'compatibility' mode, follow the strict schema provided in the prompt.`;

  let contents = [];

  if (mode === 'chat' || mode === 'personal') {
    const { name, gender, dobDay, dobMonth, dobYear, tobHour, tobMinute, tobPeriod, pob } = userData;
    const profileContext = `USER PROFILE:\nName: ${name || 'Unknown'}\nGender: ${gender || 'Unknown'}\nBirth Date: ${dobDay || '?'}-${dobMonth || '?'}-${dobYear || '?'}\nBirth Time: ${tobHour || '?'}:${tobMinute || '?'}\nBirth Place: ${pob || 'Unknown'}`;

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

  // Model selection with fallback
  const models = ["gemini-1.5-flash", "gemini-1.5-flash-8b"];
  let lastError = null;
  let success = false;
  let jsonResponse = null;

  for (const modelName of models) {
    try {
      console.log(`Attempting request with model: ${modelName}`);
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
      if (!text || !text.trim()) {
        throw new Error("Empty Gemini response");
      }

      let cleanedText = text.trim();
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText
          .replace(/^```(?:json)?\n?/, "") 
          .replace(/\n?```$/, "")          
          .trim();
      }
      
      jsonResponse = JSON.parse(cleanedText);

      // JSON Shape Validation
      if (mode === 'chat' || mode === 'personal') {
        if (!jsonResponse || typeof jsonResponse !== "object" || typeof jsonResponse.text !== "string") {
          console.error("INVALID JSON SHAPE:", jsonResponse);
          jsonResponse = {
            text: "I apologize, but I had trouble formatting my response. Please ask again."
          };
        }
      } else {
        if (!jsonResponse || typeof jsonResponse !== "object" || typeof jsonResponse.score !== "number" || !Array.isArray(jsonResponse.sections)) {
           console.error("INVALID COMPATIBILITY JSON SHAPE:", jsonResponse);
           throw new Error("Invalid compatibility response shape");
        }
      }

      console.log(`Success with model: ${modelName}`);
      success = true;
      break; // Exit loop on success

    } catch (error) {
      lastError = error;
      const statusCode = error?.status || error?.response?.status || "Unknown";
      console.error(`Error with model ${modelName} (Status ${statusCode}):`, error.message);
      
      // If it's a 429 or quota error, log specifically and continue to next model
      if (statusCode === 429 || error.message?.includes("quota") || error.message?.includes("429")) {
        console.warn(`Quota exceeded for ${modelName}. Checking fallback...`);
        continue;
      }
      
      // For other critical errors, we might want to break early, 
      // but for robustness we try the fallback anyway unless it's an Auth error
      if (statusCode === 401 || statusCode === 403) {
        break;
      }
    }
  }

  if (success && jsonResponse) {
    return res.status(200).json(jsonResponse);
  }

  // If we reach here, all models failed
  console.error("ALL MODELS FAILED. Last error:", lastError);
  const finalStatusCode = lastError?.status || lastError?.response?.status || 500;
  const isQuotaError = finalStatusCode === 429 || lastError?.message?.includes("quota") || lastError?.message?.includes("429");
  
  const fallbackMessage = isQuotaError 
    ? "Pandit AI is temporarily busy. Please try again shortly."
    : "I apologize, but I am experiencing cosmic interference. Please try again. (Any coins used have been refunded).";

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
      console.log(`Refunded user ${uid} due to AI failure (Quota: ${isQuotaError})`);
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


