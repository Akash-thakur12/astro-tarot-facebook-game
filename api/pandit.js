import axios from 'axios';

/**
 * Vercel Serverless Function: api/pandit.js
 * Generates dynamic Astrology readings via Gemini API.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mode, currentTone, personalForm, compForm } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured.' });
  }

  let prompt = '';

  if (mode === 'personal') {
    const { name, dobDay, dobMonth, dobYear, tobHour, tobMinute, tobPeriod, pob, question } = personalForm;
    prompt = `You are Pandit AI, an expert Vedic Astrologer.
A user named ${name} born on ${dobDay}-${dobMonth}-${dobYear} at ${tobHour}:${tobMinute} ${tobPeriod} in ${pob} has asked: "${question}".
The user prefers to read in ${currentTone} language/tone.

Instructions:
1. Prioritize the user's question as the primary context. If they ask about marriage, focus on marriage timing, opportunities, relationship outlook. If they ask about career, focus on career.
2. Generate sections dynamically based ONLY on what is relevant to the question. Do NOT blindly include Career, Love, Finance, or Health if the user only asked about Marriage. Create relevant section titles dynamically based on the query.
3. Provide deep, astrological reasoning and spiritual guidance.
4. Return the response STRICTLY as a JSON object matching this exact schema:
{
  "type": "personal",
  "sections": [
    { "icon": "🔮", "title": "Section Title (e.g., Marriage Timing)", "content": "Detailed text..." }
  ],
  "luckyColor": "Color name in requested language",
  "luckyNumber": 7,
  "remedies": "Remedy description in requested language"
}
Do NOT wrap the JSON in markdown blocks like \`\`\`json. Return ONLY valid, raw JSON.`;
  } else {
    const { p1, p2 } = compForm;
    prompt = `You are Pandit AI, an expert Vedic Astrologer.
Person 1: ${p1.name}, DOB: ${p1.dobDay}-${p1.dobMonth}-${p1.dobYear}, Time: ${p1.tobHour}:${p1.tobMinute} ${p1.tobPeriod}, Place: ${p1.pob}
Person 2: ${p2.name}, DOB: ${p2.dobDay}-${p2.dobMonth}-${p2.dobYear}, Time: ${p2.tobHour}:${p2.tobMinute} ${p2.tobPeriod}, Place: ${p2.pob}
Language/Tone: ${currentTone}

Instructions:
1. Perform a deep relationship compatibility analysis (Guna Milan, Emotional, Communication).
2. Generate sections dynamically based on the compatibility findings.
3. Return the response STRICTLY as a JSON object matching this schema:
{
  "type": "compatibility",
  "score": 85,
  "guna": 28,
  "sections": [
    { "icon": "🧠", "title": "Communication", "content": "..." },
    { "icon": "❤️", "title": "Emotional Connection", "content": "..." }
  ],
  "guidance": "Overall advice for the couple."
}
Do NOT wrap the JSON in markdown blocks like \`\`\`json. Return ONLY valid, raw JSON.`;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    };

    const response = await axios.post(url, payload);
    let text = response.data.candidates[0].content.parts[0].text;
    
    // Safety cleanup just in case markdown block format leaks through
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const jsonResponse = JSON.parse(text);

    return res.status(200).json(jsonResponse);

  } catch (error) {
    console.error('Gemini API Error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'AI generation failed' });
  }
}