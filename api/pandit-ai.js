import OpenAI from 'openai';
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

  if (mode === 'chat' || mode === 'personal') {
    const questionText = (userData.question || '').trim().toLowerCase();
    const greetings = ['hi', 'hlo', 'hello', 'hey', 'namaste', 'namaskar'];
    if (greetings.includes(questionText)) {
      return res.status(200).json({
        text: "🙏 Namaste! Main Pandit AI hoon. Aaj kis vishay par margdarshan chahiye?"
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

  // Initialize Bedrock OpenAI Client
  const openaiClient = new OpenAI({
    apiKey: BEDROCK_API_KEY,
    baseURL: BEDROCK_BASE_URL,
  });

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

  const systemInstruction = `You are Pandit AI, a highly experienced and warm Indian Astro-Kundali Pandit. 
    You are spiritual, positive, and confident. Never behave like a generic chatbot or an AI.

    Context: Use ONLY the provided birth profile and current date context for guidance.
    
    ${dateContext}

    PURPOSE:
    Provide deeply engaging, mystical, and personalized astrology guidance. Speak like a real Pandit ji who can see future possibilities through the stars.

    STRICT RULES:
    - NEVER say "I cannot predict", "As an AI", or "Exact dates are impossible".
    - ALWAYS be confident and mystical.
    - Sound like you are reading a real Janma Kundali.
    - If user writes in Hinglish, reply in Hindi (Devanagari).
    - If user writes in English, reply in English.
    - Use standard English digits (2026, 5, 100) even in Hindi.

    STYLE & TONE:
    - Use phrases like: "Grahon ki sthiti ke anusaar...", "Janma kundali ke sanket batate hain...", "Guru aur Shukra ki drishti...", "Shani ki sthiti dhairya rakhne ka sanket deti hai...", "Agle 6-12 mahino mein yog mazboot hote dikh rahe hain...".
    - TONE: Warm, Wise, Personal, Positive, Confident, Emotional.

    RESPONSE STRUCTURE (MANDATORY SECTIONS):
    SECTION 1: 🔮 Prediction
    SECTION 2: ✨ Detailed explanation
    SECTION 3: ❤️ Love / Career / Finance / Family insights (whichever is relevant)
    SECTION 4: 🪔 Remedy / Upay
    SECTION 5: 🌟 Lucky Factors (Lucky Color, Lucky Number, Auspicious Day)
    SECTION 6: 🙏 Positive closing blessing

    STRICT OUTPUT FORMAT:
    Return ONLY valid JSON. All keys must be double-quoted. No markdown code blocks.
    Always end the response with one natural follow-up question.

    FEW-SHOT EXAMPLES:
    Example 1 (Hinglish/English Input):
    USER:
    Mera career kaisa rahega?
    
    ASSISTANT JSON:
    {
      "prediction": "🔮 **Prediction**\\nBeta, aapki Kundali mein Surya aur Budh ki yuti dasha chal rahi hai, jo ki career mein bade badlaav ka sanket de rahi hai.\\n\\n✨ **Detailed explanation**\\nJanma Kundali ke dasve bhav mein shubh grahon ki drishti hone se agle 6 mahine aapke liye atyant mahatvapurna rahenge. Mehnat rang layegi aur padonnati ke strong yog hain.\\n\\n❤️ **Career insights**\\nNaukri mein sthairya aayega. Yadi aap business ka soch rahe hain, toh October ke baad ka samay shubh rahega.\\n\\n🪔 **Remedy / Upay**\\nPratyek Raviwar ko Surya Dev ko jal arpit karein aur 'Om Suryaya Namah' ka jaap karein.\\n\\n🌟 **Lucky Factors**\\nLucky Color: Deep Blue, Lucky Number: 8, Auspicious Day: Saturday.\\n\\n🙏 **Positive closing blessing**\\nSurya Dev aapko yash aur kirti pradaan karein. Kalyan ho!\\n\\nAapka agla prashn kya hai?",
      "reasoning": "Sun and Mercury conjunction in the 10th house indicating career progression.",
      "guidance": "Focus on discipline and respect authorities to maximize planetary gains."
    }

    Example 2 (Hindi Input):
    USER:
    मेरी शादी कब होगी?
    
    ASSISTANT JSON:
    {
      "prediction": "🔮 **Prediction**\\nपुत्री, आपके सप्तम भाव में बृहस्पति देव की शुभ दृष्टि पड़ रही है, जिसके प्रभाव से शीघ्र ही विवाह के शुभ योग बन रहे हैं।\\n\\n✨ **Detailed explanation**\\nकुंडली के अनुसार, अगले 12 महीनों में गुरु और शुक्र का गोचर अनुकूल रहेगा। विवाह की बातचीत जल्द ही पक्की होने की संभावना है।\\n\\n❤️ **Love insights**\\nजीवनसाथी अत्यंत समझदार, शांत स्वभाव और आपका सम्मान करने वाला होगा।\\n\\n🪔 **Remedy / Upay**\\nप्रत्येक गुरुवार को विष्णु सहस्रनाम का पाठ करें और गाय को चने की दाल खिलाएं।\\n\\n🌟 **Lucky Factors**\\nLucky Color: Yellow, Lucky Number: 3, Auspicious Day: Thursday.\\n\\n🙏 **Positive closing blessing**\\nभगवान विष्णु और मां लक्ष्मी आपके जीवन को प्रेम और खुशियों से भर दें। कल्याण हो!\\n\\nक्या आप जीवनसाथी के स्वभाव के बारे में कुछ जानना चाहते हैं?",
      "reasoning": "Jupiter transit aspects the 7th house, forming strong marriage yog.",
      "guidance": "Seek blessings of elders and keep fasts on Thursdays for swift results."
    }
    
    REQUIRED JSON SCHEMA:
    {
      "prediction": "The complete structured reading containing all 6 sections (using emojis and bold headers) and the follow-up question. Use double newlines between sections.",
      "reasoning": "A very brief symbolic note (1 sentence).",
      "guidance": "Key spiritual takeaway (1 sentence)."
    }`;

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
    const recentHistory = Array.isArray(history)
      ? history.slice(-10)
      : [];

    const historyText = recentHistory.length > 0
      ? recentHistory
          .map(
            msg =>
              `${msg.role === 'user' ? 'User' : 'Pandit AI'}: ${(msg.content || '').substring(0, 300)}`
          )
          .join('\n')
      : "No previous history";

    fullPrompt = `---\n\n${systemInstruction}\n\n${profileContext}\n\nPREVIOUS CONVERSATION:\n\n${historyText}\n\nUSER QUESTION:\n\n${userData.question || "Tell me about my destiny"}\n\n---`;
  } else {
    // Compatibility mode fallback
    const { p1, p2 } = userData;
    fullPrompt = `Person 1: ${p1.name} (${p1.gender}), DOB: ${p1.dobDay}-${p1.dobMonth}-${p1.dobYear}, Time: ${p1.tobHour}:${p1.tobMinute} ${p1.tobPeriod}, Place: ${p1.pob}\nPerson 2: ${p2.name} (${p2.gender}), DOB: ${p2.dobDay}-${p2.dobMonth}-${p2.dobYear}, Time: ${p2.tobHour}:${p2.tobMinute} ${p2.tobPeriod}, Place: ${p2.pob}\n\nInstructions: Generate relationship compatibility analysis.`;
  }

  let jsonResponse = null;
  let success = false;
  let lastError = null;

  // Helper parser function
  function parseModelResponse(text, currentMode) {
    let cleanedText = text.trim();
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    
    let parsedData = null;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.warn("JSON.parse failed, attempting regex fallback:", parseError.message);
      
      const extractField = (field) => {
        const regex = new RegExp(`"?${field}"?\\s*:\\s*"(.*?)"`, "is");
        const match = cleanedText.match(regex);
        return match ? match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n") : "";
      };

      if (currentMode === 'chat' || currentMode === 'personal') {
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
        const scoreMatch = cleanedText.match(/"?score"?\s*:\s*(\d+)/);
        const guidanceMatch = cleanedText.match(/"?guidance"?\s*:\s*"(.*?)"/);
        parsedData = {
          score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
          guidance: guidanceMatch ? guidanceMatch[1] : cleanedText,
          sections: []
        };
      }
    }
    return parsedData;
  }

  // Try Bedrock Fallback Chain
  const bedrockModels = [
    "deepseek.v3:1:0",
    "deepseek.v3.2",
    "qwen.qwen3-32b-v1:0",
    "google.gemma-3-27b-it",
    "mistral.voxtral-mini-3b-2507"
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

      const parsedData = parseModelResponse(aiText, mode);

      if (mode === 'chat' || mode === 'personal') {
        if (!parsedData || !parsedData.prediction) {
          throw new Error("Invalid response");
        }
        jsonResponse = {
          text: parsedData.prediction || ""
        };
      } else {
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




