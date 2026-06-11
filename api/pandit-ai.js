import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Vercel Serverless Function: api/pandit-ai.js
 * Generates dynamic Astrology readings via Gemini SDK.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mode, currentTone, userData } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured.' });
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  
  const systemInstruction = `You are Pandit AI. You provide astrology-inspired guidance. You may use birth details as symbolic context. Never claim certainty. Never claim supernatural accuracy. Present insights as guidance, possibilities, tendencies and reflection. Support: Hindi, English, Hinglish, Mixed Hindi-English. Detect user language automatically and answer in same language.`;

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction
  });

  let prompt = '';

  if (mode === 'personal') {
    const { name, dobDay, dobMonth, dobYear, tobHour, tobMinute, tobPeriod, pob, question } = userData;
    prompt = `User: ${name}
DOB: ${dobDay}-${dobMonth}-${dobYear}
Time: ${tobHour}:${tobMinute} ${tobPeriod}
Place: ${pob}
Question: "${question}"
Preferred Tone: ${currentTone}

Instructions:
1. Generate personalized astrology-style guidance responding EXACTLY to the question asked. 
2. If they ask about marriage timing, focus on marriage timing tendencies. If they ask about 2028, discuss 2028.
3. Do NOT return generic sections unrelated to the user's question. Only create sections that are highly relevant to their exact query.
4. Return the response STRICTLY as a JSON object matching this schema:
{
  "type": "personal",
  "sections": [
    { "icon": "🔮", "title": "Dynamic Title Relevant to Question", "content": "Detailed text..." }
  ],
  "luckyColor": "Color name in user language",
  "luckyNumber": 7,
  "remedies": "Remedy description in user language"
}`;
  } else {
    const { p1, p2 } = userData;
    prompt = `Person 1: ${p1.name}, DOB: ${p1.dobDay}-${p1.dobMonth}-${p1.dobYear}, Time: ${p1.tobHour}:${p1.tobMinute} ${p1.tobPeriod}, Place: ${p1.pob}
Person 2: ${p2.name}, DOB: ${p2.dobDay}-${p2.dobMonth}-${p2.dobYear}, Time: ${p2.tobHour}:${p2.tobMinute} ${p2.tobPeriod}, Place: ${p2.pob}
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
  }

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    });

    const text = result.response.text();
    const jsonResponse = JSON.parse(text);

    return res.status(200).json(jsonResponse);

  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: 'Pandit AI is currently meditating. Please try again.' });
  }
}
