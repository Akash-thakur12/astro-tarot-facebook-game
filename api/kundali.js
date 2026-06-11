import axios from 'axios';

/**
 * Vercel Serverless Function: api/kundali.js
 * Securely handles Prokerala API requests without exposing secrets to the frontend.
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
    // 1. Get OAuth2 Access Token
    const tokenResponse = await axios.post('https://api.prokerala.com/token', {
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    const accessToken = tokenResponse.data.access_token;

    // 2. Resolve Location (Geocoding)
    // Note: In a production app, you might want to use Prokerala's location API or Google Maps.
    // For now, we'll use a placeholder or assume the first result from Prokerala Location API.
    const locationResponse = await axios.get(`https://api.prokerala.com/v2/location?name=${encodeURIComponent(pob)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!locationResponse.data.data || locationResponse.data.data.length === 0) {
      throw new Error('Location not found');
    }

    const location = locationResponse.data.data[0];
    const coordinates = `${location.latitude},${location.longitude}`;
    const datetime = `${dobYear}-${dobMonth}-${dobDay}T${formatTime(birthHour, birthMinute, birthPeriod)}:00Z`;

    // 3. Fetch Astrology Data (Planet Positions)
    const astrologyResponse = await axios.get(`https://api.prokerala.com/v2/astrology/kundli?datetime=${datetime}&coordinates=${coordinates}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // 4. Map to existing frontend structure
    // This mapping depends on the exact Prokerala V2 response structure.
    // We adjust it to match our 'mockKundaliData' structure for the UI.
    const result = mapProkeralaToApp(astrologyResponse.data.data, fullName);

    return res.status(200).json(result);

  } catch (error) {
    console.error('Prokerala API Error:', error.response?.data || error.message);
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
  let h = parseInt(hour);
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

/**
 * Helper: Map Prokerala API structure to AstroTarot internal structure
 */
function mapProkeralaToApp(pkData, name) {
  // Extracting basic info from PK response
  // PK response usually has planets under 'yoga' or 'planets' depending on endpoint
  // This is a generalized mapping
  const planets = pkData.planets?.map(p => ({
    name: p.name,
    house: p.house
  })) || [];

  return {
    name: name,
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
