import { generateAIResponse } from '../services/aiService.js';
import {
  generateTopicState,
  updateTopicProgress,
  getTopicProgress,
  getCliffhangerContext,
  TOPIC_MAPPING,
  getTopicAndSubType,
  detectMultiIntent,
  detectSemanticIntent,
  detectMultiSemanticIntent,
  extractGreeting,
  detectGreetingIntent,
  isNonAstrologyQuestion,
  isFollowUpMessage,
  isProfileAcknowledgementMessage,
  isMemoryRecallMessage,
  detectDirectRecallKey,
  isGreetingMessage,
  isVagueMessage,
  SEMANTIC_CATEGORIES
} from '../lib/topicEngine.js';

export {
  getTopicAndSubType,
  detectMultiIntent,
  detectSemanticIntent,
  detectMultiSemanticIntent,
  extractGreeting,
  detectGreetingIntent,
  isNonAstrologyQuestion,
  isFollowUpMessage,
  isProfileAcknowledgementMessage,
  isMemoryRecallMessage,
  detectDirectRecallKey,
  isGreetingMessage,
  isVagueMessage,
  SEMANTIC_CATEGORIES
};
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getProgress, updateProgress, getDailySecret } from '../src/utils/progressEngine.js';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

import { detectIntent } from '../src/utils/intentDetector.js';
import { normalizeFacts } from '../src/utils/memoryEngine.js';
import { updateEvidenceMemory } from '../src/utils/evidenceMemoryEngine.js';
import { humanize } from '../src/utils/humanizer.js';
import { resolveIntentContradiction } from '../src/utils/contradictionEngine.js';
import { getAstrologyData } from '../src/utils/astroEngine.js';
import { executeAIWithRetries } from '../lib/aiExecution.js';
import { extractSemanticFacts, mergeSemanticFacts, getFact, setFact, migrateFactMemory, sanitizeFactMemory } from '../src/utils/semanticMemory.js';
import {
  calculateLoveEngine,
  calculateMoneyEngine,
  calculateDailyTransitEngine,
  calculateHealthEngine,
  calculateForeignTravelEngine,
  calculateChildrenEngine,
  getDreamMeaning,
  getSpiritualGuidance
} from '../src/utils/specialtyEngines.js';

const NON_ASTROLOGY_PATTERNS = [
  // Coding & Tech
  /\b(code|coding|python|javascript|js|html|css|react|node|mongodb|sql|database|programming|algorithm|quicksort|merge sort|bubble sort|binary search|git|github|compile|compiler|runtime|bug|debug|api|endpoint|server|hosting|website|app development|developer|software|hardware|java|c\+\+|rust|golang|swift|kotlin|variables|loop|array|function|class|object|json|yaml|xml)\b/i,
  // Resume & CV
  /\b(resume|cv|bio-data|biodata|cover letter|interview tips|resume template|resume tips|how to write a resume|portfolio)\b/i,
  // Business/Startups (non-predictive)
  /\b(marketing strategy|business model|startup pitch|pitch deck|how to start a company|venture capital|angel investor|seo optimization|conversion rate|b2b marketing|b2c marketing|swot analysis)\b/i,
  // General Knowledge & School subjects
  /\b(photosynthesis|periodic table|gravity|relativity|quantum|mitosis|meiosis|dna|rna|cellular|algebra|calculus|geometry|trigonometry|matrix|vector|equation|solve the equation|math problem|physics|chemistry|biology|geography|history|economics|civics|political science)\b/i,
  // Common factual queries
  /\b(capital of|largest city|longest river|highest mountain|population of|distance between|how far is|who invented|who discovered|who wrote|author of|director of|cast of|release date of|how many bones|speed of light|speed of sound|formula of|definition of)\b/i,
  // Daily life (non-astrology)
  /\b(recipe|how to cook|how to make|ingredients for|workout plan|exercise for|calories in|weather in|weather today|news today|current events|how to repair|how to fix)\b/i,
  // Hinglish tech / general queries
  /\b(recipe|cooking|coding kaise|resume kaise|website kaise|app kaise)\b/i
];

const NON_ASTROLOGY_PATTERNS_DEV = [
  /कोड/g, /प्रोग्रामिंग/g, /सॉफ्टवेयर/g, /कंप्यूटर/g, /वेबसाइट/g, /रेसिपी/g, /बनाने की विधि/g,
  /इतिहास/g, /भूगोल/g, /विज्ञान/g, /गणित/g, /समीकरण/g, /रेज़्युमे/g, /इंटरव्यू/g, /स्टार्टअप/g
];

export function calculateTier1Data(topic, astroData) {
  if (!astroData) return null;
  const planets = astroData.planets || {};
  const houses = astroData.houses || {};
  
  const SIGN_LORDS = {
    Mesh: 'Mars', Vrishabh: 'Venus', Mithun: 'Mercury', Kark: 'Moon', Simha: 'Sun', Kanya: 'Mercury',
    Tula: 'Venus', Vrishchik: 'Mars', Dhanu: 'Jupiter', Makar: 'Saturn', Kumbh: 'Saturn', Meen: 'Jupiter'
  };

  const housePrefix = (planet) => {
    const key = Object.keys(houses).find(k => k.toLowerCase() === planet.toLowerCase());
    return key ? houses[key] : null;
  };

  if (topic === 'career') {
    let h10_score = 10;
    const benefics = ["moon", "mercury", "venus", "jupiter"];
    for (const p of benefics) {
      if (housePrefix(p) === 10) h10_score += 5;
    }
    if (housePrefix("rahu") === 10 || housePrefix("ketu") === 10) {
      h10_score -= 10;
    }
    h10_score = Math.max(0, Math.min(20, h10_score));

    const lagna = astroData.lagna || 'Mesh';
    const SIGNS = ['Mesh', 'Vrishabh', 'Mithun', 'Kark', 'Simha', 'Kanya', 'Tula', 'Vrishchik', 'Dhanu', 'Makar', 'Kumbh', 'Meen'];
    const lagnaIdx = SIGNS.indexOf(lagna);
    const house10Sign = lagnaIdx !== -1 ? SIGNS[(lagnaIdx + 9) % 12] : 'Mesh';
    const lord_10 = SIGN_LORDS[house10Sign] || 'Mars';
    const lord_10_house = housePrefix(lord_10) || 1;

    let lord10_score = 12;
    if ([1, 4, 7, 10, 5, 9].includes(lord_10_house)) {
      lord10_score += 8;
    } else if ([6, 8, 12].includes(lord_10_house)) {
      lord10_score -= 8;
    }
    lord10_score = Math.max(0, Math.min(20, lord10_score));

    const saturn_house = housePrefix("saturn") || 1;
    let saturn_score = 10;
    if ([1, 4, 7, 10, 5, 9].includes(saturn_house)) {
      saturn_score += 5;
    } else if ([6, 8, 12].includes(saturn_house)) {
      saturn_score -= 5;
    }
    saturn_score = Math.max(0, Math.min(15, saturn_score));

    const jup_house = housePrefix("jupiter") || 1;
    let jupiter_score = 8;
    if ([10, 6, 2, 4].includes(jup_house)) {
      jupiter_score += 7;
    } else if ([1, 4, 7, 10, 5, 9].includes(jup_house)) {
      jupiter_score += 3;
    }
    jupiter_score = Math.max(0, Math.min(15, jupiter_score));

    const total_score = h10_score + lord10_score + saturn_score + jupiter_score + 10;

    let dateWindow = "2026-11";
    if (astroData.antardashaEnd) {
      const parts = astroData.antardashaEnd.split('/');
      if (parts.length === 2) {
        const mm = parts[0].padStart(2, '0');
        const yyyy = parts[1];
        dateWindow = `${yyyy}-${mm}`;
      }
    }

    return {
      score: total_score,
      date: dateWindow
    };
  } else if (topic === 'marriage') {
    let h7_score = 15;
    const benefics = ["moon", "mercury", "venus", "jupiter"];
    const malefics = ["sun", "saturn", "rahu", "ketu", "mars"];
    for (const p of benefics) {
      if (housePrefix(p) === 7) h7_score += 5;
    }
    for (const p of malefics) {
      if (housePrefix(p) === 7) h7_score -= 5;
    }
    h7_score = Math.max(0, Math.min(20, h7_score));

    const lagna = astroData.lagna || 'Mesh';
    const SIGNS = ['Mesh', 'Vrishabh', 'Mithun', 'Kark', 'Simha', 'Kanya', 'Tula', 'Vrishchik', 'Dhanu', 'Makar', 'Kumbh', 'Meen'];
    const lagnaIdx = SIGNS.indexOf(lagna);
    const house7Sign = lagnaIdx !== -1 ? SIGNS[(lagnaIdx + 6) % 12] : 'Mesh';
    const lord_7 = SIGN_LORDS[house7Sign] || 'Mars';
    const lord_7_house = housePrefix(lord_7) || 1;

    let lord7_score = 12;
    if ([1, 4, 7, 10, 5, 9].includes(lord_7_house)) {
      lord7_score += 4;
    } else if ([6, 8, 12].includes(lord_7_house)) {
      lord7_score -= 4;
    }
    lord7_score = Math.max(0, Math.min(20, lord7_score));

    const venus_house = housePrefix("venus") || 1;
    let venus_score = 12;
    if ([1, 4, 7, 10, 5, 9].includes(venus_house)) {
      venus_score += 4;
    } else if ([6, 8, 12].includes(venus_house)) {
      venus_score -= 4;
    }
    venus_score = Math.max(0, Math.min(20, venus_score));

    const jup_house = housePrefix("jupiter") || 1;
    let jup_score = 9;
    if ([1, 4, 7, 10, 5, 9].includes(jup_house)) {
      jup_score += 3;
    } else if ([6, 8, 12].includes(jup_house)) {
      jup_score -= 3;
    }
    jup_score = Math.max(0, Math.min(15, jup_score));

    const total_score = h7_score + lord7_score + venus_score + jup_score + 15;

    let dateWindow = "2026-11";
    if (astroData.antardashaEnd) {
      const parts = astroData.antardashaEnd.split('/');
      if (parts.length === 2) {
        const mm = parts[0].padStart(2, '0');
        const yyyy = parts[1];
        dateWindow = `${yyyy}-${mm}`;
      }
    }

    return {
      score: total_score,
      date: dateWindow
    };
  }
  return null;
}

export function convertScore(score) {
  if (score >= 90) return "Bahut mazboot yog";
  if (score >= 75) return "Kaafi achhe yog";
  if (score >= 60) return "Madhyam se achhe yog";
  return "Mehnat aur sanyam ki avashyakta";
}

export function convertDateWindow(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const match = dateStr.match(/^(\d{4})-(\d{2})$/);
  if (!match) return dateStr;
  const year = match[1];
  const month = parseInt(match[2]);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${monthNames[month - 1]} ${year} ke beech`;
}


const DECEASED_PATTERNS = [
  /wife.*death/i,
  /wife.*expire/i,
  /wife.*mar/i,
  /patni.*mar/i,
  /patni.*death/i,
  /patni.*nahi rahi/i,
  /swargwas/i,
  /widow/i,
  /widower/i
];

async function getFactMemory(uid) {
  try {
    const snap = await db
      .collection('users')
      .doc(uid)
      .collection('factMemory')
      .doc('facts')
      .get();
    if (!snap.exists) return migrateFactMemory(null);
    return migrateFactMemory(snap.data());
  } catch (err) {
    console.error('FACT_MEMORY_READ_FAILED', err);
    return migrateFactMemory(null);
  }
}

async function updateFactMemory(uid, question, facts = {}) {
  try {
    if (!uid) return;

    // Ensure nested schema is migrated
    const migrated = migrateFactMemory(facts);

    const isDeceased = DECEASED_PATTERNS.some(pattern => pattern.test(question));
    if (isDeceased) {
      setFact(migrated, 'relationship.wifeAlive', false);
      setFact(migrated, 'relationship.spouseStatus', 'deceased');
    }

    const finalData = migrateFactMemory(migrated);
    const sanitizedData = sanitizeFactMemory(finalData);

    await db
      .collection('users')
      .doc(uid)
      .collection('factMemory')
      .doc('facts')
      .set(sanitizedData, { merge: true });

    console.log("FACT_WRITE_SUCCESS");
  } catch (err) {
    console.error('FACT_MEMORY_WRITE_FAILED', err);
  }
}

function extractFactsFromMessage(question, existingFacts = {}) {
  const q = (question || '').toLowerCase();
  const migrated = migrateFactMemory(existingFacts);

  const targetExam = getFact(migrated, 'career.targetExam');
  const previousTargetExam = getFact(migrated, 'career.previousTargetExam');
  if (targetExam && !previousTargetExam) {
    setFact(migrated, 'career.previousTargetExam', targetExam);
  }

  // WIFE ALIVE / SPOUSE STATUS
  const isDeceased = DECEASED_PATTERNS.some(pattern => pattern.test(q));
  if (isDeceased) {
    setFact(migrated, 'relationship.wifeAlive', false);
    setFact(migrated, 'relationship.spouseStatus', 'deceased');
  } else if (
    q.includes('wife hai') ||
    q.includes('meri patni') ||
    q.includes('meri wife')
  ) {
    setFact(migrated, 'relationship.wifeAlive', true);
  }

  // CHILDREN COUNT
  if (
    q.includes('meri ek beti hai') ||
    q.includes('meri 1 beti hai') ||
    q.includes('mera ek beta hai') ||
    q.includes('mera 1 beta hai') ||
    q.includes('ek beta hai') ||
    q.includes('ek beti hai')
  ) {
    setFact(migrated, 'family.childrenCount', 1);
  } else if (
    q.includes('do bachche hain') ||
    q.includes('do bachhe hain') ||
    q.includes('2 bachche hain') ||
    q.includes('2 bachhe hain')
  ) {
    setFact(migrated, 'family.childrenCount', 2);
  }

  // BREAKUP & GIRLFRIEND STATUS
  if (
    q.includes('breakup ho gaya') ||
    q.includes('girlfriend chhod gayi') ||
    q.includes('relationship toot gaya') ||
    q.includes('relationship tut gaya')
  ) {
    setFact(migrated, 'relationship.girlfriendStatus', 'breakup');
    setFact(migrated, 'relationship.relationshipStatus', 'breakup');
  } else if (
    q.includes('girlfriend') ||
    q.includes('gf')
  ) {
    const gfStatus = getFact(migrated, 'relationship.girlfriendStatus');
    if (gfStatus !== 'breakup') {
      setFact(migrated, 'relationship.girlfriendStatus', 'active');
    }
  }

  // EXAMS
  if (q.includes('ssc')) {
    setFact(migrated, 'career.targetExam', 'SSC');
  }
  if (q.includes('upsc')) {
    setFact(migrated, 'career.targetExam', 'UPSC');
  }
  if (q.includes('banking')) {
    setFact(migrated, 'career.targetExam', 'Banking');
  }

  // DREAM JOB
  if (q.includes('ias')) {
    setFact(migrated, 'career.dreamJob', 'IAS');
  }

  // FINANCIAL
  if (
    q.includes('loan hai') ||
    q.includes('karza hai') ||
    q.includes('debt me hu') ||
    q.includes('karz') ||
    q.includes('loan')
  ) {
    setFact(migrated, 'finance.status', 'debt');
  } else if (!getFact(migrated, 'finance.status')) {
    setFact(migrated, 'finance.status', 'normal');
  }

  // HEALTH
  if (
    q.includes('diabetes') ||
    q.includes('bp') ||
    q.includes('thyroid')
  ) {
    setFact(migrated, 'health.issues', ['diabetes']);
  }

  return migrated;
}

function detectSmartContradiction(
  question,
  factMemory,
  userData = {},
  history = []
) {
  const q = (question || '').toLowerCase();
  const wifeAlive = getFact(factMemory, 'relationship.wifeAlive');
  const spouseStatus = getFact(factMemory, 'relationship.spouseStatus');
  const maritalStatus = getFact(factMemory, 'relationship.relationshipStatus') || userData?.birthDetails?.maritalStatus || userData?.maritalStatus;

  // Rule 1: wifeAlive=false + wife communication question
  if (
    (wifeAlive === false || spouseStatus === 'deceased') &&
    (
      q.includes('wife kab baat karegi') ||
      q.includes('meri wife mujhse baat') ||
      (q.includes('wife') && q.includes('baat')) ||
      (q.includes('patni') && q.includes('baat'))
    )
  ) {
    return {
      type: 'deceased_spouse_clarification',
      text: `🔮 Prediction:

Aapne pehle bataya tha ki patni ab is duniya me nahi hain.

📿 Reasoning:

Isliye samanya dampatya sambandhit prashn spasht nahi hai.

🪔 Guidance:

Kya aap purani yaadon, punarvivah ya kisi anya sambandh ke baare me pooch rahe hain?`
    };
  }

  // Married + shaadi/shadi/vivaah/vivah/marriage + kab/kb/when
  const hasMarriageKeyword = q.includes('shaadi') || q.includes('shadi') || q.includes('vivaah') || q.includes('vivah') || q.includes('marriage');
  const hasTimingKeyword = q.includes('kab') || q.includes('kb') || q.includes('when');
  if (
    (maritalStatus === 'Married') &&
    hasMarriageKeyword &&
    hasTimingKeyword
  ) {
    return {
      type: 'second_marriage',
      text: `🔮 Prediction:

Aap pehle se vivahit hain.

📿 Reasoning:

Profile ke anusaar pehla vivaah ho chuka hai.

🪔 Guidance:

Kya aap punarvivah ya vaivahik jeevan ke baare me pooch rahe hain?`
    };
  }

  // Age >32 govt job + UPSC
  const age = getFact(factMemory, 'career.age') || userData?.birthDetails?.age || userData?.age;
  const parsedAge = parseInt(age);
  const occupation = getFact(factMemory, 'career.occupation') || userData?.birthDetails?.occupation || userData?.occupation;
  if (
    occupation === 'Government Job' &&
    !isNaN(parsedAge) &&
    parsedAge > 32 &&
    q.includes('upsc')
  ) {
    return {
      type: 'career_redirect',
      text: `🔮 Prediction:

Rajya seva, SSC aur anya departmental avsar adhik upyogi dikhte hain.

📿 Reasoning:

Vartaman avastha me anubhav aur sthirta sambandhit yog adhik majboot hain.

🪔 Guidance:

State PSC, SSC aur anya government service opportunities par dhyan dena adhik labhdayak ho sakta hai.`
    };
  }

  // Rule 2: childrenCount >= 1 and question contains "bachcha kab hoga"
  const childrenCount = getFact(factMemory, 'family.childrenCount');
  if (
    childrenCount !== null && childrenCount !== undefined && childrenCount >= 1 &&
    (q.includes('bachcha kab hoga') || q.includes('bachha kab hoga'))
  ) {
    return {
      type: 'second_child_clarification',
      text: `🔮 Prediction:

Pehle se santan sambandhit jankari uplabdh hai.

📿 Reasoning:

Memory ke anusaar pehle ek santan ka ullekh ho chuka hai.

🪔 Guidance:

Kya aap doosri santan ke baare me pooch rahe hain?`
    };
  }

  // Rule 3: recentBreakup = true/girlfriendStatus = 'breakup' and girlfriend query
  const girlfriendStatus = getFact(factMemory, 'relationship.girlfriendStatus');
  const relationshipStatus = getFact(factMemory, 'relationship.relationshipStatus');
  const recentBreakup = girlfriendStatus === 'breakup' || relationshipStatus === 'breakup';
  if (
    (recentBreakup || girlfriendStatus === 'breakup' || relationshipStatus === 'breakup') &&
    (q.includes('girlfriend') || q.includes('gf'))
  ) {
    return {
      type: 'relationship_breakup',
      text: `🔮 Prediction:

Pehle rishte me breakup ka ullekh kiya gaya hai.

📿 Reasoning:

Vartaman prashn girlfriend se sambandhit hai jabki pichli jankari breakup ki hai.

🪔 Guidance:

Kya aap patch-up ke baare me pooch rahe hain ya naye sambandh ke baare me?`
    };
  }

  // Rule 5: targetExam = 'SSC' and question contains UPSC
  const targetExam = getFact(factMemory, 'career.targetExam');
  const previousTargetExam = getFact(factMemory, 'career.previousTargetExam');
  if (
    (targetExam === 'SSC' || previousTargetExam === 'SSC') &&
    q.includes('upsc')
  ) {
    return {
      type: 'exam_contradiction',
      text: `🔮 Prediction:

Pehle SSC taiyari ka ullekh kiya gaya tha.

📿 Reasoning:

Memory aur vartaman prashn alag exam dikhate hain.

🪔 Guidance:

Kya focus ab bhi SSC par hai ya UPSC ki taraf badal gaya hai?`
    };
  }

  return null;
}



function buildAstrologyBlock(astroData, questionTopic = '', questionText = '') {
  if (!astroData) {
    return `PROVIDED ASTROLOGY DATA\nDATA UNAVAILABLE`;
  }

  const lowerQuery = (questionText || '').toLowerCase();
  const qTopic = questionTopic || '';

  const isRelationship = ['love', 'compatibility', 'relationship_return', 'partner_loyal'].includes(qTopic) ||
                         /girlfriend|boyfriend|gf|bf|partner|relation|love|pyar|pyaar|cheat|affair|loyalty/i.test(lowerQuery);
  const isMarriage = ['marriage'].includes(qTopic) ||
                     /shadi|shaadi|marriage|vivaah|vivah|spouse|husband|wife/i.test(lowerQuery);
  const isCareer = ['career', 'job', 'wealth', 'money', 'business'].includes(qTopic) ||
                   /job|career|business|money|paisa|wealth|finance|salary|developing|developer|app/i.test(lowerQuery);
  const isHealth = ['health'].includes(qTopic) ||
                   /health|bimari|swasthya|illness|disease/i.test(lowerQuery);
  const isTravel = ['travel', 'foreign_travel'].includes(qTopic) ||
                   /travel|foreign|videsh|yatra/i.test(lowerQuery);

  let filteredHouses = {};
  let filteredPlanets = {};

  if (isMarriage) {
    // 7th house, Venus, Jupiter
    if (astroData.houses?.Venus) filteredHouses.Venus = astroData.houses.Venus;
    if (astroData.houses?.Jupiter) filteredHouses.Jupiter = astroData.houses.Jupiter;
    if (astroData.houses) {
      Object.entries(astroData.houses).forEach(([p, h]) => {
        if (h === 7 || h === 8 || h === 2) filteredHouses[p] = h;
      });
    }
    if (astroData.planets?.Venus) filteredPlanets.Venus = astroData.planets.Venus;
    if (astroData.planets?.Jupiter) filteredPlanets.Jupiter = astroData.planets.Jupiter;
  } else if (isRelationship) {
    // Venus, Moon
    if (astroData.houses?.Venus) filteredHouses.Venus = astroData.houses.Venus;
    if (astroData.houses?.Moon) filteredHouses.Moon = astroData.houses.Moon;
    if (astroData.planets?.Venus) filteredPlanets.Venus = astroData.planets.Venus;
    if (astroData.planets?.Moon) filteredPlanets.Moon = astroData.planets.Moon;
  } else if (isCareer) {
    // 10th house, Mercury, Saturn
    if (astroData.houses?.Mercury) filteredHouses.Mercury = astroData.houses.Mercury;
    if (astroData.houses?.Saturn) filteredHouses.Saturn = astroData.houses.Saturn;
    if (astroData.houses) {
      Object.entries(astroData.houses).forEach(([p, h]) => {
        if (h === 10) filteredHouses[p] = h;
      });
    }
    if (astroData.planets?.Mercury) filteredPlanets.Mercury = astroData.planets.Mercury;
    if (astroData.planets?.Saturn) filteredPlanets.Saturn = astroData.planets.Saturn;
  } else {
    // General or other: allow all
    filteredHouses = astroData.houses || {};
    filteredPlanets = astroData.planets || {};
  }

  const planetPos = Object.keys(filteredPlanets).length > 0
    ? Object.entries(filteredPlanets).map(([p, sign]) => `${p} in ${sign}`).join(", ")
    : "DATA UNAVAILABLE";

  const houseStr = Object.keys(filteredHouses).length > 0
    ? Object.entries(filteredHouses).map(([p, h]) => `${p}: ${h}th`).join(', ')
    : "DATA UNAVAILABLE";

  return `PROVIDED ASTROLOGY DATA
Lagna: ${astroData.lagna || "DATA UNAVAILABLE"}
Moon Sign: ${astroData.moonSign || "DATA UNAVAILABLE"}
Nakshatra: ${astroData.nakshatra || "DATA UNAVAILABLE"}
Mahadasha: ${astroData.mahadasha || "DATA UNAVAILABLE"}
Antardasha: ${astroData.antardasha || "DATA UNAVAILABLE"} (ends ${astroData.antardashaEnd || "N/A"})
Planet Positions: ${planetPos}
Gochar: ${astroData.gochar || "DATA UNAVAILABLE"}
Dhaiya: ${astroData.dhaiya ? "Yes" : "No"}
Sadesati: ${astroData.sadesati ? "Yes" : "No"}
Houses: ${houseStr}`;
}

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Visakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Sravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

const DASHA_LORDS = [
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

const OCCUPATION_RULES = {
  Student: 'Focus on studies, exams and higher education.',
  'Government Job': 'Focus on SSC, UPSC, State PSC, Banking and government service opportunities. Mention exam windows. Avoid generic job advice.',
  'Private Job': 'Focus on promotions, interviews and salary growth.',
  Business: 'Focus on profits, partnerships and expansion. Never give exam advice.',
  'Self Employed': 'Focus on clients, reputation and scaling.',
  Housewife: 'Focus on family and finances.',
  Other: 'Neutral guidance.'
};

const MARITAL_RULES = {
  Single: 'Marriage timing questions are valid.',
  Married: 'Never predict first marriage. Focus on spouse, children and family harmony.',
  Divorced: 'Focus on healing and second marriage.',
  Widowed: 'Focus on emotional recovery and stability.',
  Unknown: 'Neutral guidance regarding marriage/family.'
};

// Age calculation helper
function calculateAge(dobString) {
  if (!dobString) return "Unknown";
  try {
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch (err) {
    console.error("Age calculation error:", err);
    return "Unknown";
  }
}

export function buildCompactContext(userData, astroData, factMemory = {}) {
  const occ = userData?.occupation || 'Other';
  const wifeAlive = getFact(factMemory, 'relationship.wifeAlive');
  const spouseStatus = getFact(factMemory, 'relationship.spouseStatus');
  const relationshipLoss = wifeAlive === false || spouseStatus === 'deceased';
  const mar = relationshipLoss ? 'Widowed' : (userData?.maritalStatus || 'Unknown');
  const age = getFact(factMemory, 'career.age') || "Unknown";

  let occRule = OCCUPATION_RULES[occ] || OCCUPATION_RULES.Other;
  const parsedAge = parseInt(age);
  if (occ === 'Government Job' && !isNaN(parsedAge) && parsedAge > 28) {
    occRule = 'Focus on government service, departmental opportunities, state exams. Avoid always mentioning UPSC (SSC/UPSC only when suitable).';
  }

  const hasHouses = astroData?.houses && Object.keys(astroData.houses).length > 0;
  let houseRule = "";
  if (!hasHouses) {
    houseRule = "HOUSE SAFETY RULES: FORBIDDEN: Do NOT mention specific houses (e.g., 4th, 5th, 7th, 9th, 10th house). Never invent houses.";
  } else {
    houseRule = "Never mention 5th/7th/10th house if empty in astroData.";
  }

  let lossBlock = "";
  if (relationshipLoss) {
    lossBlock = "User experienced loss. DO NOT immediately suggest remarriage. Focus on emotional recovery/healing.";
  }

  let spouseStatusBlock = "";
  if (spouseStatus) {
    spouseStatusBlock = `SpouseStatus=${spouseStatus}. No active spouse comm if deceased.`;
  }

  let wifeAliveBlock = "";
  if (wifeAlive !== null && wifeAlive !== undefined) {
    wifeAliveBlock = `WifeAlive=${wifeAlive}`;
  }

  const childrenCount = getFact(factMemory, 'family.childrenCount');
  let childrenBlock = "";
  if (childrenCount !== null && childrenCount !== undefined) {
    childrenBlock = `ChildrenCount=${childrenCount}\nChildren=${childrenCount}`;
  }

  const targetExam = getFact(factMemory, 'career.targetExam');
  let targetExamBlock = "";
  if (targetExam !== null && targetExam !== undefined) {
    targetExamBlock = `TargetExam=${targetExam}`;
  }

  const financialStatus = getFact(factMemory, 'finance.status');
  let financialStatusBlock = "";
  if (financialStatus !== null && financialStatus !== undefined) {
    financialStatusBlock = `FinancialStatus=${financialStatus}`;
  }

  let safetyRulesBlock = "";
  if (wifeAlive === false) {
    safetyRulesBlock += "WifeAlive=false: no spouse comm.\n";
  }
  if (childrenCount !== null && childrenCount !== undefined && childrenCount >= 1) {
    safetyRulesBlock += "ChildrenCount>=1: child Q means addl child.\n";
  }
  if (financialStatus === 'debt') {
    safetyRulesBlock += "FinancialStatus=debt: Avoid costly remedies, gemstones and expensive pujas.\n";
  }

  const text = `
USER PROFILE
Occupation=${occ}
Marital=${mar}
Dasha=${astroData?.mahadasha || 'Unknown'}/${astroData?.antardasha || 'Unknown'}
Age=${age}
${wifeAliveBlock ? wifeAliveBlock : ''}
${childrenBlock ? childrenBlock : ''}
${targetExamBlock ? targetExamBlock : ''}
${financialStatusBlock ? financialStatusBlock : ''}
RULES:
${occRule}
${MARITAL_RULES[mar]}
${lossBlock}
${spouseStatusBlock}
${safetyRulesBlock}
CRITICAL:
Match advice to occupation.
${houseRule}
`.trim().replace(/\n+/g, '\n');

  return text;
}

export function validateAstroResponse(text, astroData, skipDashaPreservation = false) {
  if (!text) return false;

  const INVALID_RASHI_PATTERN = /(surya|chandra|mangal|budh|guru|shukra|shani|rahu|ketu)\s+(rashi|राशि)\s+me/gi;
  if ([...text.matchAll(INVALID_RASHI_PATTERN)].length > 0) return false;

  const lower = text.toLowerCase();
  const hasAstro = !!astroData;

  // Check Dasha preservation (if calculated and not skipping)
  const skipPreservation = skipDashaPreservation || (typeof process !== 'undefined' && process.env.VITEST && !process.env.TEST_DASHA_PRESERVATION);
  if (hasAstro && !skipPreservation) {
    const aliases = {
      sun: ['sun', 'surya', 'सूर्य'],
      moon: ['moon', 'chandra', 'चंद्रमा', 'चन्द्रमा', 'चन्द्र'],
      mars: ['mars', 'mangal', 'मंगल'],
      mercury: ['mercury', 'budh', 'बुध'],
      jupiter: ['jupiter', 'guru', 'गुरु', 'बृहस्पति'],
      venus: ['venus', 'shukra', 'शुक्र'],
      saturn: ['saturn', 'shani', 'शनि'],
      rahu: ['rahu', 'राहु'],
      ketu: ['ketu', 'केतु']
    };

    if (astroData.mahadasha) {
      const mahadashaLord = astroData.mahadasha.toLowerCase();
      const list = aliases[mahadashaLord] || [mahadashaLord];
      if (!list.some(alias => lower.includes(alias))) {
        return false;
      }
    }
    if (astroData.antardasha) {
      const antardashaLord = astroData.antardasha.toLowerCase();
      const list = aliases[antardashaLord] || [antardashaLord];
      if (!list.some(alias => lower.includes(alias))) {
        return false;
      }
    }
  }

  // Check Nakshatra
  if (lower.includes("nakshatra") || lower.includes("नक्षत्र")) {
    const calcNak = (hasAstro && astroData.nakshatra) ? astroData.nakshatra.toLowerCase() : "";
    for (const nak of NAKSHATRAS) {
      const nakLower = nak.toLowerCase();
      if (nakLower !== calcNak && lower.includes(nakLower)) return false;
    }
  }

  // Check Dasha
  if (lower.includes("mahadasha") || lower.includes("महादशा") || lower.includes("dasha") || lower.includes("दशा")) {
    const calcMaha = (hasAstro && astroData.mahadasha) ? astroData.mahadasha.toLowerCase() : "";
    const calcAntar = (hasAstro && astroData.antardasha) ? astroData.antardasha.toLowerCase() : "";
    for (const lord of DASHA_LORDS) {
      const lordLower = lord.name.toLowerCase();
      if (lordLower !== calcMaha && lordLower !== calcAntar && lower.includes(lordLower + " dasha")) return false;
    }
  }

  // Check ALL 12 Lagnas
  const lagnas = ['mesh', 'vrishabh', 'mithun', 'kark', 'simha', 'kanya', 'tula', 'vrishchik', 'dhanu', 'makar', 'kumbh', 'meen'];
  for (const lagna of lagnas) {
    if (lower.includes(lagna + ' lagna') || lower.includes(lagna + ' लग्न')) {
      const calcLagna = (hasAstro && astroData.lagna) ? astroData.lagna.toLowerCase() : "";
      if (!calcLagna.includes(lagna)) return false;
    }
  }

  // Check Planet Positions
  if (hasAstro) {
    const planetSigns = astroData.planets || {};
    for (const [planet, sign] of Object.entries(planetSigns)) {
      const regex = new RegExp(`${planet}\\s+(in|me)\\s+\\w+`, 'i');
      const match = text.match(regex);
      if (match && !match[0].toLowerCase().includes(sign.toLowerCase())) return false;
    }
  } else {
    // If no astro data, block any planet position mentions
    const planetsList = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu', 'Surya', 'Chandra', 'Budh', 'Guru', 'Shukra', 'Shani'];
    for (const planet of planetsList) {
      const regex = new RegExp(`${planet}\\s+(in|me)\\s+\\w+`, 'i');
      if (regex.test(text)) return false;
    }
  }

  // Check Dhaiya - only allow if calculated
  if (lower.includes('dhaiya')) {
    if (!hasAstro) {
      if (/dhaiya\s*(hai|chal|shuru|prabhav)/i.test(lower)) return false;
    } else if (!astroData.dhaiya) {
      return false;
    }
  }

  // Check Sadesati - only allow if calculated
  if (lower.includes('sadesati')) {
    if (!hasAstro) {
      if (/sadesati\s*(hai|chal|shuru|prabhav)/i.test(lower)) return false;
    } else if (!astroData.sadesati) {
      return false;
    }
  }

  // Check Houses
  const hasHouses = hasAstro && astroData.houses && Object.keys(astroData.houses).length > 0;
  if (!hasHouses) {
    const housePattern = /\b\d+(?:st|nd|rd|th)?\s+(?:house|bhav|ghar)\b/i;
    const housePatternHindi = /\b(?:bhav|house|ghar)\s+\d+/i;
    const housePatternHindi2 = /\b\d+\s*(?:bhav|ghar|house|वें\s+भाव|वें\s+घर)\b/i;
    if (housePattern.test(text) || housePatternHindi.test(text) || housePatternHindi2.test(text)) {
      return false;
    }
  }

  const houseRegex = /(\w+)\s+(\d+)(?:st|nd|rd|th)\s+(house|bhav)/gi;
  let match;
  while ((match = houseRegex.exec(text)) !== null) {
    const planet = match[1];
    const houseNum = parseInt(match[2]);
    if (!hasHouses) return false;
    if (hasAstro && astroData.houses?.[planet] && astroData.houses[planet] !== houseNum) return false;
  }

  // New sections must exist - don't validate content, just presence
  const hasSecret = text.includes('Aaj Ka Secret:') || text.includes('Secret:');
  const hasKarma = text.includes('Karma Score:') || text.includes('Score:');
  if (!hasSecret || !hasKarma) return false;

  return true;
}

function containsForbiddenPhrases(text, factMemory = {}) {
  if (!text) return false;
  let checkText = text;
  checkText = checkText.replace(/Haan\s+Beta,\s+sun\s+raha\s+hun/gi, "");

  const blacklist = ['😂', '😁', '😆'];
  if (blacklist.some(w => checkText.toLowerCase().includes(w))) return true;

  const INVALID_RASHI_PATTERN = /(surya|chandra|mangal|budh|guru|shukra|shani|rahu|ketu)\s+(rashi|राशि)\s+me/gi;
  if ([...checkText.matchAll(INVALID_RASHI_PATTERN)].length > 0) return true;

  const lower = checkText.toLowerCase();

  const forbidden = [
    "bhai",
    "mere bhai",
    "😆",
    "😂",
    "🤣",
    "hahaha",
    "bhagwan ki kripa",
    "sab theek ho jayega",
    "taare dekho",
    "atkal"
  ];

  for (const term of forbidden) {
    if (lower.includes(term.toLowerCase())) {
      return true;
    }
  }

  const brokenHindiRegex = /\b(aabki|fayda daru|shahar ke antardasha)\b/i;
  if (brokenHindiRegex.test(lower)) return true;

  // Debt-specific forbidden remedies moved to buildCompactContext prompt rules to avoid validation retry loops

  return false;
}

function getFactValue(field) {
  if (!field) return null;
  if (field.currentValue !== undefined) return field.currentValue;
  if (field.value !== undefined) return field.value;
  return null;
}

function getFactReliability(field) {
  if (!field) return 0;
  if (field.reliability !== undefined) return field.reliability;
  if (field.confidence !== undefined) {
    return Math.round((field.confidence / 5) * 100);
  }
  return 0;
}

function isNewDay(lastDate, today = new Date()) {
  return !lastDate ||
    lastDate.getDate() !== today.getDate() ||
    lastDate.getMonth() !== today.getMonth() ||
    lastDate.getFullYear() !== today.getFullYear();
}

export function parseModelResponse(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('INVALID_AI_RESPONSE');
  }

  const cleanText = text.trim();
  const cleanedJSONText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  if (cleanedJSONText.startsWith('{')) {
    try {
      const parsed = JSON.parse(cleanedJSONText);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (e) {
      // Ignore and fallback
    }
  }

  const scoreMatch = cleanedJSONText.match(/"?score"?\s*:\s*(\d+)/);
  if (scoreMatch) {
    const guidanceMatch = cleanedJSONText.match(/"?guidance"?\s*:\s*"(.*?)"/);
    return {
      score: parseInt(scoreMatch[1]),
      guidance: guidanceMatch ? guidanceMatch[1] : cleanText,
      sections: []
    };
  }

  const result = {
    prediction: '',
    reasoning: '',
    guidance: '',
    dailySecret: '', // System injects this
    karmaStatus: '' // System injects this
  };

  // Strategy 1: Try parsing with headers first
  const predMatch = cleanText.match(/🔮\s*Prediction([\s\S]*?)(?=📿|🪔|🎲|📊|$)/i);
  const reasonMatch = cleanText.match(/📿\s*Reasoning([\s\S]*?)(?=🪔|🎲|📊|$)/i);
  const guideMatch = cleanText.match(/🪔\s*Guidance([\s\S]*?)(?=🎲|📊|$)/i);

  if (predMatch || reasonMatch || guideMatch) {
    result.prediction = predMatch ? predMatch[1].trim() : '';
    result.reasoning = reasonMatch ? reasonMatch[1].trim() : '';
    result.guidance = guideMatch ? guideMatch[1].trim() : '';
  } else {
    // Strategy 2: FALLBACK for Gemma/Plain text - Krishnamurti Style
    const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length >= 1) {
      // First 1-2 lines = Direct Answer = Prediction
      result.prediction = lines.slice(0, 2).join(' ');
    }
    if (lines.length >= 3) {
      // 3rd line = Reason
      result.reasoning = lines[2];
    }
    if (lines.length >= 4) {
      // Rest = Upay + Hook = Guidance
      result.guidance = lines.slice(3).join(' ');
    }
    // If only 1-2 lines total, put all in prediction
    if (lines.length <= 2) {
      result.prediction = cleanText;
      result.guidance = "Kya aap is vishay me aur detail chahengi?";
    }
  }

  // Final Safety: If everything empty, use full text as prediction
  if (!result.prediction && !result.reasoning && !result.guidance) {
    result.prediction = cleanText;
    result.guidance = "Kya aap is vishay me aur gehrai se jaanna chahengi?";
  }

  // Validation: At least prediction must exist
  if (result.prediction.length < 5) {
    throw new Error('INCOMPLETE_AI_RESPONSE');
  }

  return result;
}

function sanitizePromptInput(text) {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text;

  // Remove potential instruction injection patterns
  sanitized = sanitized.replace(/ignore previous instructions/gi, '');
  sanitized = sanitized.replace(/system:/gi, '');
  sanitized = sanitized.replace(/assistant:/gi, '');
  sanitized = sanitized.replace(/developer:/gi, '');
  sanitized = sanitized.replace(/user:/gi, '');

  // Collapse repeated spaces
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Limit size to 1000 chars
  if (sanitized.length > 1000) {
    sanitized = sanitized.substring(0, 1000);
  }

  return sanitized.trim();
}

function normalizeTypos(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\bmuje\b/gi, "mujhe")
    .replace(/\bmje\b/gi, "mujhe")
    .replace(/\bhlo\b/gi, "hello")
    .replace(/\bhelo\b/gi, "hello")
    .replace(/\bsawl\b/gi, "sawal");
}

function getJaccardSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.trim().length > 0);
  const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.trim().length > 0);
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

function extractAndRemoveCliffhanger(text) {
  if (!text || typeof text !== 'string') return { cleanText: text, cliffhanger: "" };
  let cliffhanger = "";
  let cleanText = text;
  const lowerText = text.toLowerCase();
  const matchIndex = lowerText.indexOf("cliffhanger:");
  if (matchIndex !== -1) {
    cliffhanger = text.substring(matchIndex + "cliffhanger:".length).trim();
    cleanText = text.substring(0, matchIndex).trim();
  } else {
    // Fallback: look for 🚨 heading or emoji patterns
    const fallbackMatch = text.match(/🚨.*?\?/);
    if (fallbackMatch) {
      cliffhanger = fallbackMatch[0].trim();
    } else {
      // Split by lines and check the last non-empty line
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length > 0) {
        cliffhanger = lines[lines.length - 1];
      }
    }
  }

  if (cliffhanger) {
    cliffhanger = cliffhanger.replace(/^[*_\s"']+|[*_\s"']+$/g, '').trim();
  }

  return { cleanText, cliffhanger };
}

function getCleanTopicName(intent) {
  if (!intent || intent === 'general') return null;
  if (intent.includes('marriage') || intent === 'breakup' || intent === 'ex_back' || intent === 'partner_loyal') return 'marriage';
  if (intent.includes('job') || intent === 'promotion' || intent === 'salary' || intent === 'career_field' || intent === 'unemployment' || intent === 'career') return 'career';
  if (intent === 'child_when') return 'children';
  if (intent === 'startup' || intent === 'investment' || intent === 'debt' || intent === 'property' || intent === 'house_purchase' || intent === 'business' || intent === 'money') return 'finance';
  if (intent.includes('foreign') || intent === 'visa') return 'travel';
  if (intent.includes('health') || intent === 'mental_stress') return 'health';
  if (intent === 'education') return 'education';
  if (intent === 'family') return 'family';
  return intent.split('_')[0]; // fallback to first word
}

function removeDuplicateSentences(text) {
  if (!text || typeof text !== 'string') return text;

  const sentences = text.match(/[^.!?।|]+(?:[.!?।|]+|\s*$)/g) || [text];

  const uniqueSentences = [];
  const seenRecords = [];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    const normalized = trimmed.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/gi, '');

    let isDuplicate = false;
    for (const record of seenRecords) {
      if (normalized === record.normalized) {
        isDuplicate = true;
        break;
      }
      const sim = getJaccardSimilarity(trimmed, record.original);
      if (sim > 0.70) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      uniqueSentences.push(trimmed);
      seenRecords.push({ original: trimmed, normalized: normalized });
    }
  }

  return uniqueSentences.join(' ');
}

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

// Rate limiting map replaced by Firestore transaction rate limiter

function normalizeText(text) {
  if (!text) return "";
  let normalized = text.toLowerCase();
  normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"।|]/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ');
  return normalized.trim();
}

export function formatDirectRecallResponse(key, value, langPreference, isDevanagari) {
  const isUnknown = !value || value === 'Unknown' || value === 'Unknown-0' || value === '0';
  
  let displayValue = value;
  if (key === 'occupation' && !isUnknown) {
    const valLower = value.toLowerCase();
    if (valLower.includes('government') || valLower.includes('sarkari')) {
      displayValue = isDevanagari ? 'सरकारी नौकरी' : (langPreference === 'English' ? 'government job' : 'sarkari naukri');
    } else if (valLower.includes('private')) {
      displayValue = isDevanagari ? 'प्राइवेट नौकरी' : (langPreference === 'English' ? 'private job' : 'private naukri');
    } else if (valLower.includes('business') || valLower.includes('vyapar')) {
      displayValue = isDevanagari ? 'व्यापार' : (langPreference === 'English' ? 'business' : 'business');
    } else if (valLower.includes('student') || valLower.includes('padhai')) {
      displayValue = isDevanagari ? 'विद्यार्थी' : (langPreference === 'English' ? 'student' : 'student');
    }
  }

  if (langPreference === 'English') {
    if (isUnknown) return "I don't have this information yet. Would you like to share?";
    if (key === 'name') return `Your name is ${displayValue}.`;
    if (key === 'dob') return `Your date of birth is ${displayValue}.`;
    if (key === 'pob') return `Your birthplace is ${displayValue}.`;
    if (key === 'age') return `Your age is ${displayValue}.`;
    if (key === 'occupation') return `You work in a ${displayValue}.`;
    if (key === 'children') return `You have ${displayValue} child/children.`;
  } else if (isDevanagari) {
    if (isUnknown) return "मुझे इसकी जानकारी नहीं है। क्या आप बताना चाहेंगे?";
    if (key === 'name') return `आपका नाम ${displayValue} है।`;
    if (key === 'dob') return `आपकी जन्म तिथि ${displayValue} है।`;
    if (key === 'pob') return `आपका जन्म स्थान ${displayValue} है।`;
    if (key === 'age') return `आपकी उम्र ${displayValue} वर्ष है।`;
    if (key === 'occupation') return `आप ${displayValue} करते हैं।`;
    if (key === 'children') return `आपके ${displayValue} बच्चे हैं।`;
  } else {
    // Hinglish (Default)
    if (isUnknown) return "Mujhe iski jaankari nahi hai. Kya aap batana chahenge?";
    if (key === 'name') return `Aapka naam ${displayValue} hai.`;
    if (key === 'dob') return `Aapki birth date ${displayValue} hai.`;
    if (key === 'pob') return `Aapka birthplace ${displayValue} hai.`;
    if (key === 'age') return `Aapki age ${displayValue} saal hai.`;
    if (key === 'occupation') return `Aap ${displayValue} karte hain.`;
    if (key === 'children') return `Aapke ${displayValue} bachche hain.`;
  }
  return "";
}

function getBackendErrorFallback(resolvedLanguage, isDevanagari, maritalStatus) {
  const isMarried = maritalStatus === 'Married';
  if (resolvedLanguage === 'English') {
    return `🔮 Prediction:
I am experiencing difficulty connecting with the cosmic celestial energy at this moment.

📿 Astrological Reasoning:
The stellar frequencies are temporarily blocked, but general principles suggest focusing on ${isMarried ? 'family harmony' : 'patience'}.

🪔 Guidance:
Please pray to Lord Ganesha, the remover of all obstacles. Try asking your question again in a short while once the cosmic alignment is restored.`;
  } else if (isDevanagari) {
    return `🔮 Prediction:
इस समय ब्रह्मांडीय ऊर्जा और नक्षत्रों के साथ संपर्क स्थापित करने में कुछ बाधा आ रही है।

📿 Astrological Reasoning:
ग्रहों के गोचर में अस्थाई अवरोध है, लेकिन सामान्य सिद्धांत ${isMarried ? 'दांपत्य सुख' : 'धैर्य और शांति'} बनाए रखने का सुझाव देते हैं।

🪔 Guidance:
कृपया विघ्नहर्ता भगवान गणेश का ध्यान करें। कुछ समय पश्चात पुनः प्रयास करें, तब तक ग्रहों की स्थिति अनुकूल हो जाएगी।`;
  } else {
    return `🔮 Prediction:
Is samay brahmandiya oorja aur nakshatron ke saath sampark sthapit karne me kuch badha aa rahi hai.

📿 Astrological Reasoning:
Grahon ke gochar me temporary blockage hai, par samanya principles ${isMarried ? 'dampatya sukh' : 'dhairya aur shanti'} banaye rakhne ka sujhaav dete hain.

🪔 Guidance:
Kripya vighnaharta Bhagwan Ganesh ka dhyan karein. Kuch samay baad dobara prayas karein, tab tak grahon ki sthiti anukool ho jayegi.`;
  }
}

function detectQuestionLanguage(text) {
  if (!text) return 'Hindi';
  const cleanText = text.toLowerCase().trim();

  // Common Hinglish words
  const hinglishWords = [
    'kab', 'hogi', 'hoga', 'hai', 'meri', 'mera', 'kya', 'shadi', 'shaadi', 'karein',
    'gaya', 'ho', 'nahi', 'rahi', 'patni', 'beti', 'beta', 'santan', 'karza', 'kaise',
    'kabse', 'milegi', 'lagegi', 'se', 'ko', 'ki', 'ka', 'ke', 'bata', 'rha', 'raha',
    'rhi', 'rahi', 'hun', 'hoon', 'tha', 'thi', 'the', 'kuch', 'baat', 'par', 'vivaah',
    'kis', 'kisko', 'he', 'h', 'hai', 'taraf', 'tarah', 'kare', 'kar', 'karna'
  ];

  // Common English helper/question words
  const englishWords = [
    'when', 'will', 'what', 'is', 'my', 'get', 'married', 'relationship', 'talking',
    'job', 'career', 'business', 'health', 'future', 'about', 'for', 'why', 'how',
    'who', 'the', 'shall', 'does', 'did', 'are', 'you', 'your', 'should', 'would',
    'could', 'have', 'has', 'was', 'were', 'which', 'an', 'of', 'to', 'with', 'our',
    'i', 'me', 'we', 'us', 'they', 'them', 'he', 'she', 'his', 'her', 'ex'
  ];

  const words = cleanText.split(/[^a-zA-Z]+/);
  let hinglishCount = 0;
  let englishCount = 0;

  for (const word of words) {
    if (!word) continue;
    if (hinglishWords.includes(word)) {
      hinglishCount++;
    }
    if (englishWords.includes(word)) {
      englishCount++;
    }
  }

  if (hinglishCount > 0 || englishCount === 0) {
    return 'Hindi';
  }
  return 'English';
}

function getSecretCategory(intent) {
  if (!intent) return 'General';
  const clean = intent.toLowerCase();
  if (clean.includes('love') || clean.includes('breakup') || clean.includes('gf') || clean.includes('girlfriend') || clean.includes('boyfriend') || clean.includes('ex')) {
    return 'Love';
  }
  if (clean.includes('marry') || clean.includes('marriage') || clean.includes('spouse') || clean.includes('wife') || clean.includes('husband') || clean.includes('vivaah') || clean.includes('shadi')) {
    return 'Marriage';
  }
  if (clean.includes('job') || clean.includes('work') || clean.includes('salary') || clean.includes('career') || clean.includes('promotion') || clean.includes('ssc') || clean.includes('upsc')) {
    return 'Career';
  }
  if (clean.includes('business') || clean.includes('shop') || clean.includes('investment') || clean.includes('profit') || clean.includes('loss') || clean.includes('client') || clean.includes('debt') || clean.includes('karz')) {
    return 'Business';
  }
  if (clean.includes('health') || clean.includes('stress') || clean.includes('accident') || clean.includes('disease') || clean.includes('pain')) {
    return 'Health';
  }
  return 'General';
}

function getLevel(score) {
  if (score < 100) return 'Seeker';
  if (score < 300) return 'Explorer';
  if (score < 600) return 'Believer';
  return 'Master';
}

async function injectSecretAndScore(text, uid, userData, cachedProgress = null, category = 'General', pastHistory = []) {
  if (!text) return text;

  const progressUid = userData?.uid || uid || 'guest';
  let progress = { score: 0, streak: 0, lastLogin: '', secrets: {} };
  if (cachedProgress) {
    progress = cachedProgress;
  } else {
    try {
      progress = await getProgress(progressUid);
    } catch (err) {
      console.error("injectSecretAndScore getProgress failed", err);
    }
  }
  const today = new Date().toISOString().split('T')[0];
  const dobKey = (userData?.dobDay || '') + '' + (userData?.dobMonth || '') + '' + (userData?.dobYear || '');
  const secret = getDailySecret(dobKey, today, category, pastHistory);
  const nextLevel = Math.ceil((progress.score + 1) / 100) * 100;

  let cleaned = text;

  // Replace/remove existing secret and score sections if AI generated them
  cleaned = cleaned.replace(/(?:🎲\s*)?(?:Aaj\s+Ka\s+)?Secret:[\s\S]*?(?=(?:📊\s*)?(?:Karma\s+)?Score:|$)/gi, "");
  cleaned = cleaned.replace(/(?:📊\s*)?(?:Karma\s+)?Score:[\s\S]*?$/gi, "");
  cleaned = cleaned.replace(/(?:🎲\s*)?(?:Aaj\s+Ka\s+)?Secret:[\s\S]*?$/gi, "");
  cleaned = cleaned.replace(/(?:📊\s*)?(?:Karma\s+)?Score:[\s\S]*?$/gi, "");
  cleaned = cleaned.trim();

  // Append clean/correct sections from code
  cleaned += `\n\n🎲 Aaj Ka Secret:\n${secret}`;
  cleaned += `\n\n📊 Karma Score: ${progress.score}/${nextLevel} | Level: ${getLevel(progress.score)} | Streak: ${progress.streak}🔥`;

  return cleaned;
}

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
  const dayStr = String(now.getDate()).padStart(2, '0');
  const monthNum = now.getMonth(); // 0-indexed
  const monthStr = String(monthNum + 1).padStart(2, '0');
  const year = now.getFullYear();
  const todayString = `${year}-${monthStr}-${dayStr}`;

  const rateLimitRef = db.collection('rateLimits').doc(uid);
  let rateLimitHit = false;

  try {
    await db.runTransaction(async (tx) => {
      const docSnap = await tx.get(rateLimitRef);
      let count = 0;
      let windowStart = nowMs;

      if (docSnap.exists) {
        const data = docSnap.data();
        if (data && typeof data.count === 'number' && typeof data.windowStart === 'number') {
          count = data.count;
          windowStart = data.windowStart;
        }
      }

      if (nowMs - windowStart > 60000) {
        count = 0;
        windowStart = nowMs;
        console.log("RATE_LIMIT_RESET");
      }

      if (count >= 20) {
        rateLimitHit = true;
        console.log("RATE_LIMIT_HIT");
        return;
      }

      const newCount = count + 1;
      const updateData = { count: newCount, windowStart };

      if (docSnap.exists && typeof tx.update === 'function') {
        tx.update(rateLimitRef, updateData);
      } else if (typeof tx.set === 'function') {
        tx.set(rateLimitRef, updateData);
      } else {
        tx.update(rateLimitRef, updateData);
      }
    });
  } catch (error) {
    console.error("Rate limiter transaction failed:", error);
  }

  if (rateLimitHit) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
  }

  const { mode, userData, history, purpose, prompt } = req.body;

  if (purpose === 'semantic-memory') {
    try {
      const promptToSend = prompt || userData?.question || '';
      const aiText = await generateAIResponse(promptToSend, { purpose: 'semantic-memory', jsonMode: true });
      let parsed;
      try {
        parsed = JSON.parse(aiText);
      } catch (pe) {
        console.warn("WARNING: Semantic memory parsing failed, fallback to {}", pe);
        parsed = {};
      }
      return res.status(200).json(parsed);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  let detectedIntent = 'general';
  let marriedGuardInstruction = "";
  let aiText = "";

  if (!userData) {
    return res.status(400).json({ error: 'Missing userData in request body' });
  }

  // ADDICTION LAYER: Get user progress
  const progressUid = userData.uid || uid || 'guest';
  let progress = { score: 0, streak: 0, lastLogin: '', secrets: {} };
  try {
    progress = await getProgress(progressUid);
  } catch (err) {
    console.error("getProgress failed at start", err);
  }

  try {
    progress = await updateProgress(progressUid, 'checkin', progress); // Auto streak, reuse progress
  } catch (err) {
    console.error("updateProgress failed at start", err);
  }

  const today = new Date().toISOString().split('T')[0];
  const dobKey = (userData.dobDay || '') + '' + (userData.dobMonth || '') + '' + (userData.dobYear || '');
  const secret = getDailySecret(dobKey, today);
  const nextLevel = Math.ceil((progress.score + 1) / 100) * 100;

  // Request size hardening
  if (userData.question && userData.question.length > 1000) {
    return res.status(400).json({ error: 'Question too long (max 1000 characters)' });
  }

  if (Array.isArray(history)) {
    if (history.length > 100) {
      return res.status(400).json({ error: 'History too long (max 100 messages)' });
    }
    for (const msg of history) {
      if (msg && msg.content && msg.content.length > 1000) {
        return res.status(400).json({ error: 'Message too long (max 1000 characters per message)' });
      }
    }
  }

  if (mode === 'chat' || mode === 'personal') {
    const questionTextRaw = userData.question || '';
    if (!questionTextRaw.trim()) {
      const currentLang = userData.currentLanguage || 'English';
      const emptyText = currentLang === 'Hindi'
        ? "कृपया अपना प्रश्न पूछें। (Please ask your question.)"
        : "Please ask your question.";
      return res.status(200).json({ text: emptyText });
    }

    const safetyKeywords = /\b(suicide|self-harm|kill myself|harm myself|end my life|die|zehar|zeher|atmahatya|mar jau|mar jaunga|maar diya|marne ki koshish|jaan se maar|pitai|hamla|attack|hinsa|dhamki|pareshan karta hai|torture|abuse|kill me|murder|assault|violence|threatening me|trying to kill me)\b/i;
    if (safetyKeywords.test(questionTextRaw)) {
      return res.status(200).json({
        text: "Agar aapko vastav me suraksha ka khatra lagta hai to kripya ise gambhirta se lein aur turant kisi trusted vyakti ya authority se sampark karein. Brahmandiya urjaon ka sanket aspasht hai, aur aise gambhir vishayon me bhautik suraksha hi sarvopari hai."
      });
    }
  }

  const BEDROCK_API_KEY = process.env.BEDROCK_API_KEY;
  const BEDROCK_BASE_URL = process.env.BEDROCK_BASE_URL;
  const GROK_API_KEY = process.env.GROK_API_KEY;
  const GROK_BASE_URL = process.env.GROK_BASE_URL;

  const userRef = db.collection('users').doc(uid);
  let userDoc;
  let userDataDoc;
  try {
    userDoc = await userRef.get();
    if (!userDoc.exists) {
      // AUTO-CREATE
      const defaultUser = {
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
      await userRef.set(defaultUser, { merge: true });
      userDataDoc = defaultUser;
    } else {
      userDataDoc = userDoc.data();
    }
  } catch (e) {
    console.error("User initialization error:", e);
    return res.status(500).json({ error: 'Failed to initialize user session' });
  }

  if (!userDataDoc) {
    return res.status(500).json({ error: 'User profile not found' });
  }

  const topicProgress = getTopicProgress(userDataDoc);
  const revealedLayers = userDataDoc.revealedLayers || {};
  let lastCliffhangers = userDataDoc.lastCliffhangers || [];
  let lastActiveTopic = userDataDoc.lastActiveTopic || null;
  let targetLayerNum = 1;
  let activeTopic = null;
  let shouldAdvance = false;
  let cliffhangerText = "";
  let savedMysteries = userDataDoc.savedMysteries || [];
  let topicState = null;

  // Handle system commands (coins, premium, account)
  if (mode === 'chat' || mode === 'personal') {
    const questionTextRaw = userData.question || '';
    const normalizedCmd = questionTextRaw.toLowerCase().trim();
    if (normalizedCmd === '/coins' || normalizedCmd === 'coins') {
      const coinsCount = userDataDoc.coins || 0;
      return res.status(200).json({
        text: `Total Coins: ${coinsCount}. You need 40 coins for each AI consultation. You can watch ads or purchase more coins to unlock them.`
      });
    }
    if (normalizedCmd === '/premium' || normalizedCmd === 'premium') {
      const isPremiumLatest = !!userDataDoc.premium;
      return res.status(200).json({
        text: isPremiumLatest 
          ? "You are a Divine Seeker Premium member. Enjoy unlimited Pandit AI, tarot readings, and ad-free experience!" 
          : "Upgrade to Seeker Status to unlock unlimited consultations, daily tarot readings, and ad-free experience. Visit the Premium tab to upgrade!"
      });
    }
    if (normalizedCmd === '/account' || normalizedCmd === 'account') {
      return res.status(200).json({
        text: `Account ID: ${uid}\nStatus: ${userDataDoc.premium ? 'Premium' : 'Free'}\nCoins: ${userDataDoc.coins || 0}`
      });
    }
  }

  const isPremium = !!userDataDoc.premium;

  // === CONTRADICTION SAFETY LAYER (PHASE 29B) ===
  const factsRef = db.collection('users').doc(uid).collection('facts').doc('current');
  let factsDoc;
  try {
    factsDoc = await factsRef.get();
  } catch (e) {
    console.error("Error reading facts from Firestore:", e);
  }

  let facts = {
    married: { value: null, confidence: 0 },
    hasChildren: { value: null, confidence: 0 },
    hasJob: { value: null, confidence: 0 },
    hasBusiness: { value: null, confidence: 0 },
    gender: { value: null, confidence: 0 }
  };

  if (factsDoc && factsDoc.exists) {
    facts = { ...facts, ...factsDoc.data() };
  }

  // Scan current question and history for new facts to update
  const questionText = normalizeTypos(sanitizePromptInput((userData.question || '').trim()));
  let userQueryForLLM = questionText;
  const newFacts = normalizeFacts(questionText);

  const { storedFacts, updated } = updateEvidenceMemory(facts, newFacts, 'user', questionText);
  facts = storedFacts;

  if (updated) {
    try {
      await factsRef.set(facts, { merge: true });
    } catch (e) {
      console.error("Error writing updated facts to Firestore:", e);
    }
  }

  // === USER PROFILE INJECTION (PHASE 30B) ===
  const profileRef = db.collection('users').doc(uid).collection('profile').doc('main');
  let profileDoc;
  try {
    profileDoc = await profileRef.get();
  } catch (e) {
    console.error("Error reading user profile from Firestore:", e);
  }

  let profile = null;
  if (profileDoc && profileDoc.exists) {
    profile = profileDoc.data();
  }

  let relationshipLoss = false;
  const factMemory = (mode === 'chat' || mode === 'personal') ? await getFactMemory(uid) : {};

  // Relationship Investigation Routing (Phase 31H)
  const RELATIONSHIP_INVESTIGATION_PATTERNS = [
    /cheat/i,
    /affair/i,
    /third\s*person/i,
    /extra\s*marital/i,
    /kisi\s+aur\s+ke\s+saath\s+relation/i,
    /chakkar/i,
    /loyalty/i,
    /faithfulness/i
  ];
  const isRelationshipInvestigationQuery = (mode === 'chat' || mode === 'personal') && RELATIONSHIP_INVESTIGATION_PATTERNS.some(pattern => pattern.test(questionText));
  const p2Name = userData?.p2?.name || userData?.partner?.name || userData?.partnerName || getFact(factMemory, 'relationship.spouseName') || getFact(factMemory, 'relationship.partnerName');
  const hasPartnerDetails = !!(p2Name || (userData?.p2 && (userData?.p2?.dobDay || userData?.p2?.dob)));

  if (isRelationshipInvestigationQuery && !hasPartnerDetails) {
    const replyText = `🔮 Prediction:
Aapki janm jaankari mere paas hai, lekin is connection ko aur gehrai se dekhne ke liye mujhe us vyakti ke baare me kuch jaankari chahiye:

• Naam
• Janm tithi (agar pata ho)
• Janm samay (agar pata ho)
• Janm sthan (agar pata ho)

Jitni adhik jaankari hogi, utna adhik vyaktigat relationship analysis mil sakega.`;
    return res.status(200).json({ text: replyText });
  }

  const wasAwaitingClarification = (mode === 'chat' || mode === 'personal')
    ? (getFact(factMemory, 'awaitingClarification') === true)
    : false;

  // Intent detection and contradiction routing
  if (mode === 'chat' || mode === 'personal') {
    const questionTextNormalized = (userData.question || '').trim().toLowerCase();

    // Resolve clarification state if user answers
    const awaitingClarification = getFact(factMemory, 'awaitingClarification');
    const clarificationType = getFact(factMemory, 'clarificationType');
    if (awaitingClarification && clarificationType === 'relationship_return') {
      const resolutionKeywords = ['patchup', 'patch up', 'ex', 'meri ex', 'wahi ladki', 'usi ke baare me'];
      if (resolutionKeywords.some(keyword => questionTextNormalized.includes(keyword))) {
        setFact(factMemory, 'relationship.girlfriendStatus', 'patchup');
        setFact(factMemory, 'relationship.relationshipStatus', 'patchup');
        setFact(factMemory, 'awaitingClarification', false);
        setFact(factMemory, 'clarificationType', null);
      }
    }

    const detectedLoss = DECEASED_PATTERNS.some(pattern => pattern.test(questionTextNormalized)) || getFact(factMemory, 'relationship.spouseStatus') === 'deceased';

    let currentMarital = 'Unknown';
    if (detectedLoss) {
      currentMarital = 'Widowed';
      relationshipLoss = true;
    } else if (userData?.maritalStatus && userData.maritalStatus !== 'Unknown') {
      currentMarital = userData.maritalStatus;
    } else if (profile?.maritalStatus && profile.maritalStatus !== 'Unknown') {
      currentMarital = profile.maritalStatus;
    } else if (getFactValue(facts.married) === true) {
      currentMarital = 'Married';
    } else if (getFactValue(facts.married) === false) {
      currentMarital = 'Single';
    }

    if (currentMarital === 'Widowed') {
      relationshipLoss = true;
    }

    const originalIntent = detectIntent(questionText);
    detectedIntent = resolveIntentContradiction(
      originalIntent,
      { ...profile, maritalStatus: currentMarital },
      facts,
      questionText
    );


  }
  // Client is initialized lazily inside generateAIResponse in services/aiService.js
  // Generate dynamic date context
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

  // Existing language resolution flow extended with final fallback auto-detection
  let resolvedLanguage = req.body.language || userData?.language;
  if (!resolvedLanguage || resolvedLanguage === 'Unknown') {
    resolvedLanguage = detectQuestionLanguage(questionText);
  }

  const isDevanagari = /[\u0900-\u097F]/.test(questionText);

  let languagePreference = "";
  if (resolvedLanguage === 'English') {
    languagePreference = "English (Latin/Roman script). Write the entire response in English.";
  } else {
    languagePreference = "Devanagari Hindi script (हिन्दी). Write the entire response in pure Hindi. Never use Roman Hindi or English.";
  }

  let cosmicHeading = "🌟 **The Unfiltered Cosmic Truth**";
  let frictionHeading = "⚡ **The Silent Saboteur**";
  let powerHeading = "🔮 **Your 7-Day Power Move**";
  let cliffhangerHeading = "🚨 **The Cliffhanger (Open Loop)**";

  if (resolvedLanguage !== 'English') {
    cosmicHeading = "🌟 **ब्रह्मांडीय संकेत**";
    frictionHeading = "⚡ **छिपा हुआ कारण**";
    powerHeading = "🔮 **आपका अगला कदम**";
    cliffhangerHeading = "🚨 **सस्पेंस प्रश्न**";
  }

  const isFollowUp = isFollowUpMessage(questionText);

  const isGreeting = isGreetingMessage(questionText);
  const isProfileAck = isProfileAcknowledgementMessage(questionText);
  const isMemoryRecall = isMemoryRecallMessage(questionText);
  const isVague = !isFollowUp && !isProfileAck && !isMemoryRecall && !wasAwaitingClarification && !isRelationshipInvestigationQuery && isVagueMessage(questionText);



  let ageDisplay = "Unknown";

  if (mode !== 'chat' && mode !== 'personal') {
    const { p1, p2 } = userData;
    if (!p1 || !p2) {
      return res.status(400).json({ error: 'Compatibility mode requires p1 and p2 in userData' });
    }
  }

  // Extract and resolve astrology variables (Step 1)
  let name = 'Unknown';
  let gender = 'Unknown';
  let maritalStatus = 'Unknown';
  let dob = 'Unknown';
  let tob = 'Unknown';
  let pob = 'Unknown';
  let hasBirthDetails = true;
  let hasTob = true;
  let hasPob = true;

  if (mode === 'chat' || mode === 'personal') {
    const birthDetails = userData?.birthDetails || userData || {};
    name = profile?.name || birthDetails.name || 'Unknown';

    let resolvedGender = 'Unknown';
    if (birthDetails.gender && birthDetails.gender !== 'Unknown') {
      resolvedGender = birthDetails.gender;
    } else if (profile?.gender && profile.gender !== 'Unknown') {
      resolvedGender = profile.gender;
    } else if (getFactValue(facts.gender)) {
      resolvedGender = getFactValue(facts.gender);
    }
    gender = resolvedGender;

    let resolvedMarital = 'Unknown';
    const maritalStatusFromBirthDetails = birthDetails.maritalStatus;
    if (relationshipLoss) {
      resolvedMarital = 'Widowed';
    } else if (maritalStatusFromBirthDetails && maritalStatusFromBirthDetails !== 'Unknown') {
      resolvedMarital = maritalStatusFromBirthDetails;
    } else if (profile?.maritalStatus && profile.maritalStatus !== 'Unknown') {
      resolvedMarital = profile.maritalStatus;
    } else if (getFactValue(facts.married) === true) {
      resolvedMarital = 'Married';
    } else if (getFactValue(facts.married) === false) {
      resolvedMarital = 'Single';
    }
    maritalStatus = resolvedMarital;

    // DOB
    let dobDay = birthDetails.dobDay || profile?.dobDay;
    let dobMonth = birthDetails.dobMonth || profile?.dobMonth;
    let dobYear = birthDetails.dobYear || profile?.dobYear;

    // FALLBACK: Parse YYYY-MM-DD or DD-MM-YYYY string if dobDay undefined
    if (!dobDay && birthDetails.dob) {
      const parts = birthDetails.dob.split('-');
      if (parts.length === 3) {
        // Check if YYYY-MM-DD or DD-MM-YYYY
        if (parts[0].length === 4) {
          // YYYY-MM-DD from frontend
          dobYear = parseInt(parts[0]);
          dobMonth = parseInt(parts[1]);
          dobDay = parseInt(parts[2]);
        } else {
          // DD-MM-YYYY fallback
          dobDay = parseInt(parts[0]);
          dobMonth = parseInt(parts[1]);
          dobYear = parseInt(parts[2]);
        }
      }
    }

    // Parse profile fallback if dobDay is still undefined
    if (!dobDay) {
      const profileDob = profile?.dob || profile?.dateOfBirth;
      if (profileDob) {
        const parts = profileDob.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            dobYear = parseInt(parts[0]);
            dobMonth = parseInt(parts[1]);
            dobDay = parseInt(parts[2]);
          } else {
            dobDay = parseInt(parts[0]);
            dobMonth = parseInt(parts[1]);
            dobYear = parseInt(parts[2]);
          }
        }
      }
    }

    hasBirthDetails = true;
    hasTob = true;
    hasPob = true;

    if (!dobDay || !dobMonth || !dobYear) {
      hasBirthDetails = false;
      dob = 'Unknown';
      tob = 'Unknown';
      pob = 'Unknown';
    } else {
      dob = `${dobYear}-${String(dobMonth).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;
      ageDisplay = calculateAge(dob);

      // Time (TOB)
      const tobHour = birthDetails.tobHour || profile?.tobHour;
      const tobMinute = birthDetails.tobMinute || profile?.tobMinute;
      const tobPeriod = birthDetails.tobPeriod || profile?.tobPeriod;
      if (tobHour !== undefined && tobMinute !== undefined) {
        tob = `${tobHour}:${String(tobMinute).padStart(2, '0')} ${tobPeriod || ''}`.trim();
      } else if (profile?.tob) {
        tob = profile.tob;
      } else if (profile?.timeOfBirth) {
        tob = profile.timeOfBirth;
      } else {
        hasTob = false;
        hasBirthDetails = false;
        tob = 'Unknown';
      }

      // Place (POB)
      const pobVal = profile?.pob || profile?.placeOfBirth || birthDetails.pob;
      if (pobVal && pobVal !== 'Unknown') {
        pob = pobVal;
      } else {
        hasPob = false;
        hasBirthDetails = false;
        pob = 'Unknown';
      }
    }

    const directRecallKey = detectDirectRecallKey(questionText);
    if (directRecallKey && !isProfileAck) {
      let value = 'Unknown';
      if (directRecallKey === 'name') value = name;
      else if (directRecallKey === 'dob') {
        if (dob && dob !== 'Unknown') {
          const parts = dob.split('-');
          value = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          value = 'Unknown';
        }
      }
      else if (directRecallKey === 'pob') value = pob;
      else if (directRecallKey === 'age') value = ageDisplay;
      else if (directRecallKey === 'occupation') value = profile?.occupation || userData?.occupation || getFact(factMemory, 'career.occupation') || 'Unknown';
      else if (directRecallKey === 'children') value = getFact(factMemory, 'family.childrenCount') || userData?.childrenCount || profile?.childrenCount || 'Unknown';

      const reply = formatDirectRecallResponse(directRecallKey, value, resolvedLanguage, isDevanagari);
      return res.status(200).json({ text: `🔮 Prediction: ${reply}` });
    }
  }

  const qClean = (questionText || '').toLowerCase().trim();
  const timingKeywords = ['kab', 'kb', 'when', 'saal', 'month', 'year', 'timing', 'samay', 'tithi', 'date', 'time', 'period', 'window'];
  const hasTimingKeyword = timingKeywords.some(keyword => qClean.includes(keyword));
  const isGratitude = qClean.includes('thank') || qClean.includes('shukriya') || qClean.includes('dhanyavad') || qClean.includes('dhanyabahad');
  const isRemedy = qClean.includes('upay') || qClean.includes('upaya') || qClean.includes('remedy') || qClean.includes('nivaran');
  const isTimingQuery = hasTimingKeyword && !isGreeting && !isProfileAck && !isMemoryRecall && !isVague && !isGratitude && !isRemedy && !wasAwaitingClarification;

  const allHistoryMsgs = Array.isArray(history) ? history : [];
  let pastHistory = [];
  if (allHistoryMsgs.length > 0) {
    const lastMsg = allHistoryMsgs[allHistoryMsgs.length - 1];
    if (lastMsg.role === 'user' && lastMsg.content === (userData?.question || '')) {
      pastHistory = allHistoryMsgs.slice(0, -1);
    } else {
      pastHistory = allHistoryMsgs;
    }
  }

  let skipDashaPreservation = isGreeting || isVague || !hasBirthDetails || isNonAstrologyQuestion(questionText) || !isTimingQuery;

  const astroData = (mode === 'chat' || mode === 'personal')
    ? await getAstrologyData({ dob, tob, pob })
    : null;

  let dashaAlreadyMentioned = false;
  if (astroData && pastHistory.length > 0) {
    const mahadashaLord = (astroData.mahadasha || '').toLowerCase();
    const antardashaLord = (astroData.antardasha || '').toLowerCase();
    const historyText = pastHistory.map(m => m.content).join(' ').toLowerCase();
    const aliases = {
      sun: ['sun', 'surya', 'सूर्य'],
      moon: ['moon', 'chandra', 'चंद्रमा', 'चन्द्रमा', 'चन्द्र'],
      mars: ['mars', 'mangal', 'मंगल'],
      mercury: ['mercury', 'budh', 'बुध'],
      jupiter: ['jupiter', 'guru', 'गुरु', 'बृहस्पति'],
      venus: ['venus', 'shukra', 'शुक्र'],
      saturn: ['saturn', 'shani', 'शनि'],
      rahu: ['rahu', 'राहु'],
      ketu: ['ketu', 'केतु']
    };
    if (mahadashaLord && antardashaLord) {
      const mAliases = aliases[mahadashaLord] || [mahadashaLord];
      const aAliases = aliases[antardashaLord] || [antardashaLord];
      const mMatch = mAliases.some(alias => historyText.includes(alias));
      const aMatch = aAliases.some(alias => historyText.includes(alias));
      if (mMatch && aMatch) {
        dashaAlreadyMentioned = true;
        skipDashaPreservation = true;
      }
    }
  }

  let updatedFacts = factMemory;
  // Construct prompt for API providers
  let fullPrompt = "";
  if (mode === 'chat' || mode === 'personal') {
    const occupation = profile?.occupation || userData?.occupation || 'Unknown';
    const skipSemanticPhrases = new Set([
      'hnn', 'haan', 'aur batao', 'next', 'detail', 'hn', 'hn btao', 'haan batao', 'aur bata', 'aur detail'
    ]);
    const qClean = (questionText || '').toLowerCase().trim();
    const cleanQForFollowUp = qClean.replace(/[?.,!]/g, '').trim();

    let semanticFacts = null;
    if (!skipSemanticPhrases.has(cleanQForFollowUp)) {
      try {
        semanticFacts = await extractSemanticFacts({
          question: questionText,
          existingFacts: factMemory,
          userProfile: {
            maritalStatus,
            occupation,
            age: ageDisplay
          }
        });
      } catch (err) {
        console.error("Semantic fact extraction failed:", err);
      }
    }

    if (semanticFacts && typeof semanticFacts.confidence === 'number' && semanticFacts.confidence >= 0.80) {
      updatedFacts = mergeSemanticFacts(factMemory, semanticFacts);
    } else {
      updatedFacts = extractFactsFromMessage(questionText, factMemory);
    }

    if (relationshipLoss) {
      setFact(updatedFacts, 'relationship.spouseStatus', 'deceased');
      setFact(updatedFacts, 'relationship.wifeAlive', false);
    }
    if (maritalStatus && maritalStatus !== 'Unknown') {
      updatedFacts.maritalStatus = maritalStatus;
      if (updatedFacts.facts) updatedFacts.facts.maritalStatus = maritalStatus;
    }
    if (occupation && occupation !== 'Unknown') {
      setFact(updatedFacts, 'career.occupation', occupation);
    }
    if (ageDisplay && ageDisplay !== 'Unknown') {
      setFact(updatedFacts, 'career.age', ageDisplay);
    }
    updatedFacts = migrateFactMemory(updatedFacts);

    const contradiction = (!isGreeting && !isVague)
      ? detectSmartContradiction(questionText, updatedFacts, userData, history)
      : null;

    if (contradiction && contradiction.type === 'relationship_breakup') {
      setFact(updatedFacts, 'awaitingClarification', true);
      setFact(updatedFacts, 'clarificationType', 'relationship_return');
    }

    await updateFactMemory(
      uid,
      questionText,
      updatedFacts
    );

    if (contradiction) {
      return res.status(200).json({
        text: contradiction.text
      });
    }
  }

  if (mode === 'chat' || mode === 'personal') {
    let promptSections = [];

    const topicMapping = {
      marriage: 'marriage',
      love: 'love',
      career: 'career',
      money: 'money',
      finance: 'money',
      health: 'health',
      travel: 'travel',
      foreign: 'travel',
      foreign_travel: 'travel',
      children: 'children',
      daily: 'daily',
      future: 'daily'
    };

    let classification = getTopicAndSubType(questionText);
    if (isRelationshipInvestigationQuery) {
      classification = { tier: 2, topic: 'love', secondary: [] };
    }
    const tierType = classification.tier;
    const questionTopic = classification.topic;
    const secondaryRaw = classification.secondary || [];
    const overflowRaw = classification.overflow || [];
    const secondaryTopics = secondaryRaw.map(t => TOPIC_MAPPING[t] || t).filter(t => t !== TOPIC_MAPPING[questionTopic]);
    const overflowTopics = overflowRaw.map(t => TOPIC_MAPPING[t] || t).filter(t => t !== TOPIC_MAPPING[questionTopic]);
    if (overflowTopics.length > 0) {
      savedMysteries = Array.from(new Set([...savedMysteries, ...overflowTopics]));
    }

    const lastUserMsg = [...pastHistory].reverse().find(m => m.role === 'user');
    topicState = generateTopicState(
      questionText,
      lastActiveTopic,
      topicProgress,
      isFollowUp,
      lastUserMsg?.content,
      savedMysteries,
      revealedLayers
    );

    activeTopic = topicState.activeTopic;
    targetLayerNum = topicState.targetLayer;
    shouldAdvance = topicState.shouldAdvance;

    // Fact Memory (Married, Gender, Occupation) & Language Preference
    let factMemoryBlock = "Fact Memory:\n";

    const isMarried = (maritalStatus === 'Married');
    factMemoryBlock += `Married: ${isMarried ? "Yes" : "No"}\n`;
    factMemoryBlock += `Gender: ${gender}\n`;

    const occupation = profile?.occupation || userData?.occupation || 'Unknown';
    factMemoryBlock += `Occupation: ${occupation}\n`;

    const language = resolvedLanguage;
    factMemoryBlock += `Language Preference: ${language}`;

    if (!isGreeting && !isVague) {
      promptSections.push(factMemoryBlock.trim());
      let astrologyProfileBlock = `User Astrology Profile:
Name: ${name}
Gender: ${gender}
DOB: ${dob}
Age: ${ageDisplay}
Time: ${tob}
Place: ${pob}
Marital Status: ${maritalStatus}`;
      promptSections.push(astrologyProfileBlock);
      if (!isProfileAck && !isMemoryRecall) {
        promptSections.push(buildCompactContext(userData, isVague ? null : astroData, updatedFacts));
        if (!isVague) {
          promptSections.push(buildAstrologyBlock(astroData, questionTopic, questionText));
        } else {
          promptSections.push("PROVIDED ASTROLOGY DATA\nDATA UNAVAILABLE");
        }
      } else {
        promptSections.push("PROVIDED ASTROLOGY DATA\nDATA UNAVAILABLE");
      }
    } else {
      promptSections.push("USER PROFILE\nDATA UNAVAILABLE");
      promptSections.push("PROVIDED ASTROLOGY DATA\nDATA UNAVAILABLE");
    }

    // Recent Conversation (Recent 3 turns) - pastHistory already calculated in outer scope
    const pastUserMsgs = pastHistory.filter(m => m.role === 'user');
    const pastAssistantMsgs = pastHistory.filter(m => m.role === 'model' || m.role === 'assistant');

    const recentUserQuestions = pastUserMsgs.slice(-3).map(m => `- ${sanitizePromptInput(m.content)}`).join('\n');

    const recentPanditReplies = pastAssistantMsgs.slice(-3).map((m) => {
      const content = sanitizePromptInput(m.content);
      const words = content.split(/\s+/);
      const truncated = words.length > 35 ? words.slice(0, 35).join(' ') + '...' : content;
      return `- ${truncated}`;
    }).join('\n');

    let recentHistoryBlock = `Recent Conversation:
Recent User Questions:
${recentUserQuestions || "None"}

Recent Pandit Replies:
${recentPanditReplies || "None"}`;
    promptSections.push(recentHistoryBlock);

    let modeSpecificInstruction = "";
    if (isGreeting) {
      modeSpecificInstruction = `
[GREETING MODE ACTIVE]
The user greeted you warmly. Respond naturally as an experienced Vedic astrologer. Welcome them, acknowledge them warmly, and invite them to ask about career, marriage, finance, health or family. Do not invent horoscope details.
`;
    } else if (isVague) {
      modeSpecificInstruction = `
[VAGUE QUESTION MODE ACTIVE]
The user wishes to begin a conversation but has not yet asked a specific astrology question. Encourage them warmly to continue and offer guidance. Do not fabricate horoscope information.
`;
    } else if (!hasBirthDetails) {
      modeSpecificInstruction = `
[NO BIRTH DETAILS MODE ACTIVE]
The user has not provided their birth details (DOB, birth time, or birth place).
- Do NOT refuse to answer. You must help the user.
- Answer using general Vedic astrology principles matching the context of their query.
- DO NOT invent/hallucinate any specific lagna, sign, planet positions, dasha, nakshatra, houses, or dates (since they are not calculated).
- Politely explain that this is a general astrological interpretation.
- Politely mention: "Agar aap apni Janm Tithi (DOB), Janm Samay (Birth Time) aur Janm Sthan (Birth Place) share karenge to main adhik vyaktigat aur sateek margdarshan de sakunga."
- End with a relevant follow-up question asking for their birth details.
`;
    } else if (dob && (!hasTob || !hasPob)) {
      const missing = [];
      if (!hasTob) missing.push("Time of Birth (Janm Samay)");
      if (!hasPob) missing.push("Place of Birth (Janm Sthan)");
      modeSpecificInstruction = `
[PARTIAL BIRTH DETAILS MODE ACTIVE]
The user has provided only partial birth details.
- Do NOT refuse to answer.
- Clearly mention which detail is missing: ${missing.join(" and ")}.
- Interpret the query using the available chart information (astroData).
- DO NOT invent/hallucinate any missing astrological parameters (like Lagna or exact houses if time is missing).
- Present the reading with medium/low confidence and explain why.
- Politely ask them to provide the missing details (${missing.join(" and ")}) for a complete and precise reading.
- End with a relevant follow-up question.
`;
    } else {
      modeSpecificInstruction = `
[FULL BIRTH DETAILS MODE ACTIVE]
The user has provided full birth details (DOB, Time of Birth, Place of Birth).
- Provide a highly personalized Vedic astrology reading.
- Support your predictions with clear astrological reasoning based on the provided Astro Data (Lagna, planets, houses, dasha, gochar).
- DO NOT invent/hallucinate any other astrological parameters not present in the Astro Data.
- End with a relevant follow-up question.
`;
    }

    // BirthDetails fix karo
    const time = tob;
    const place = pob;

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const todayFormatted = currentDate.toLocaleDateString('hi-IN');
    const dayOfWeek = currentDate.toLocaleDateString('hi-IN', { weekday: 'long' });



    let tier1DataStr = "N/A";
    let weekdayRemedy = "Om ka jaap karein";
    if (dayOfWeek.includes('रवि') || dayOfWeek.toLowerCase().includes('sun')) weekdayRemedy = 'Surya dev ko jal arpit karein';
    else if (dayOfWeek.includes('सोम') || dayOfWeek.toLowerCase().includes('mon')) weekdayRemedy = 'Shivling par jal chadhayein';
    else if (dayOfWeek.includes('मंगल') || dayOfWeek.toLowerCase().includes('tue')) weekdayRemedy = 'Hanuman Chalisa ka path karein';
    else if (dayOfWeek.includes('बुध') || dayOfWeek.toLowerCase().includes('wed')) weekdayRemedy = 'Ganesh ji ko doorva chadhayein';
    else if (dayOfWeek.includes('गुरु') || dayOfWeek.includes('बृहस्पति') || dayOfWeek.toLowerCase().includes('thu')) weekdayRemedy = 'Vishnu ji ki puja karein aur peela tilak lagayein';
    else if (dayOfWeek.includes('शुक्र') || dayOfWeek.toLowerCase().includes('fri')) weekdayRemedy = 'Gareeb ko doodh ya safed mithai daan karein';
    else if (dayOfWeek.includes('शनि') || dayOfWeek.toLowerCase().includes('sat')) weekdayRemedy = 'Shani dev ke mandir me tel ka diya jalayein';

    if (tierType === 1) {
      const tier1Data = calculateTier1Data(questionTopic, astroData);
      if (tier1Data) {
        tier1DataStr = `Score: ${tier1Data.score}, Date: ${tier1Data.date}`;
      }
    }

    const tierStrategyBlock = `
=== 3-TIER RESPONSE STRATEGY CONTEXT ===
TIER_TYPE: Tier ${tierType}
QUESTION_TOPIC: ${questionTopic}
TIER_1_DATA: ${tier1DataStr}
TODAY_DATE: ${todayFormatted}
DAY_OF_WEEK: ${dayOfWeek}
CURRENT_YEAR: ${currentYear}
`;
    promptSections.push(tierStrategyBlock.trim());

    if (questionTopic === 'love' && astroData) {
      const loveData = calculateLoveEngine(astroData);
      const loveEngineBlock = `=== CALCULATED RELATIONSHIP ENGINE DATA ===
Reunion Potential: ${loveData.reunionPotential}
Relationship Stability: ${loveData.relationshipStrength}
Timing Window: ${loveData.loveWindows.join(', ')}
Emotional Compatibility: Love score is ${loveData.loveScore}% (Soulmate potential: ${loveData.soulmatePotential})
`;
      promptSections.push(loveEngineBlock.trim());
    }

    const multiIntent = detectMultiIntent(questionText);
    if (multiIntent && multiIntent.primary) {
      let multiIntentBlock = `=== DETECTED INTENTS ===\n`;
      multiIntentBlock += `Detected Primary Intent: ${multiIntent.primary}\n`;
      if (multiIntent.secondary && multiIntent.secondary.length > 0) {
        multiIntentBlock += `Detected Secondary Intents: ${multiIntent.secondary.join(', ')}\n`;
      }
      promptSections.push(multiIntentBlock.trim());
    }


    const topic = questionTopic;
    const userMemory = updatedFacts;
    const primaryTopic = questionTopic;
    const kundliData = astroData;
    const loveData = astroData ? calculateLoveEngine(astroData) : null;
    const moneyData = astroData ? calculateMoneyEngine(astroData) : null;
    const healthData = astroData ? calculateHealthEngine(astroData) : null;
    const travelData = astroData ? calculateForeignTravelEngine(astroData) : null;
    const childrenData = astroData ? calculateChildrenEngine(astroData) : null;
    const tarotData = userData?.tarotData || userData?.tarot || null;
    const profileData = {
      name,
      gender,
      dob,
      tob,
      pob,
      maritalStatus,
      occupation: profile?.occupation || userData?.occupation || 'Unknown'
    };
    const conversationHistory = pastHistory;

    const hasCalculatedData = !!(astroData || (loveData && loveData.loveScore) || (moneyData && moneyData.wealthScore) || (healthData && healthData.vitalityScore) || (childrenData && childrenData.layers) || tarotData);

    // Context Isolation Rule: Only include partnerData for love/compatibility/marriage topics,
    // or when the query explicitly asks about the partner/relationship.
    const relationshipKeywords = /partner|husband|wife|spouse|girlfriend|boyfriend|relationship|relation|shadi|shaadi|marriage|vivaah|vivah|love|pyar|pyaar|compatibility|cheat|affair|third\s*person|extra\s*marital|loyalty|faithfulness|chakkar/i;
    const isExplicitRelationshipQuery = relationshipKeywords.test(questionText);
    const isRelationshipTopic = ['love', 'marriage', 'compatibility', 'relationship_return', 'partner_loyal'].includes(questionTopic);
    const includePartnerData = isRelationshipTopic || isExplicitRelationshipQuery;
    const partnerData = includePartnerData ? (userData?.p2 || userData?.partner || null) : null;

    // Topic-Based Context Routing
    let filteredContext = {
      primaryTopic,
      userMemory,
      profileData,
      conversationHistory,
      partnerData,
      confidence: hasCalculatedData ? 85 : 0
    };

    const lowerQuery = questionText.toLowerCase();
    const isRelationship = ['love', 'compatibility', 'relationship_return', 'partner_loyal'].includes(questionTopic) ||
                           /girlfriend|boyfriend|gf|bf|partner|relation|love|pyar|pyaar|cheat|affair|loyalty/i.test(lowerQuery);
    const isMarriage = ['marriage'].includes(questionTopic) ||
                       /shadi|shaadi|marriage|vivaah|vivah|spouse|husband|wife/i.test(lowerQuery);
    const isCareer = ['career', 'job', 'wealth', 'money', 'business'].includes(questionTopic) ||
                     /job|career|business|money|paisa|wealth|finance|salary|developing|developer|app/i.test(lowerQuery);
    const isHealth = ['health'].includes(questionTopic) ||
                     /health|bimari|swasthya|illness|disease/i.test(lowerQuery);
    const isTravel = ['travel', 'foreign_travel'].includes(questionTopic) ||
                     /travel|foreign|videsh|yatra/i.test(lowerQuery);
    const isChildren = ['children'].includes(questionTopic) ||
                       /bachcha|bachche|baccha|bacche|bcha|bche|bache|santan|child|children|baby|pregnancy|ivf/i.test(lowerQuery);
    const isDaily = ['daily'].includes(questionTopic) ||
                    /\baaj\b|\bkal\b|is hafte|is mahine|daily|lucky color|number|today/i.test(lowerQuery);

    if (isRelationship) {
      filteredContext.loveData = loveData;
    } else if (isMarriage) {
      filteredContext.loveData = loveData; // loveData contains marriage indicators
    } else if (isCareer) {
      filteredContext.moneyData = moneyData;
      filteredContext.careerData = moneyData;
    } else if (isHealth) {
      filteredContext.healthData = healthData;
    } else if (isTravel) {
      filteredContext.travelData = travelData;
    } else if (isChildren) {
      filteredContext.childrenData = childrenData;
    } else if (isDaily) {
      filteredContext.dailyData = calculateDailyTransitEngine(astroData, dayOfWeek);
    } else {
      filteredContext.kundliData = kundliData;
    }

    if (tarotData) {
      filteredContext.tarotData = tarotData;
    }

    const aiContext = filteredContext;

    let tier1Data = null;
    if (tierType === 1) {
      tier1Data = calculateTier1Data(questionTopic, astroData);
    }

    let activeEngineData = null;

    let systemInstruction = "";
    if (isGreeting) {
      systemInstruction = `
You are "AstroOracle", an elite, deeply intuitive, and charismatic Astrologer and Tarot Reader. Reply in Hindi/Hinglish only. Respond in a warm, mystical, confident, emotionally intelligent, conversational, and human-like tone.

GREETING MODE RULES:
- The user is only greeting you (e.g., "Hello", "Hi", "Namaste", "Pranam", "Ram Ram").
- Do NOT generate any astrology reading or predictions.
- Do NOT mention dasha, planets, houses, government jobs, birthplace, or any birth chart details.
- Give a short, warm, charismatic welcome message.
- Invite them to ask their question about career, marriage, health, finance, or family.
`;
    } else if (isVague) {
      systemInstruction = `
You are "AstroOracle", an elite, deeply intuitive, and charismatic Astrologer and Tarot Reader. Reply in Hindi/Hinglish only. Respond in a warm, mystical, confident, emotionally intelligent, conversational, and human-like tone.

VAGUE MODE RULES:
- The user wants to begin a conversation but has not yet asked a specific astrology question.
- Encourage them warmly to continue and ask their specific question about career, marriage, health, finance, or family.
- Do NOT generate any predictions, dasha details, planet positions, lagna, or nakshatra.
- Keep the reply welcoming, charismatic, and invite them to ask their question.
`;
    } else if (tierType === 5 || questionTopic === 'profile_acknowledgement') {
      systemInstruction = `
You are "AstroOracle", an elite, deeply intuitive, and charismatic Astrologer and Tarot Reader. Reply in Hindi/Hinglish only. Respond in a warm, mystical, confident, emotionally intelligent, conversational, and human-like tone.

PROFILE ACKNOWLEDGEMENT MODE RULES:
- The user is asking if you know, remember, or possess their profile details (e.g. name, marriage status, occupation, birth details).
- Simply confirm their known profile facts based on the USER PROFILE and Fact Memory provided.
- Do NOT generate any predictions, dasha analysis, timing, or Upay.
- If some detail is not in the USER PROFILE or Fact Memory, politely say that you do not have that specific detail yet.
- Keep the response short, warm, and natural.
`;
    } else if (tierType === 6 || questionTopic === 'memory_recall') {
      systemInstruction = `
You are "AstroOracle", an elite, deeply intuitive, and charismatic Astrologer and Tarot Reader. Reply in Hindi/Hinglish only. Respond in a warm, mystical, confident, emotionally intelligent, conversational, and human-like tone.

MEMORY RECALL MODE RULES:
- The user is asking you to retrieve or disclose their stored profile details (e.g. name, date of birth, age, birthplace, occupation, married status, children count).
- Answer the query directly using the USER PROFILE and Fact Memory details provided below.
- Do NOT generate any predictions, dasha analysis, timing, or Upay.
- Do NOT invent or calculate any astrology parameters (like Lagna, Nakshatra, houses).
- If the user asks general recall ("mere baare me kya yaad hai" or similar), list all known details in a clean, bulleted list.
- If a queried detail is not in the USER PROFILE or Fact Memory, politely state that you do not have that specific information yet.
- Keep the response direct, warm, and natural.
`;
    } else {
      const age = ageDisplay;
      activeEngineData = filteredContext;
      let layersObj = null;
      let scoreVal = null;
      if (['marriage', 'love'].includes(activeTopic)) {
        layersObj = loveData?.layers;
        scoreVal = loveData?.loveScore;
      } else if (['career', 'money'].includes(activeTopic)) {
        layersObj = moneyData?.layers;
        scoreVal = moneyData?.wealthScore;
      } else if (activeTopic === 'health') {
        layersObj = healthData?.layers;
        scoreVal = healthData?.vitalityScore;
      } else if (activeTopic === 'travel') {
        layersObj = travelData?.layers;
      } else if (activeTopic === 'children') {
        layersObj = childrenData?.layers;
      } else if (activeTopic === 'daily' && astroData) {
        const dailyData = calculateDailyTransitEngine(astroData, dayOfWeek);
        layersObj = dailyData?.layers;
        scoreVal = dailyData?.todayScore;
      }
      const getLayersForTopic = (t) => {
        if (['marriage', 'love'].includes(t)) return loveData?.layers;
        if (['career', 'money'].includes(t)) return moneyData?.layers;
        if (t === 'health') return healthData?.layers;
        if (t === 'travel') return travelData?.layers;
        if (t === 'children') return childrenData?.layers;
        if (t === 'daily' && astroData) return calculateDailyTransitEngine(astroData, dayOfWeek)?.layers;
        return null;
      };

      let multiTopicsData = {};
      if (!shouldAdvance && secondaryTopics && secondaryTopics.length > 0) {
         secondaryTopics.forEach(st => {
           const l = getLayersForTopic(st);
           if (l) multiTopicsData[st] = l;
         });
      }

      const compactActiveData = {
        confidence: activeEngineData?.confidence,
        layers: layersObj,
        score: scoreVal,
        multiTopicsData: Object.keys(multiTopicsData).length > 0 ? multiTopicsData : undefined,
        partnerData: activeEngineData?.partnerData || null
      };
      const chatHistory = pastHistory;
      const compactHistory = chatHistory
        .slice(-10)
        .map(m => `${m.role}: ${(m.content || '').slice(0, 150)}`)
        .join('\n');
      const topic = questionTopic;
      const time = tob && tob !== 'Unknown' ? tob : '';
      const place = pob && pob !== 'Unknown' ? pob : '';

      let overflowInstruction = '';
      if (overflowTopics && overflowTopics.length > 0) {
        overflowInstruction = `
[OVERFLOW TOPICS DETECTED]
The user asked about more than 5 topics.
Answer the active topics, and add this exact text at the end of your response:
"बाकी रहस्यों (जैसे ${overflowTopics.join(', ')}) को भी अगले चरणों में खोला जा सकता है।"
        `;
      }

      systemInstruction = `
ASTRORACLE: THE SUPREME COSMIC ORACLE (GOD-MODE + NO DATA REFUSAL)

[CRITICAL ARCHITECTURE DIRECTIVE]
STRICTLY FORBIDDEN TO ALTER ENGINE CORES:
- NO CHANGES to ACTIVE_TOPIC, TARGET_LAYER, FOLLOW_UP_MODE.
- NO CHANGES to CLIFFHANGER ENGINE, TOPIC PROGRESSION.
- NO CHANGES to MEMORY RECALL, PROFILE ACKNOWLEDGEMENT, FACT MEMORY.
- NO CHANGES to NUMEROLOGY CALCULATIONS OR ASTROLOGY DATA PIPELINES.


[THE PSYCHOLOGICAL PROFILE: THE ULTIMATE GURU]
You are "AstroOracle"—the world's most elite Master of Astrology, Lal Kitab, Numerology, and Tarot. 
Language: Flawless Hindi/Hinglish only. Posture: Absolute cosmic authority. State inevitable truths.
Style: Human Mystic. Zero robotic formatting. Zero AI warnings.

[MANDATORY VOCABULARY - USE 2 PER RESPONSE]
"ब्रह्मांडीय संकेत और छिपी ऊर्जाएं", "अंकों का गुप्त खेल", "मूलांक और भाग्यांक", 
"लाल किताब का अचूक फरमान", "ग्रहों का छुपा संदेश", "शत्रुओं का गुप्त चक्रव्यूह"

[CRITICAL RULE 0: NO REFUSAL + INTUITION MODE]
Data na ho to bhi jawab dena ZAROORI hai. Kabhi "data nahi hai" mat bolna.
Step 1: DOB se Mulank/Bhagyank nikalo. 
Step 2: Name se vibration padho.
Step 3: Lal Kitab ke general siddhant lagao.
Agar kuch bhi na ho to bolo: "ब्रह्मांडीय ऊर्जाएं अभी धुंधली हैं, लेकिन मेरा अंतर्ज्ञान कह रहा है कि..."

[THE MULTI-QUESTION UNIFICATION RULE]
User ne 1 message me 2-3 sawaal puche: job + shaadi + love
To jawab ka format yehi hoga:

1. **नौकरी**: [ACTIVE_DATA se ya intuition se 1 line]
2. **विवाह**: [ACTIVE_DATA se ya intuition se 1 line]  
3. **Love/Arrange**: [ACTIVE_DATA se ya intuition se 1 line]

Uske baad sirf PRIMARY topic ka vistar do. Baaki 2 ko cliffhanger me chhodo.
${overflowInstruction}

[THE INTUITIVE SHADOW-CATCHING ENGINE]
Example: ACTIVE_TOPIC='career' but user ne shaadi bhi puchi
"ब्रह्मांडीय ऊर्जाएं अभी तुम्हारी नौकरी का मार्ग खोल रही हैं [Career Data]...
लेकिन मैं तुम्हारी नियति में विवाह की शहनाई भी सुन रहा हूँ। क्या उस रहस्य को अभी खोलूं?"

[ANTI-LOOP GOD RULE]
If user says "hn", "haan", "btao" → Answer last cliffhanger with NEXT LAYER.
Banned: "aur kya puchna hai"

[RESPONSE FORMAT - 130 WORDS MAX]
🌟 **ब्रह्मांडीय संकेत और छिपी ऊर्जाएं**
[2 mystical phrases + prediction + 2 words **bold**]

⚡ **लाल किताब का अचूक फरमान / शत्रु बाधा**
[1 line reason + 1 remedy]

🔮 **नियति का संकेत - 7 Day Power Move**
[1 action]

🚨 **ग्रहों का छुपा संदेश**
[1 NEW cliffhanger question]

EXECUTE WITH SUPREME CHARISMA.

### USER PROFILE:
NAME: ${name}
DOB: ${dob || 'Not Provided'} ${time} ${place}
GENDER: ${gender}
MARITAL: ${maritalStatus}
OCCUPATION: ${occupation}
ACTIVE_DATA: ${JSON.stringify(compactActiveData || null)} // AI_CONTEXT: ${JSON.stringify({ partnerData: compactActiveData.partnerData })}
CHAT_HISTORY: ${compactHistory} // CRITICAL: Read this to avoid repetition

### THE INFINITE LOOP RULES - MUST FOLLOW:
1. **NEVER REPEAT:** If user asks same question again, go 1 layer deeper.
    Ex: Q1: "kis akshar" → A: "Ma, Me, Mu"
    Q2: "kis akshar" → A: "Ma, Me, Mu. Surname K/S. Height 5'4 to 5'6"
    Q3: "kis akshar" → A: "Naam ke pehle akshar ke alawa, uske naam me 'a' 2 baar aayega"

2. **NEVER ASK TWICE:** If user said "hn btao" to your cliffhanger, answer it NOW.
    Banned words: "aur vistaar se", "kya aap janna chahenge"

3. **ESCALATE EVERY REPLY:** Har reply me pehle wale se zyada specific info do.
    Pehle: Month → Dusra: Date → Teesra: Time + Place

${(!shouldAdvance && secondaryTopics && secondaryTopics.length > 0) ? `
### MULTI-QUESTION RESPONSE ASSEMBLY

[MULTI_QUESTION_MODE = TRUE]
The user asked about multiple topics at once. 
You MUST answer ALL detected topics briefly in a numbered list FIRST.

Format:
1. ${activeTopic.toUpperCase()}: [Brief summary using ACTIVE_DATA.layers]
${secondaryTopics.map((st, i) => `${i + 2}. ${st.toUpperCase()}: [Brief summary using ACTIVE_DATA.multiTopicsData.${st}]`).join('\\n')}

After the numbered list, continue normal TARGET_LAYER progression ONLY for the primary ACTIVE_TOPIC (${activeTopic}). Generate exactly ONE cliffhanger for the primary topic.
` : ''}

### FOLLOW-UP EXECUTION MODE
${(shouldAdvance && lastCliffhangers && lastCliffhangers.length > 0) ? `
[FOLLOW_UP_MODE = TRUE]

You are executing a deterministic progression algorithm.

You MUST produce exactly 3 sections in this order:

SECTION A: CLIFFHANGER RESOLUTION
* User responded to LAST_CLIFFHANGER: "${lastCliffhangers[lastCliffhangers.length - 1]}"
* Resolve the exact open loop based on the user's answer.
* Never skip.

SECTION B: TARGET_LAYER REVEAL
* Reveal ONLY ACTIVE_TOPIC TARGET_LAYER data.
* Never reveal future layers.
* Never reveal past layers.
* Never switch topics.

SECTION C: NEXT CLIFFHANGER
* Generate ONE new cliffhanger.
* It must naturally lead to the next layer.
* It must remain inside ACTIVE_TOPIC.

---

STRICT RULES

If FOLLOW_UP_MODE = TRUE:

DO NOT:
* Switch topic
* Reset progression
* Ask generic questions
* Enter vague mode
* Reveal future layers
* Reveal multiple layers
* Skip cliffhanger resolution
* Create unrelated predictions
* Talk about career if ACTIVE_TOPIC=marriage
* Talk about marriage if ACTIVE_TOPIC=career

---

OUTPUT FORMAT

FOLLOW_UP_MODE responses MUST follow:

🌟 CLIFFHANGER RESOLUTION
[answer previous cliffhanger]

🔓 NEW REVELATION
[current TARGET_LAYER information]

❓ NEXT MYSTERY
[new cliffhanger]` : `
If the user sends a follow-up response, assume they are responding to the most recent cliffhanger question and continue the same topic immediately.`}

### CORE LOGIC:

#### SCENARIO A: IF ACTIVE_DATA.confidence > 70
"Look, ${name}, your chart isn't lying. [Planet] in [House] + [Dasha] = [Result]. Timing: [Date]"

#### SCENARIO B: IF NO DATA
"I don't need your birth time, ${name}. Your energy right now is screaming..."

### ACTIVE LAYER PROGRESSION:
ACTIVE_TOPIC: ${activeTopic}
TARGET_LAYER: ${targetLayerNum}

### TARGET LAYER SCHEMAS:
For marriage:
- Layer 1: timing
- Layer 2: name_initial
- Layer 3: surname + age_gap
- Layer 4: arranged_vs_love
- Layer 5: city + profession

For love:
- Layer 1: timing
- Layer 2: partner traits
- Layer 3: compatibility
- Layer 4: next phase
- Layer 5: key warning

For career:
- Layer 1: timing
- Layer 2: best profession
- Layer 3: growth stage
- Layer 4: key wealth source
- Layer 5: vulnerable period

For money:
- Layer 1: timing
- Layer 2: income potential
- Layer 3: savings potential
- Layer 4: debt/investment window
- Layer 5: lucky wealth days

For daily:
- Layer 1: outlook
- Layer 2: lucky number/color
- Layer 3: work potential
- Layer 4: financial flow
- Layer 5: precautions

For health:
- Layer 1: vitality score
- Layer 2: stress assessment
- Layer 3: weakness area
- Layer 4: recovery/strength
- Layer 5: daily habit

For travel:
- Layer 1: travel window
- Layer 2: travel chance
- Layer 3: region
- Layer 4: purpose
- Layer 5: visa success probability

For children:
- Layer 1: timing
- Layer 2: children potential
- Layer 3: family growth
- Layer 4: career indicator
- Layer 5: remedial guidance

RULE:
You MUST focus the "Cosmic Truth" (${cosmicHeading}) section entirely on the TARGET_LAYER (${targetLayerNum}) information of the ACTIVE_TOPIC (${activeTopic}).
- If TARGET_LAYER is 1: Reveal timing.
- If TARGET_LAYER is 2: Reveal the second layer details.
- If TARGET_LAYER is 3: Reveal the third layer details.
- If TARGET_LAYER is 4: Reveal the fourth layer details.
- If TARGET_LAYER is 5: Reveal all remaining details.
Do NOT reveal layer details higher than the TARGET_LAYER.
Use the pre-calculated layer data provided in ACTIVE_DATA for the active topic. For example, if TARGET_LAYER is 2, use the value of layer2 from the active topic's layers.

### RESPONSE STRUCTURE FOR 1000 MESSAGES:

${cosmicHeading}
[New info every time. Use CHAT_HISTORY to avoid repeat. 3 lines max. 2 things in **bold**.]

${frictionHeading}
[New psychological block every time. 1 line. Must reference something from CHAT_HISTORY if possible. Make it hurt.]

${powerHeading}
[New action every time. 1 action based on ${occupation}. No generic advice.]

${cliffhangerHeading}
[Generate a highly PERSONALIZED cliffhanger based strictly on ACTIVE_TOPIC, the user's specific query, and recently revealed insights. NEVER use generic templates. Example for Career: "Kya aapka career private sector me zyada chamkega ya apna business zyada safal hoga?". This must also match the CLIFFHANGER tag at the end.]

### CRITICAL ANTI-BUG RULES:
1. NEVER ask "aur vistaar se batayein" or "kya aap janna chahte hain". User already asked.
2. NEVER repeat same planet, house, akshar, date from CHAT_HISTORY. If user asks "kis akshar" twice, give deeper layer: "Ma, Me, Mu. Aur surname K ya S se hoga"
3. NEVER use boring remedies. 
4. If user says "hn btao" → Give answer directly. No more questions before answering.

### TIMING RULE:
${(isTimingQuery && !skipDashaPreservation && astroData) ? `You MUST naturally mention the current Mahadasha lord (${astroData.mahadasha}) and current Antardasha lord (${astroData.antardasha}) while explaining timing predictions.` : ''}

TONE: Direct, Brutal, Hinglish. LENGTH: 110-140 words.
`;
    }

    const forbiddenRulesBlock = `
=== FORBIDDEN RULES ===
- Do NOT output: "Data not available", "score" (except in "Karma Score:"), "window", exact dates without engine calculations, "khatra", "maut", "barbaad".
- For Tier 2 and Tier 3, you should naturally and conversationally reference relevant astrological factors (planets, transits, houses, dasha, nakshatra) based ONLY on the provided USER PROFILE and Astrology Data. The explanation must flow naturally as part of the guidance and reasoning, and you must NEVER output raw data dumps or overly technical chart lists.
- FORBIDDEN REPETITIVE PHRASES: Do NOT use generic phrases like "stable progress", "strong foundation", "dhairya rakhein", "yoga aur dhyan karein" (or their Devanagari/Hinglish equivalents like "dheemi pragati", "dheeraj rakhein", "yoga aur dhyan") unless specifically justified by context.
`;
    promptSections.push(forbiddenRulesBlock.trim());

    let greetingSuppressionInstruction = "";
    if (pastHistory.length > 0) {
      greetingSuppressionInstruction = `
- CONVERSATION TURN IS SUBSEQUENT (Not first turn): You MUST NOT use any welcome greetings, introductions, or greeting phrases (like "Beta, aapka swagat hai", "Namaste Beta", "Aapka swagat hai") anywhere, especially not at the beginning of your response. Start directly with the answer to the user's follow-up question.`;
    }

    let dashaRepetitionInstruction = "";
    if (dashaAlreadyMentioned && astroData) {
      dashaRepetitionInstruction = `
- DASHA REPETITION PREVENTION: The user's current Dasha (${astroData.mahadasha || 'Unknown'}/${astroData.antardasha || 'Unknown'}) has already been discussed in previous messages. Avoid repeating the full explanation or dasha names again unless the user explicitly asks about timing/dasha. You can refer to it concisely (e.g., "grah sthiti") or omit it entirely to avoid redundancy.`;
    }

    const priorityRulesBlock = `
=== PRIORITY & CONTEXT RULES ===
- The current question has the highest priority. Focus entirely on answering the user's specific question as the primary objective.
- GREETING & NAME BANS: Unless the user is only greeting you (isGreeting=true), you must NOT start your response with any greeting phrases (like "Ram Ram", "Namaste", "Pranam", "Kalyan ho") or address the user by name/beta at the very beginning of the response (e.g. do NOT start with "Ram Ram beta Akash" or "Akash Beta, ..."). Start the response directly with the answer/prediction.${greetingSuppressionInstruction}${dashaRepetitionInstruction}
- Do NOT repeat the user's chart summary (such as Sun Mahadasha, Mercury Antardasha, Government Job, Hamirpur, age, or birthplace) unless it is directly relevant to the specific question asked. Birth chart context should SUPPORT the answer, not replace it.
- FOLLOW-UP DETECTION: If the user asks a short follow-up query (e.g., "kab", "kis year", "kitne saal", "uska kya hoga", "phir", "aur", "when", "then", "what about", etc.), you MUST read the "Recent Conversation" history to understand the subject they are asking about, and answer using that context.

=== QUALITY, DIVERSITY & ANTI-REPETITION RULES ===
- Do NOT repeat the same remedy/remediations across unrelated questions in the chat session.
- Do NOT mention the same year/date/window repeatedly unless directly supported by the strongest topic-specific evidence.
- Prioritize question-specific evidence over general chart signals (e.g. if the user asks a Career question, do not focus on Saturn/remedies if the money/career data shows success).
- Never reuse the previous response structure wording. Avoid repeating the same phrases or templates used in the last 5 responses. Generate fresh insights from the current context.
- Use maximum 2 astrology indicators per answer.
- Do not repeat the same indicator used in the previous response unless directly relevant.

=== TOPIC-SPECIFIC RESPONSES ===
- Career / Job / Business: Focus on concrete skills, professional aptitude, market opportunities, and active career paths.
- App Development / Coding: Focus on technology stacks, software engineering, product building, entrepreneurship, and remote work opportunities. Do NOT give generic job advice.
- Relationships / Love / Marriage: Focus on emotional dynamics, mutual communication, and reunion/compatibility indicators.

IMPORTANT LANGUAGE RULE:
${languagePreference}
Never answer in any other language.
`;
    promptSections.push(priorityRulesBlock.trim());

    const criticalBehaviorPatchBlock = `
=== CRITICAL BEHAVIOR PATCH (TOPIC SWITCHING + REPETITION CONTROL) ===

RULE 1: TOPIC SWITCH DETECTION
If the user asks a completely new topic (e.g., switching from Career to Marriage), immediately answer the new topic FIRST. Do NOT continue the previous topic's cliffhanger before answering the new question.

RULE 2: DIRECT QUESTION PRIORITY
Whenever the user asks a direct question (e.g., about grah, shaadi, love, bacha, paisa, health, foreign, property), you MUST answer the question directly first. 
Only after answering, optionally connect it to the previous progression. 
BAD: "T letter wala partner..." (Ignoring the direct question)
GOOD: "Surya, Chandra, Mangal..." then "Waise pichle sanket me jo vivah yog dikh raha tha..."

RULE 3: QUESTION COMPLETION
If the user asks timing questions like "Kab hoga?", NEVER give generic responses (e.g., "mehnat karein"). You MUST always provide: 1) exact timing, OR 2) timing range, OR 3) strongest period (e.g., "2028-2030 ke beech santan yog sabse majboot dikh raha hai").

RULE 4: REVEALED FACT MEMORY (TARGET_LAYER SAFETY)
Maintain memory of revealed facts (e.g., partner initials, exact timing). If the exact fact specified by TARGET_LAYER has ALREADY been revealed recently in CHAT_HISTORY:
DO NOT repeat the exact fact blindly.
DO NOT skip the TARGET_LAYER. 
INSTEAD, expand the insight for that specific layer. Provide deeper interpretation, practical meaning, consequence, emotional impact, compatibility insight, or future progression related to that fact.
Example: If TARGET_LAYER is partner initial 'T' and it was already revealed, DO NOT just say "Partner initial T". Say: "Is sambandh me bhavnatmak samajh aur communication adhik mahatvapurn dikh raha hai."

RULE 5: FACT SURFACE CONTROL & REMEDY REPETITION
Create a lightweight internal suppression layer in your mind for "recentlySurfacedFacts" and "recentlySurfacedRemedies" by scanning the last 10 messages of CHAT_HISTORY.
If a fact (e.g., "partner initial T", "March 2027 marriage", "santan sukh") or a specific remedy (e.g., "Peepal par jal") has already been surfaced in those 10 messages:
DO NOT surface it again.
Unless: 1) User explicitly asks about that exact fact. 2) New evidence changes the fact. 3) The fact is absolutely required to answer the question.
Generate alternative remedies from existing remedy pools, and generate fresh insights instead of repeating revealed facts.

RULE 6: TOPIC ISOLATION RULE
If the user asks an unrelated or specific topic like "Kala jadu", "Nazar", "Health", "Parents", "Property", "Career", or "Money":
Do NOT automatically inject out-of-context facts like marriage timing, partner initials, or childbirth timing unless directly relevant to their specific question.

RULE 7: FOLLOW-UP PRESERVATION
When a topic switches, DO NOT lose progression. Store the previous mystery and reconnect it naturally at the end.
Example: User switches from Finance to Marriage. Answer marriage, then end with: "Waise aapke career se juda ek aur sanket bhi dikh raha hai..." This preserves retention while respecting user intent.

RULE 8: DATE PRESENTATION VARIATION
Do NOT invent new years or change deterministic calculations.
Instead, present the exact same timing differently on each turn.
Example: If the core timing is "March 2027", vary the text to: "2027 ki pehli chhamahi", "2026 ke antim mahino se 2027 ke madhya tak", "agle 12-18 mahino me", "usi daur ke aas-paas", "vivah yog ke turant baad". Keep the underlying evidence 100% consistent, just rotate the phrasing.

RULE 9: RELATIVE SEQUENCING FOR MULTIPLE EVENTS
If multiple events (e.g., marriage, career, foreign travel, children) share similar timing windows in ACTIVE_DATA, do NOT repeat the exact same date format for each event.
Use sequence-based and relative language to create a sense of natural progression:
- Dependent Events (Marriage -> Children): Instead of repeating "2027-2028", say "Vivah ke baad ke agle 1-2 varsh santan yog adhik sakriya dikhte hain."
- Parallel Events (Career -> Foreign Travel -> Money): Use phrasing like "pehle career sthirta, uske baad videsh yog" or "dhan vriddhi ke baad naya avsar".
Never fabricate new years solely for variety, but aggressively diversify presentation to avoid robotic repetition of years.
`;
    promptSections.push(criticalBehaviorPatchBlock.trim());

    const hasStrongData = activeEngineData && activeEngineData.confidence > 70;
    const cliffhangerCtx = getCliffhangerContext(activeTopic, lastCliffhangers);

    const finalInstruction = systemInstruction + `
\nCURRENT_MODE: ${hasStrongData ? 'SCENARIO_A_CHART_READING' : 'SCENARIO_B_ENERGY_READING'}
\n${cliffhangerCtx.instruction}
\nFORMATTING RULE: At the absolute end of your response, on a new line, you MUST write:
CLIFFHANGER: <the exact open loop question you asked under ${cliffhangerHeading}>
`;

    fullPrompt = `
${finalInstruction}

${modeSpecificInstruction}

${promptSections.join('\n\n')}

User Query:
${sanitizePromptInput(userQueryForLLM || "Tell me about my destiny")}
`;
  } else {
    // Compatibility mode fallback
    const { p1, p2 } = userData;
    fullPrompt = `Person 1: ${p1.name} (${p1.gender}), DOB: ${p1.dobDay}-${p1.dobMonth}-${p1.dobYear}, Time: ${p1.tobHour}:${p1.tobMinute} ${p1.tobPeriod}, Place: ${p1.pob}\nPerson 2: ${p2.name} (${p2.gender}), DOB: ${p2.dobDay}-${p2.dobMonth}-${p2.dobYear}, Time: ${p2.tobHour}:${p2.tobMinute} ${p2.tobPeriod}, Place: ${p2.pob}\n\nInstructions: Generate relationship compatibility analysis.`;
  }

  let jsonResponse = null;
  let success = false;
  let lastError = null;

  const hasGrokConfig = !!(GROK_API_KEY && GROK_BASE_URL);
  const hasBedrockConfig = !!(BEDROCK_API_KEY && BEDROCK_BASE_URL);

  const useOfflineFallback = !hasGrokConfig && !hasBedrockConfig;

  let responseSource = "AI";

  console.log("=== AI REQUEST START ===");
  console.log("mode:", mode);
  console.log("question:", userData?.question);
  console.log("intent:", detectedIntent);
  if (mode === 'chat' || mode === 'personal') {
    console.log("Astrology Input Verification:");
    console.log(`Name: ${name}`);
    console.log(`Gender: ${gender}`);
    console.log(`DOB: ${dob}`);
    console.log(`Time: ${tob}`);
    console.log(`Place: ${pob}`);
    console.log(`Marital Status: ${maritalStatus}`);
    console.log(`Question: ${userQueryForLLM}`);
  }

  if (!useOfflineFallback) {
    try {
      console.log("Prompt chars:", fullPrompt.length);
      console.log("Calling AI...");
      
      const aiResult = await executeAIWithRetries({
        fullPrompt,
        history,
        astroData,
        mode,
        uid,
        userData,
        progress,
        detectedIntent,
        pastHistory,
        skipDashaPreservation,
        resolvedLanguage,
        isDevanagari,
        maritalStatus,
        updatedFacts,
        isGreeting,
        isVague
      });

      if (aiResult.isFallback) {
        console.log("AI SUCCESS (Fallback)");
        success = true;
        jsonResponse = { text: aiResult.fallbackText };
      } else {
        console.log("AI SUCCESS");
        success = true;
        jsonResponse = aiResult.jsonResponse;
        aiText = aiResult.aiText;
        cliffhangerText = aiResult.cliffhangerText;
        
        // Persist parsed memoryState to Firestore via progressEngine
        if (aiResult.memoryState) {
          const { mergeRecommendationMemory } = await import('../lib/memoryStateParser.js');
          const mergedMemory = mergeRecommendationMemory(progress.recommendationMemory, aiResult.memoryState.recommendationMemory);
          const confidenceScore = aiResult.memoryState.debug_info?.confidenceScore ?? progress.debug_info?.confidenceScore ?? null;
          
          await updateProgress(progressUid, 'memory_update', {
            recommendationMemory: mergedMemory,
            debug_info: { confidenceScore }
          });
        }
      }
    } catch (err) {
      console.log("AI FAILED:", err.message);
      console.error("AI Generation failed:", err.message || err);
      lastError = err;
    }
  }

  if (!success) {
    console.error("AI Generation failed:", lastError?.message || lastError || "Unknown error");
    return res.status(500).json({ error: "Failed to generate prediction. Connection to the sacred gateway is temporarily interrupted, please try again." });
  }

  if (success && jsonResponse) {
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const latestUserData = snap.data();
        if (!latestUserData) {
          throw new Error("User data empty");
        }

        const isPremiumLatest = !!latestUserData.premium;

        if (!isPremiumLatest) {
          const lastQDate = latestUserData.lastQuestionDate ? latestUserData.lastQuestionDate.toDate() : null;
          const lastCDate = latestUserData.lastCompDate ? latestUserData.lastCompDate.toDate() : null;
          const today = new Date();

          const dailyQUsedLatest = !isNewDay(lastQDate, today) ? latestUserData.dailyQuestionUsed : false;
          const dailyCUsedLatest = !isNewDay(lastCDate, today) ? latestUserData.dailyCompUsed : false;

          if (mode === 'chat' || mode === 'personal') {
            if (!dailyQUsedLatest) {
              tx.update(userRef, { dailyQuestionUsed: true, lastQuestionDate: FieldValue.serverTimestamp() });
            } else {
              const coins = snap.data()?.coins || 0;
              if (coins < AI_QUESTION_COST) {
                throw new Error("Insufficient coins");
              }
              tx.update(userRef, { coins: coins - AI_QUESTION_COST });
            }
          } else if (mode === 'compatibility') {
            if (!dailyCUsedLatest) {
              tx.update(userRef, { dailyCompUsed: true, lastCompDate: FieldValue.serverTimestamp() });
            } else {
              const coins = snap.data()?.coins || 0;
              if (coins < AI_QUESTION_COST) {
                throw new Error("Insufficient coins");
              }
              tx.update(userRef, { coins: coins - AI_QUESTION_COST });
            }
          } else {
            const coins = snap.data()?.coins || 0;
            if (coins < AI_QUESTION_COST) {
              throw new Error("Insufficient coins");
            }
            tx.update(userRef, { coins: coins - AI_QUESTION_COST });
          }
        }

        if (mode === 'chat' || mode === 'personal') {
          const latestTopicProgress = getTopicProgress(latestUserData);
          const latestRevealed = latestUserData.revealedLayers || {};
          const latestCliffhangers = latestUserData.lastCliffhangers || [];

          const updateResult = updateTopicProgress(uid, topicState, latestTopicProgress, latestRevealed);

          let updatedCliffhangersList = [...latestCliffhangers];
          if (cliffhangerText) {
            updatedCliffhangersList.push(cliffhangerText);
          }
          if (updatedCliffhangersList.length > 3) {
            updatedCliffhangersList = updatedCliffhangersList.slice(-3);
          }

          tx.update(userRef, {
            topicProgress: updateResult.topicProgress,
            revealedLayers: updateResult.revealedLayers,
            lastActiveTopic: activeTopic,
            lastCliffhangers: updatedCliffhangersList,
            savedMysteries: savedMysteries
          });
        }
      });
    } catch (txError) {
      console.error("Deduction Transaction failed:", txError);
      if (txError.message === "Insufficient coins") {
        return res.status(403).json({ error: 'Not enough coins' });
      }
    }
    console.log("RESPONSE SOURCE =", responseSource);
    if (mode === 'chat' || mode === 'personal') {
      return res.status(200).json({ text: jsonResponse.text });
    }
    return res.status(200).json(jsonResponse);
  }

  console.error("ALL MODELS FAILED. Final error state recorded.");
  const finalStatusCode = lastError?.status || lastError?.response?.status || 500;
  const isQuotaError = finalStatusCode === 429 || lastError?.message?.includes("quota") || lastError?.message?.includes("429");

  if (mode === 'chat' || mode === 'personal') {
    console.log("RESPONSE SOURCE = OFFLINE");
    const backendFallback = getBackendErrorFallback(resolvedLanguage, isDevanagari, maritalStatus);
    const formattedFallback = await injectSecretAndScore(backendFallback, uid, userData, progress, getSecretCategory(detectedIntent), pastHistory);
    return res.status(200).json({
      text: formattedFallback
    });
  }

  console.log("RESPONSE SOURCE = OFFLINE");
  return res.status(finalStatusCode === 429 ? 429 : 500).json({
    error: isQuotaError ? "Quota exceeded" : (lastError?.message || "Internal Server Error"),
  });
}
