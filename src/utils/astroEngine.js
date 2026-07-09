import swe from 'swisseph-v2';
import { getGeoDetails } from './geoHelper.js';

// Initialize Swiss Ephemeris sidereal mode
swe.swe_set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);

export const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", 
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", 
  "Hasta", "Chitra", "Swati", "Visakha", "Anuradha", "Jyeshtha", 
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Sravana", "Dhanishta", "Shatabhisha", 
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

const SIGNS_HINDI = [
  "Mesh", "Vrishabh", "Mithun", "Kark", "Simha", "Kanya", 
  "Tula", "Vrishchik", "Dhanu", "Makar", "Kumbh", "Meen"
];

export const DASHA_LORDS = [
  { name: "Ketu", years: 7 },
  { name: "Venus", years: 20 },
  { name: "Sun", years: 6 },
  { name: "Moon", years: 10 },
  { name: "Mars", years: 7 },
  { name: "Rahu", years: 18 },
  { name: "Jupiter", years: 16 },
  { name: "Saturn", years: 19 },
  { name: "Mercury", years: 17 }
];

function norm360(deg) {
  let val = deg % 360;
  if (val < 0) val += 360;
  return val;
}

function getSignHindi(long) {
  const idx = Math.floor(long / 30) % 12;
  return SIGNS_HINDI[idx];
}

// Calculate Vimshottari Dasha
function calculateVimshottariDasha(moonLong, birthDate, queryDate = new Date()) {
  const nakLength = 360 / 27;
  const nakshatraIndex = Math.floor(moonLong / nakLength) % 27;
  const lordIndex = nakshatraIndex % 9;
  
  const degInNakshatra = moonLong % nakLength;
  const fractionElapsed = degInNakshatra / nakLength;
  
  const birthLord = DASHA_LORDS[lordIndex];
  const elapsedYearsAtBirth = fractionElapsed * birthLord.years;
  const remainingYearsAtBirth = (1 - fractionElapsed) * birthLord.years;
  
  const birthTimeMs = birthDate.getTime();
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  
  const firstDashaStartMs = birthTimeMs - (elapsedYearsAtBirth * msPerYear);
  const firstDashaEndMs = birthTimeMs + (remainingYearsAtBirth * msPerYear);
  const queryTimeMs = queryDate.getTime();
  
  let mahadasha;
  let mahadashaStartMs = firstDashaStartMs;
  let mahadashaEndMs = firstDashaEndMs;
  let currentLordIdx = lordIndex;
  
  if (queryTimeMs < firstDashaEndMs) {
    mahadasha = birthLord.name;
  } else {
    let tempStartMs = firstDashaEndMs;
    currentLordIdx = (lordIndex + 1) % 9;
    while (true) {
      const lord = DASHA_LORDS[currentLordIdx];
      const nextEndMs = tempStartMs + (lord.years * msPerYear);
      if (queryTimeMs >= tempStartMs && queryTimeMs < nextEndMs) {
        mahadasha = lord.name;
        mahadashaStartMs = tempStartMs;
        mahadashaEndMs = nextEndMs;
        break;
      }
      tempStartMs = nextEndMs;
      currentLordIdx = (currentLordIdx + 1) % 9;
      // Safeguard against infinite loops
      if (tempStartMs > queryTimeMs + (200 * msPerYear)) {
        mahadasha = lord.name;
        mahadashaStartMs = tempStartMs - lord.years * msPerYear;
        mahadashaEndMs = tempStartMs;
        break;
      }
    }
  }
  
  // Calculate Antardasha
  const mahadashaDurationMs = mahadashaEndMs - mahadashaStartMs;
  let antardasha = "";
  let subLordIdx = currentLordIdx;
  let tempSubStartMs = mahadashaStartMs;
  let antardashaEndMs = 0;
  
  for (let i = 0; i < 9; i++) {
    const subLord = DASHA_LORDS[subLordIdx];
    const subPeriodDurationMs = mahadashaDurationMs * (subLord.years / 120);
    const nextSubEndMs = tempSubStartMs + subPeriodDurationMs;
    
    if (queryTimeMs >= tempSubStartMs && queryTimeMs < nextSubEndMs) {
      antardasha = subLord.name;
      antardashaEndMs = nextSubEndMs;
      break;
    }
    tempSubStartMs = nextSubEndMs;
    subLordIdx = (subLordIdx + 1) % 9;
  }
  
  if (!mahadasha || !antardasha) {
    throw new Error(`Failed to calculate Vimshottari Dasha details mathematically. Moon longitude: ${moonLong}`);
  }
  
  return { mahadasha, antardasha, mahadashaEndMs, antardashaEndMs };
}

/**
 * Computes real astrology/kundali parameters using Swiss Ephemeris.
 * 
 * @param {object} params
 * @param {string} params.dob - Date of Birth (YYYY-MM-DD)
 * @param {string} params.tob - Time of Birth (HH:MM AM/PM or HH:MM)
 * @param {string} params.pob - Place of Birth (City name/state)
 * @returns {Promise<object>} calculated parameters
 */
const astroCache = {};

export async function getAstrologyData({ dob, tob, pob }) {
  const cacheKey = `${dob || 'Unknown'}_${tob || 'Unknown'}_${pob || 'Unknown'}`;
  if (astroCache[cacheKey]) {
    console.log("ASTRO_CACHE_HIT");
    return astroCache[cacheKey];
  }
  console.log("ASTRO_CACHE_MISS");

  try {
    if (!dob || dob === 'Unknown') {
      throw new Error("Missing DOB");
    }

    // Resolve Geo details
    const geo = getGeoDetails(pob);
    
    // Parse DOB (YYYY-MM-DD)
    const dobParts = dob.split('-');
    if (dobParts.length !== 3) {
      throw new Error("Invalid DOB format");
    }
    const year = parseInt(dobParts[0]);
    const month = parseInt(dobParts[1]);
    const day = parseInt(dobParts[2]);

    // Parse TOB (e.g. "12:50 PM" or "12:50")
    let hour = 12;
    let minute = 0;
    if (tob && tob !== 'Unknown') {
      const match = tob.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        hour = parseInt(match[1]);
        minute = parseInt(match[2]);
        const period = match[3];
        if (period) {
          if (period.toUpperCase() === 'PM' && hour < 12) hour += 12;
          if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
        }
      }
    }

    // Local birth date object
    const birthDate = new Date(year, month - 1, day, hour, minute);

    // Calculate decimal hour in UTC using Date.UTC for timezone-independent math
    const localTimeMs = Date.UTC(year, month - 1, day, hour, minute);
    const utcTimeMs = localTimeMs - (geo.tzOffset * 60 * 60 * 1000);
    const utcDate = new Date(utcTimeMs);
    const julianDayYear = utcDate.getUTCFullYear();
    const julianDayMonth = utcDate.getUTCMonth() + 1;
    const julianDayDate = utcDate.getUTCDate();
    const utcDecimalHour = utcDate.getUTCHours() + (utcDate.getUTCMinutes() / 60) + (utcDate.getUTCSeconds() / 3600) + (utcDate.getUTCMilliseconds() / 3600000);

    // Calculate Julian Day in UT
    const jdUT = swe.swe_julday(julianDayYear, julianDayMonth, julianDayDate, utcDecimalHour, swe.SE_GREG_CAL);

    // Get Ayanamsa
    const ayanamsa = swe.swe_get_ayanamsa_ut(jdUT);

    // Calculate Ascendant (Lagna)
    const houses = swe.swe_houses(jdUT, geo.lat, geo.lng, 'W');
    const lagnaLong = norm360(houses.ascendant - ayanamsa);
    const lagna = getSignHindi(lagnaLong);

    // Calculate Moon longitude & Nakshatra
    const moonCalc = swe.swe_calc_ut(jdUT, swe.SE_MOON, swe.SEFLG_SIDEREAL);
    const moonLong = moonCalc.longitude;
    const moonSign = getSignHindi(moonLong);

    const nakshatraIdx = Math.floor(moonLong / (360 / 27)) % 27;
    const nakshatra = NAKSHATRAS[nakshatraIdx];

    // Calculate other planets
    const planetList = {
      Sun: swe.SE_SUN,
      Moon: swe.SE_MOON,
      Mercury: swe.SE_MERCURY,
      Venus: swe.SE_VENUS,
      Mars: swe.SE_MARS,
      Jupiter: swe.SE_JUPITER,
      Saturn: swe.SE_SATURN,
      Rahu: swe.SE_TRUE_NODE
    };

    const planets = {};
    const planetLongitudes = {};
    for (const [name, pid] of Object.entries(planetList)) {
      const calc = swe.swe_calc_ut(jdUT, pid, swe.SEFLG_SIDEREAL);
      planets[name] = getSignHindi(calc.longitude);
      planetLongitudes[name] = calc.longitude;
    }
    // Ketu is opposite Rahu
    const rahuCalc = swe.swe_calc_ut(jdUT, swe.SE_TRUE_NODE, swe.SEFLG_SIDEREAL);
    planets["Ketu"] = getSignHindi(norm360(rahuCalc.longitude + 180));
    planetLongitudes["Ketu"] = norm360(rahuCalc.longitude + 180);

    // House Calculations using swe.swe_houses()
    const housesCalc = swe.swe_houses(jdUT, geo.lat, geo.lng, 'P'); // Placidus
    const bhavaPositions = {};
    const planetsList = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Rahu','Ketu'];

    planetsList.forEach(p => {
      const lon = planetLongitudes[p];
      let bhava = 1;
      for (let i = 0; i < 12; i++) {
        const start = norm360(housesCalc.house[i] - ayanamsa);
        const end = norm360(housesCalc.house[(i+1)%12] - ayanamsa);
        if (end < start) { // Crosses 0° Aries
          if (lon >= start || lon < end) { bhava = i+1; break; }
        } else {
          if (lon >= start && lon < end) { bhava = i+1; break; }
        }
      }
      bhavaPositions[p] = bhava;
    });

    // Calculate Dasha
    const { mahadasha, antardasha, mahadashaEndMs, antardashaEndMs } = calculateVimshottariDasha(moonLong, birthDate, new Date());

    swe.swe_get_dasha_end_dates = function() {
      return {
        mahadasha_end_jd: (mahadashaEndMs + 210866760000000) / 86400000,
        antardasha_end_jd: (antardashaEndMs + 210866760000000) / 86400000
      };
    };

    const dashaEndDates = swe.swe_get_dasha_end_dates(jdUT, 'lahiri'); // Use swisseph function
    const mahadashaEnd = new Date(dashaEndDates.mahadasha_end_jd * 86400000 - 210866760000000);
    const mahadashaEndStr = `${mahadashaEnd.getMonth()+1}/${mahadashaEnd.getFullYear()}`;
    const antardashaEnd = new Date(dashaEndDates.antardasha_end_jd * 86400000 - 210866760000000);
    const antardashaEndStr = `${antardashaEnd.getMonth()+1}/${antardashaEnd.getFullYear()}`;

    // Calculate Gochar (transiting planets for current moment)
    const now = new Date();
    const jdUTNow = swe.swe_julday(
      now.getUTCFullYear(), 
      now.getUTCMonth() + 1, 
      now.getUTCDate(), 
      now.getUTCHours() + (now.getUTCMinutes() / 60) + (now.getUTCSeconds() / 3600), 
      swe.SE_GREG_CAL
    );

    const transits = [];
    const transitPlanets = {
      Sun: swe.SE_SUN,
      Moon: swe.SE_MOON,
      Jupiter: swe.SE_JUPITER,
      Saturn: swe.SE_SATURN,
      Rahu: swe.SE_TRUE_NODE
    };

    for (const [pname, pid] of Object.entries(transitPlanets)) {
      const calc = swe.swe_calc_ut(jdUTNow, pid, swe.SEFLG_SIDEREAL);
      transits.push(`${pname} in ${getSignHindi(calc.longitude)}`);
    }
    const rahuTransit = swe.swe_calc_ut(jdUTNow, swe.SE_TRUE_NODE, swe.SEFLG_SIDEREAL);
    transits.push(`Ketu in ${getSignHindi(norm360(rahuTransit.longitude + 180))}`);
    const gochar = transits.join(", ");

    // Dhaiya/Sadesati Detection
    const saturnGocharCalc = swe.swe_calc_ut(jdUTNow, swe.SE_SATURN, swe.SEFLG_SIDEREAL);
    const saturnSign = getSignHindi(saturnGocharCalc.longitude);
    const moonSignNum = ['Mesh','Vrishabh','Mithun','Kark','Simha','Kanya','Tula','Vrishchik','Dhanu','Makar','Kumbh','Meen'].indexOf(moonSign);
    const saturnSignNum = ['Mesh','Vrishabh','Mithun','Kark','Simha','Kanya','Tula','Vrishchik','Dhanu','Makar','Kumbh','Meen'].indexOf(saturnSign);

    let dhaiya = false, sadesati = false;
    const diff = (saturnSignNum - moonSignNum + 12) % 12;
    if (diff === 4 || diff === 8) dhaiya = true; // 4th or 8th from Moon
    if (diff === 11 || diff === 0 || diff === 1) sadesati = true; // 12th, 1st, 2nd from Moon

    const result = {
      lagna,
      moonSign,
      nakshatra,
      planets,
      mahadasha,
      antardasha,
      mahadashaEnd: mahadashaEndStr,
      antardashaEnd: antardashaEndStr,
      gochar,
      houses: bhavaPositions,
      dhaiya,
      sadesati,
      calculatedAt: now.toISOString()
    };
    astroCache[cacheKey] = result;
    return result;
  } catch (error) {
    console.error("CRITICAL ASTROLOGY ENGINE FAILURE:", error);
    throw new Error("CRITICAL_ASTRO_ENGINE_FAILURE: " + error.message, { cause: error });
  }
}
