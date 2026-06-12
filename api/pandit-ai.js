import { GoogleGenerativeAI } from '@google/generative-ai';
import admin from 'firebase-admin';

// Initialize Firebase Admin securely
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      })
    });
  } catch (e) {
    // Fallback for local / default creds if cert vars are missing
    admin.initializeApp();
  }
}
const db = admin.firestore();

// Rate limiting map (in-memory, per Vercel instance)
const rateLimits = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CRITICAL FIX #3: Server-Side Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  const idToken = authHeader.split('Bearer ')[1];
  let uid;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    uid = decodedToken.uid;
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
            t.update(userRef, { dailyQuestionUsed: true, lastQuestionDate: admin.firestore.FieldValue.serverTimestamp() });
            usedFreePersonal = true;
          } else {
            if ((userDataDoc.coins || 0) < 10) throw new Error("INSUFFICIENT_COINS");
            t.update(userRef, { coins: admin.firestore.FieldValue.increment(-10) });
            deductedCoins = true;
          }
        } else {
          // Compatibility mode check
          if (!dailyCUsed) {
            t.update(userRef, { dailyCompUsed: true, lastCompDate: admin.firestore.FieldValue.serverTimestamp() });
            usedFreeComp = true;
          } else {
            if ((userDataDoc.coins || 0) < 10) throw new Error("INSUFFICIENT_COINS");
            t.update(userRef, { coins: admin.firestore.FieldValue.increment(-10) });
            deductedCoins = true;
          }
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

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction
  });

  let contents = [];

  if (mode === 'chat' || mode === 'personal') {
    const { name, gender, dobDay, dobMonth, dobYear, tobHour, tobMinute, tobPeriod, pob } = userData;
    const profileContext = `USER PROFILE:\nName: ${name}\nGender: ${gender}\nBirth Date: ${dobDay}-${dobMonth}-${dobYear}\nBirth Time: ${tobHour}:${tobMinute} ${tobPeriod}\nBirth Place: ${pob}`;

    contents = [{ role: 'user', parts: [{ text: profileContext }] }];
    if (history && history.length > 0) {
      history.forEach(msg => {
        contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] });
      });
    }
  } else {
    // CRITICAL FIX #9: Compatibility Regression Check
    const { p1, p2 } = userData;
    const compPrompt = `Person 1: ${p1.name} (${p1.gender}), DOB: ${p1.dobDay}-${p1.dobMonth}-${p1.dobYear}, Time: ${p1.tobHour}:${p1.tobMinute} ${p1.tobPeriod}, Place: ${p1.pob}
Person 2: ${p2.name} (${p2.gender}), DOB: ${p2.dobDay}-${p2.dobMonth}-${p2.dobYear}, Time: ${p2.tobHour}:${p2.tobMinute} ${p2.tobPeriod}, Place: ${p2.pob}
Preferred Tone: ${currentTone}

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

  try {
    const result = await model.generateContent({
      contents,
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json"
      }
    });

    const text = result.response.text();
    
    // CRITICAL FIX #1: Empty Gemini Response Protection
    if (!text || !text.trim()) {
      throw new Error("Empty Gemini response");
    }

    // CRITICAL FIX #8: Production Logging
    if (process.env.NODE_ENV !== "production") {
      console.log("RAW GEMINI RESPONSE:", text);
    }

    let cleanedText = text.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText
        .replace(/^```(?:json)?\n?/, "") 
        .replace(/\n?```$/, "")          
        .trim();
    }
    
    if (process.env.NODE_ENV !== "production") {
      console.log("CLEANED RESPONSE:", cleanedText);
    }

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("JSON PARSE ERROR:", parseError);
      throw new Error("Invalid JSON from Gemini");
    }

    // CRITICAL FIX #2 & #9: JSON Shape Validation
    if (mode === 'chat' || mode === 'personal') {
      if (!jsonResponse || typeof jsonResponse !== "object" || typeof jsonResponse.text !== "string") {
        console.error("INVALID JSON SHAPE:", jsonResponse);
        jsonResponse = {
          text: "I apologize, but I had trouble formatting my response. Please ask again."
        };
      }
    } else {
      // Compatibility mode validation
      if (!jsonResponse || typeof jsonResponse !== "object" || typeof jsonResponse.score !== "number" || !Array.isArray(jsonResponse.sections)) {
         console.error("INVALID COMPATIBILITY JSON SHAPE:", jsonResponse);
         throw new Error("Invalid compatibility response shape");
      }
    }

    return res.status(200).json(jsonResponse);

  } catch (error) {
    console.error("GEMINI ERROR:", error);
    
    // CRITICAL FIX #5: Refund On Gemini Failure
    try {
      if (deductedCoins || usedFreePersonal || usedFreeComp) {
        await db.runTransaction(async (t) => {
          if (deductedCoins) {
            t.update(userRef, { coins: admin.firestore.FieldValue.increment(10) });
          }
          if (usedFreePersonal) {
            t.update(userRef, { dailyQuestionUsed: false });
          }
          if (usedFreeComp) {
            t.update(userRef, { dailyCompUsed: false });
          }
        });
        console.log(`Refunded user ${uid} due to AI failure`);
      }
    } catch (refundError) {
      console.error("CRITICAL: Failed to refund user", uid, refundError);
    }

    // Provide a graceful fallback response if requested via chat mode
    if (mode === 'chat' || mode === 'personal') {
      return res.status(200).json({ 
        text: "I apologize, but I am experiencing cosmic interference. Please try again. (Any coins used have been refunded)." 
      });
    }

    return res.status(500).json({ 
      error: error?.message || "Internal Server Error",
    });
  }
}
