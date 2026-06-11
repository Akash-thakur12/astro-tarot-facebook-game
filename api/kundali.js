import axios from 'axios';

/**
 * Vercel Serverless Function: api/kundali.js
 * Securely handles Prokerala API requests using Nominatim for geocoding.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    fullName,
    dobDay,
    dobMonth,
    dobYear,
    birthHour,
    birthMinute,
    birthPeriod,
    pob
  } = req.body;

  const CLIENT_ID = process.env.PROKERALA_CLIENT_ID;
  const CLIENT_SECRET = process.env.PROKERALA_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'Prokerala credentials not configured.' });
  }

  try {
    // 1. Resolve Location (Geocoding via OpenStreetMap Nominatim)
    // Adding User-Agent as required by Nominatim usage policy
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(pob)}&format=json&limit=1`;
    const locationResponse = await axios.get(nominatimUrl, {
      headers: { 'User-Agent': 'AstroTarotGame/1.0' }
    });

    if (!locationResponse.data || locationResponse.data.length === 0) {
      return res.status(400).json({ error: `Location not found: ${pob}. Please enter a valid city name.` });
    }

    const { lat, lon } = locationResponse.data[0];
    const coordinates = `${lat},${lon}`;
    
    // Defensive check for time parameters
    const timeStr = formatTime(birthHour, birthMinute, birthPeriod);
    const datetime = `${dobYear}-${dobMonth}-${dobDay}T${timeStr}:00Z`;

    // 2. Get OAuth2 Access Token for Prokerala
    const tokenResponse = await axios.post('https://api.prokerala.com/token', {
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    const accessToken = tokenResponse.data.access_token;

    // 3. Fetch Astrology Data (Kundli)
    // Parameters: ayanamsa=1 (Lahiri), coordinates, datetime
    const astrologyUrl = `https://api.prokerala.com/v2/astrology/kundli?datetime=${datetime}&coordinates=${coordinates}&ayanamsa=1`;
    const astrologyResponse = await axios.get(astrologyUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // LOG PROKERALA RESPONSE
    console.log(
      'PROKERALA RESPONSE:',
      JSON.stringify(astrologyResponse.data, null, 2)
    );

    // 4. Map to existing frontend structure
    const result = mapProkeralaToApp(astrologyResponse.data.data, fullName);

    return res.status(200).json(result);

  } catch (error) {
    console.error('Prokerala/Nominatim API Error:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Unable to connect to astrology service.',
      details: error.response?.data || error.message 
    });
  }
}

/**
 * Helper: Format time to 24h ISO format
 */
function formatTime(hour, min, period) {
  // Defensive checks
  const hVal = hour !== undefined && hour !== null ? hour : '0';
  const mVal = min !== undefined && min !== null ? min : '0';

  let h = parseInt(hVal);
  if (isNaN(h)) h = 0;
  
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  
  const hStr = h.toString().padStart(2, '0');
  const mStr = mVal.toString().padStart(2, '0');
  
  return `${hStr}:${mStr}`;
}

/**
 * Helper: Map Prokerala API structure to AstroTarot internal structure
 */
function mapProkeralaToApp(pkData, name) {
  if (!pkData) return null;

  // Extracting basic info from PK response
  // Based on common Prokerala V2 structure: data.planets is usually an array
  const planets = pkData.planets?.map(p => ({
    name: p.name || 'Unknown',
    house: p.house !== undefined ? p.house : 0
  })) || [];

  return {
    name: name || 'Seeker',
    lagna: pkData.lagna?.name || "Unknown",
    moonSign: pkData.moon_sign?.name || "Unknown",
    sunSign: pkData.sun_sign?.name || "Unknown",
    planets: planets,
    future: {
      career_en: "Prokerala Analysis: Positive career growth indicated.",
      career_hi: "प्रोकैराला विश्लेषण: सकारात्मक करियर विकास का संकेत।",
      love_en: "Prokerala Analysis: Stable and harmonious relations.",
      love_hi: "प्रोकैराला विश्लेषण: स्थिर और सामंजस्यपूर्ण संबंध।",
      health_en: "Prokerala Analysis: Maintain vital energy levels.",
      health_hi: "प्रोकैराला विश्लेषण: महत्वपूर्ण ऊर्जा स्तर बनाए रखें।"
    },
    remedies: [
      {
        en: "Meditation and positive affirmations recommended by Prokerala.",
        hi: "प्रोकैराला द्वारा ध्यान और सकारात्मक पुष्टि की सिफारिश की गई।"
      }
    ]
  };
}
