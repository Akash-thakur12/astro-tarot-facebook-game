import { generateAIResponse } from '../services/aiService.js';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getProgress, updateProgress, getDailySecret } from '../src/utils/progressEngine.js';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { buildResponse } from '../src/utils/responseBuilder.js';
import { detectIntent } from '../src/utils/intentDetector.js';
import { normalizeFacts } from '../src/utils/memoryEngine.js';
import { updateEvidenceMemory } from '../src/utils/evidenceMemoryEngine.js';
import { humanize } from '../src/utils/humanizer.js';
import { resolveIntentContradiction } from '../src/utils/contradictionEngine.js';
import { getAstrologyData } from '../src/utils/astroEngine.js';
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

export function getTopicAndSubType(question) {
  const q = question.toLowerCase();

  // 1. Tier 1 - Full Engine
  if (/naukri|job|career|promotion|vyapar|business|salary|interview|tarakki|unnati/i.test(q))
    return { tier: 1, topic: 'career' };

  if (/shadi|vivah|marriage|marry|married|rishta|engagement|jeevan saathi/i.test(q))
    return { tier: 1, topic: 'marriage' };

  // 2. Nazar (Specific Tier 3)
  if (/nazar|negative|bhoot|kala jadu|atma|paranormal|darr/i.test(q))
    return { tier: 3, topic: 'nazar' };

  // 3. Specific Tier 2 Topics
  if (/pyaar|love|crush|\bex\b|relationship|partner|soulmate|breakup|patch up/i.test(q))
    return { tier: 2, topic: 'love' };

  if (/paisa|\bdhan\b|rich|crorepati|lottery|stock|crypto|property|karz|wealth|financial/i.test(q))
    return { tier: 2, topic: 'money' };

  if (/health|bimari|stress|mental|recovery|surgery|fitness|swasthya|swasth|anxiety/i.test(q))
    return { tier: 2, topic: 'health' };

  if (/videsh|foreign|visa|\bpr\b|abroad/i.test(q))
    return { tier: 2, topic: 'foreign' };

  if (/bachcha|bachche|santan|pregnancy|ivf|beta|beti|family growth/i.test(q))
    return { tier: 2, topic: 'children' };

  if (/family|ghar|parents|bhai|behen|property dispute/i.test(q))
    return { tier: 2, topic: 'family' };

  // 4. Daily (Tier 2 Daily - Checked after specific Tier 2 but before Future and other Tier 3)
  if (/\baaj\b|\bkal\b|is hafte|is mahine|daily|lucky color|number|today/i.test(q))
    return { tier: 2, topic: 'daily' };

  // 5. Future (Tier 2 Future)
  if (/agla saal|6 mahine|kismat|turning point|success|future/i.test(q))
    return { tier: 2, topic: 'future' };

  // 6. Other Tier 3 Topics
  if (/sapne|sapna|dream|saanp|paani|mandir|shivling/i.test(q))
    return { tier: 3, topic: 'dreams' };

  if (/isht dev|mantra|vrat|pooja|gemstone|daan|bhagya|dosh/i.test(q))
    return { tier: 3, topic: 'spiritual' };

  if (/lucky (number|color|day|date|direction|mobile|vehicle)/i.test(q))
    return { tier: 3, topic: 'lucky' };

  return { tier: 3, topic: 'general' };
}

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



function buildAstrologyBlock(astroData) {
  if (!astroData) {
    return `PROVIDED ASTROLOGY DATA\nDATA UNAVAILABLE`;
  }

  const planetPos = astroData.planets
    ? Object.entries(astroData.planets).map(([p, sign]) => `${p} in ${sign}`).join(", ")
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
Houses: ${Object.entries(astroData.houses || {}).map(([p, h]) => `${p}: ${h}th`).join(', ')}`;
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

function validateAstroResponse(text, astroData) {
  if (!text) return false;

  const INVALID_RASHI_PATTERN = /(surya|chandra|mangal|budh|guru|shukra|shani|rahu|ketu)\s+(rashi|राशि)\s+me/gi;
  if ([...text.matchAll(INVALID_RASHI_PATTERN)].length > 0) return false;

  const lower = text.toLowerCase();
  const hasAstro = !!astroData;

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

function isGreetingMessage(text) {
  if (!text) return false;
  const q = text.toLowerCase().trim().replace(/[^a-z0-9\s\u0900-\u097F]/g, '');
  const greetings = [
    'hi', 'hello', 'hey', 'hii', 'hlo', 'namaste', 'ram ram', 'ramram', 'guru ji', 'guruji',
    'pandit ji', 'panditji', 'pandi ji', 'pandiji', 'pranam', 'pranaam', 'baba',
    'radhe radhe', 'jai shree ram', 'hi pandit ji', 'hello pandit ji', 'pranam pandit ji',
    'hlo pandi ji', 'hlo pandit ji', 'hello pandi ji', 'pranam pandi ji', 'hii pandit ji', 'hii pandi ji',
    'नमस्ते', 'राम राम', 'प्रणाम', 'गुरु जी', 'गुरुजी', 'पंडित जी', 'पंडितजी', 'बाबा', 'राधे राधे', 'जय श्री राम'
  ];
  return greetings.includes(q);
}

function isVagueMessage(text) {
  if (!text) return false;
  const q = text.toLowerCase().trim().replace(/[^a-z0-9\s\u0900-\u097F]/g, '');
  const vague = [
    'mujhe ek sawal puchna hai', 'ek baat puchni hai', 'help', 'kya', 'batao',
    'suno', 'bolo', 'ek baat', 'ek sawal', 'question', 'help me', 'madad',
    'meri bat suno', 'meri baat suno', 'hmm', 'accha', 'achha',
    'मुझे एक सवाल पूछना है', 'एक बात पूछनी है', 'मदद', 'क्या', 'बताओ', 'सुनो', 'बोलो', 'सवाल पूछना है', 'मेरी बात सुनो'
  ];
  return vague.includes(q);
}

function getFriendlyAstrologyFallback(resolvedLanguage, isDevanagari, maritalStatus) {
  const isMarried = maritalStatus === 'Married';
  if (resolvedLanguage === 'English') {
    return `🔮 Prediction:
The current alignment of your planets suggests a period of transition and learning.

📿 Astrological Reasoning:
Cosmic energies are encouraging you to focus on ${isMarried ? 'spouse harmony and domestic stability' : 'future career and personal growth'}.

🪔 Guidance:
Offer water to the Sun (Surya Arghya) and practice daily meditation. This will clear the path for success and harmony. How can I assist you further?`;
  } else if (isDevanagari) {
    return `🔮 Prediction:
ग्रहों की वर्तमान स्थिति आपके जीवन में सकारात्मक बदलाव और नई सीख की ओर संकेत कर रही है।

📿 Astrological Reasoning:
ब्रह्मांडीय ऊर्जा आपको अपने ${isMarried ? 'दांपत्य जीवन और पारिवारिक सामंजस्य' : 'भविष्य के करियर और व्यक्तिगत विकास'} पर ध्यान देने के लिए प्रेरित कर रही है।

🪔 Guidance:
नियमित रूप से सूर्य देव को जल अर्पित करें और प्रतिदिन कुछ मिनट ध्यान लगाएं। क्या आप अपने ${isMarried ? 'पारिवारिक जीवन' : 'करियर या विवाह'} के बारे में कुछ और पूछना चाहेंगे?`;
  } else {
    return `🔮 Prediction:
Grahon ki vartaman sthiti aapke jeevan me sakaratmak badlav aur nayi seekh ki taraf ishara kar rahi hai.

📿 Astrological Reasoning:
Brahmandiya energy aapko apne ${isMarried ? 'dampatya jeevan aur parivarik harmony' : 'future career aur personal growth'} par dhyan dene ke liye prerit kar rahi hai.

🪔 Guidance:
Niyamit roop se surya dev ko jal arpit karein aur roz thoda dhyan lagayein. Kya aap apne ${isMarried ? 'family life' : 'career ya vivaah'} ke baare me aur janna chahte hain?`;
  }
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

async function injectSecretAndScore(text, uid, userData, cachedProgress = null, category = 'General') {
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
  const secret = getDailySecret(dobKey, today, category);
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
    const questionTextNormalized = (userData.question || '').trim().toLowerCase();

    // Check for AI identity questions: "tuje kisne banaya" (Step 3)
    if (questionTextNormalized.includes("tuje kisne banaya") ||
      questionTextNormalized.includes("tujhe kisne banaya") ||
      questionTextNormalized.includes("tumhe kisne banaya") ||
      /who\s+(created|made|built)\s+you/i.test(questionTextNormalized) ||
      (questionTextNormalized.includes("kisne") && questionTextNormalized.includes("banaya"))) {
      return res.status(200).json({
        text: "Main AstroTarot AI hoon. Mujhe AI models aur AstroTarot system ne banaya hai."
      });
    }

    if (questionTextNormalized.includes("tum galat yaad kar rahe ho")) {
      return res.status(200).json({
        text: "Ho sakta hai maine pehle ki baaton ko galat samjha ho."
      });
    }
  }

  const BEDROCK_API_KEY = process.env.BEDROCK_API_KEY;
  const BEDROCK_BASE_URL = process.env.BEDROCK_BASE_URL;

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
  const questionText = sanitizePromptInput((userData.question || '').trim());
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

  // Intent detection and contradiction routing
  if (mode === 'chat' || mode === 'personal') {
    const questionTextNormalized = (userData.question || '').trim().toLowerCase();
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
  } else if (isDevanagari) {
    languagePreference = "Devanagari Hindi script (हिन्दी लिपि). Write the entire response in pure Devanagari Hindi. Do not use English script (Latin letters) at all.";
  } else {
    languagePreference = "Hinglish (Hindi written in Roman/Latin script, e.g., 'Aapki shaadi 2026 me hogi'). Write the entire response in Hinglish. Do not use Devanagari script at all.";
  }

  const isGreeting = isGreetingMessage(questionText);
  const isVague = isVagueMessage(questionText);



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
  }

  const astroData = (mode === 'chat' || mode === 'personal')
    ? await getAstrologyData({ dob, tob, pob })
    : null;

  let updatedFacts = factMemory;
  // Construct prompt for API providers
  let fullPrompt = "";
  if (mode === 'chat' || mode === 'personal') {
    const occupation = profile?.occupation || userData?.occupation || 'Unknown';

    let semanticFacts = null;
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

    // Fact Memory (Married, Gender, Occupation) & Language Preference
    let factMemoryBlock = "Fact Memory:\n";

    const isMarried = (maritalStatus === 'Married');
    factMemoryBlock += `Married: ${isMarried ? "Yes" : "No"}\n`;
    factMemoryBlock += `Gender: ${gender}\n`;

    const occupation = profile?.occupation || userData?.occupation || 'Unknown';
    factMemoryBlock += `Occupation: ${occupation}\n`;

    const language = resolvedLanguage;
    factMemoryBlock += `Language Preference: ${language}`;

    promptSections.push(factMemoryBlock.trim());

    // Inject User Astrology Profile before user question (Step 2)
    let astrologyProfileBlock = `User Astrology Profile:
Name: ${name}
Gender: ${gender}
DOB: ${dob}
Age: ${ageDisplay}
Time: ${tob}
Place: ${pob}
Marital Status: ${maritalStatus}`;

    promptSections.push(astrologyProfileBlock);

    promptSections.push(buildCompactContext(userData, astroData, updatedFacts));

    // Inject calculated astroData (Step 8)
    promptSections.push(buildAstrologyBlock(astroData));

    // Recent Conversation (Recent 3 turns)
    const allHistoryMsgs = Array.isArray(history) ? history : [];

    // Ensure we exclude the current question if it is the last message
    let pastHistory = [];
    if (allHistoryMsgs.length > 0) {
      const lastMsg = allHistoryMsgs[allHistoryMsgs.length - 1];
      if (lastMsg.role === 'user' && lastMsg.content === userData.question) {
        pastHistory = allHistoryMsgs.slice(0, -1);
      } else {
        pastHistory = allHistoryMsgs;
      }
    }
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

    const classification = getTopicAndSubType(questionText);
    const tierType = classification.tier;
    const questionTopic = classification.topic;

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

    let systemInstruction = "";
    if (tierType === 1) {
      systemInstruction = `
You are "Pandit AI", an expert Vedic Astrologer. Reply in Hindi/Hinglish only. Respond warmly like a traditional Pandit ji (aadar + apnapan + clear).

RESPONSE FORMAT - YOU MUST FOLLOW THIS EXACTLY:
Summary: Start with "${name} Beta, aapki kundli ke hisaab se..." and describe the yog/dasha and its strength.
Timing: timing ya result.
Reason: Kyunki...
Upay: Upay: ...
Question: End with a question asking if they want to know more.

Example of correct response style:
Amisha Beta, aapki kundli ke hisaab se Guru-Rahu chandal yog bana hua hai, jo buddhi ko sankochit karta hai aur dhyan bhatkata hai.
Naukri me tarakki aapko February 2027 se April 2027 ke beech mil sakti hai.
Kyunki dashmesh bhav par guru grah ki dristi pad rahi hai.
Upay: Roz subah surya dev ko jal dein aur peele phool chadhayein.
Kya aap jaanna chahengi ki kaunsa din tarakki ke patra ke liye sabse shubh rahega?

Use engine data only. Never invent astrology. Do not use English words like Career, Promotion, Job, salary, marriage. Use simple Hindi/Hinglish words.
`;
    } else if (tierType === 2) {
      systemInstruction = `
You are "Pandit AI", an expert Vedic Astrologer. Reply in Hindi/Hinglish only. Respond warmly like a traditional Pandit ji (aadar + apnapan + clear).

TIER 2 RESPONSE RULES:
- No specific prediction.
- No specific astrology calculations (like Shani dasha, planet in house, etc.).
- Structure your response EXACTLY like this template (do not change the sentence structure, just fill in the variables):
  "${name} Beta, [topic] ke liye vistaar se kundli dekhni padti hai.
  Filhal samanya grah sthiti ke anusaar [generic guidance].
  Aaj [dayOfWeek] hai, isliye [safe weekday remedy].
  Kya aap career ya vivah ke baare me jaanna chahenge? Uske liye yog ki ganana uplabdh hai."

Use these values for the template variables:
- [topic]: ${questionTopic}
- [dayOfWeek]: ${dayOfWeek}
- [safe weekday remedy]: ${weekdayRemedy}
- [generic guidance] based on topic:
  - daily: "Aaj man ko shant rakhne se kaam banenge"
  - love: "Shukra ko mazboot karne se prem me mithaas aati hai"
  - money: "Shaniwar ko gareeb ko daan karne se dhan aagman ke yog bante hain"
  - health: "Surya ko jal dene se urja aur swasthya laabh hota hai"
  - future: "Grah badalte rehte hain, mehnat aur upay se kismat banati hai"
  - other topics: "samanya grah sthiti badalti rehti hai, thoda sabr rakhein"
`;
    } else {
      systemInstruction = `
You are "Pandit AI", an expert Vedic Astrologer. Reply in Hindi/Hinglish only. Respond warmly like a traditional Pandit ji (aadar + apnapan + clear).

TIER 3 RESPONSE RULES:
- No prediction.
- No fear.
- No paranormal confirmation (do not confirm nazar, black magic, ghosts, paranormal).
- Structure your response EXACTLY like this template (do not change the sentence structure, just fill in the variables):
  "${name} Beta, [topic] ke vishay me shastra me kaha gaya hai...
  [general spiritual principle]
  Upay: [safe remedy only]
  Mann shant rakhein. Kya career ya vivah sambandhi prashn hai?"

Use these values for the template variables:
- [topic]: ${questionTopic}
- [general spiritual principle] based on topic:
  - nazar: "Nazar dosh aur nakaratmak urja man ki sthiti se prabhavit hoti hai."
  - dreams: "Sapne hamare avachetan man ke vicharon ko darshate hain."
  - spiritual: "Ishwar ki bhakti aur mantra jaap se man ko shanti aur shakti milti hai."
  - lucky: "Bhagya aur lucky numbers hamare achhe karmon ka phal hote hain."
  - general: "Jeevan ke har sankat me dhairya aur ishwar par vishwas sabse bada sahara hai."
- [safe remedy only] based on topic:
  - nazar: "Hanuman Chalisa ka paath karein aur ghar me dhoop-batti lagayein."
  - dreams: "Sone se pehle haath-muh dhokar Bhagwan ka dhyan karein."
  - spiritual: "Mantra 'Om Namah Shivaya' ka 108 baar jaap karein."
  - lucky: "Roz subah mata-pita ka aashirwad lein aur bejubaano ko bhojan dein."
  - general: "Pratidin subah dhyan lagayein aur sakaratmak sochein."
`;
    }

    const forbiddenRulesBlock = `
=== FORBIDDEN RULES ===
- Do NOT output: "Data not available", "score" (except in "Karma Score:"), "window", exact dates without engine calculations, "khatra", "maut", "barbaad".
- For Tier 2 and Tier 3, you must NEVER output: "Aapki Shani dasha...", "Budh 10th ghar me...", "March me shaadi...", any specific astrology calculation, or any specific prediction.
`;
    promptSections.push(forbiddenRulesBlock.trim());

    fullPrompt = `
${systemInstruction}

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

  const useOfflineFallback = !BEDROCK_API_KEY || !BEDROCK_BASE_URL;

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
      aiText = await generateAIResponse(fullPrompt);
      console.log("AI returned text length:", aiText.length);

      // Pre-humanize the initial text to align validation with the final output format
      if (mode === 'chat' || mode === 'personal') {
        aiText = humanize(aiText);
      }

      let needsRetry = false;
      let retryReason = "";

      const isAstroDataMissing = false;

      if (!isAstroDataMissing) {
        // Check forbidden phrases (Step 4)
        if (containsForbiddenPhrases(aiText, updatedFacts)) {
          needsRetry = true;
          retryReason = "blacklist";
        }

        // Check astrology hallucinations (Step 11)
        const validatedText = await injectSecretAndScore(aiText, uid, userData, progress, getSecretCategory(detectedIntent));
        if (!needsRetry && !validateAstroResponse(validatedText, astroData)) {
          needsRetry = true;
          retryReason = "hallucination";
        }

        // Check repetition (if no retry triggered yet)
        const lastAssistantMsg = Array.isArray(history)
          ? [...history].reverse().find(m => m.role === 'model' || m.role === 'assistant')
          : null;

        if (!needsRetry && lastAssistantMsg && lastAssistantMsg.content) {
          const similarity = getJaccardSimilarity(aiText, lastAssistantMsg.content);
          console.log(`Generated response Jaccard similarity to last response: ${similarity.toFixed(2)}`);
          if (similarity > 0.70) {
            needsRetry = true;
            retryReason = "repetition";
          }
        }
      }

      let retryCount = 0;
      while (needsRetry && retryCount < 2) {
        let retryPrompt = fullPrompt;
        if (retryReason === "blacklist") {
          retryPrompt += `\n\nUse simple Hindi.\nNo beta.\nNo emojis.\nNo broken words.\nWrite like educated person.`;
        } else if (retryReason === "hallucination") {
          retryPrompt += `\n\nAntardasha is a time period not city.\nMoon sign is not shahar.\nUse ONLY PROVIDED ASTROLOGY DATA.`;
        } else {
          retryPrompt += `\n\n[SYSTEM WARNING: Please generate a new response. Answer differently and avoid repeating previous wording.]`;
        }

        aiText = await generateAIResponse(retryPrompt);
        aiText = humanize(aiText);

        const validatedRetryText = await injectSecretAndScore(aiText, uid, userData, progress, getSecretCategory(detectedIntent));
        needsRetry =
          containsForbiddenPhrases(aiText, updatedFacts)
          ||
          !validateAstroResponse(validatedRetryText, astroData);

        if (needsRetry) {
          if (containsForbiddenPhrases(aiText, updatedFacts)) {
            retryReason = "blacklist";
          } else {
            retryReason = "hallucination";
          }
        }
        retryCount++;
      }

      if (needsRetry && retryCount >= 2) {
        console.error("VALIDATION_FAILED_3X");
        const friendlyFallbackText = getFriendlyAstrologyFallback(resolvedLanguage, isDevanagari, maritalStatus);
        return res.status(200).json({ text: await injectSecretAndScore(friendlyFallbackText, uid, userData, progress, getSecretCategory(detectedIntent)) });
      }

      if (!aiText || !aiText.trim()) {
        throw new Error("Empty AI output");
      }

      if (mode === 'chat' || mode === 'personal') {
        const deduplicatedText = removeDuplicateSentences(aiText);
        jsonResponse = {
          text: await injectSecretAndScore(deduplicatedText, uid, userData, progress, getSecretCategory(detectedIntent))
        };
      } else {
        const parsedData = parseModelResponse(aiText);
        if (!parsedData || typeof parsedData !== "object" || typeof parsedData.score !== "number") {
          throw new Error("Invalid response");
        }
        jsonResponse = parsedData;
      }
      console.log("AI SUCCESS");
      success = true;
    } catch (err) {
      console.log("AI FAILED:", err.message);
      console.error("AI Generation failed:", err.message || err);
      lastError = err;
    }
  }

  if (!success) {
    console.log("3-TIER OFFLINE FALLBACK TRIGGERED");
    responseSource = "OFFLINE";
    if (mode === 'chat' || mode === 'personal') {
      try {
        let fallbackText = "";

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const todayFormatted = currentDate.toLocaleDateString('hi-IN');
        const dayOfWeek = currentDate.toLocaleDateString('hi-IN', { weekday: 'long' });

        const classification = getTopicAndSubType(questionText);
        const tierType = classification.tier;
        const questionTopic = classification.topic;

        let weekdayRemedy = "Om ka jaap karein";
        if (dayOfWeek.includes('रवि') || dayOfWeek.toLowerCase().includes('sun')) weekdayRemedy = 'Surya dev ko jal arpit karein';
        else if (dayOfWeek.includes('सोम') || dayOfWeek.toLowerCase().includes('mon')) weekdayRemedy = 'Shivling par jal chadhayein';
        else if (dayOfWeek.includes('मंगल') || dayOfWeek.toLowerCase().includes('tue')) weekdayRemedy = 'Hanuman Chalisa ka path karein';
        else if (dayOfWeek.includes('बुध') || dayOfWeek.toLowerCase().includes('wed')) weekdayRemedy = 'Ganesh ji ko doorva chadhayein';
        else if (dayOfWeek.includes('गुरु') || dayOfWeek.includes('बृहस्पति') || dayOfWeek.toLowerCase().includes('thu')) weekdayRemedy = 'Vishnu ji ki puja karein aur peela tilak lagayein';
        else if (dayOfWeek.includes('शुक्र') || dayOfWeek.toLowerCase().includes('fri')) weekdayRemedy = 'Gareeb ko doodh ya safed mithai daan karein';
        else if (dayOfWeek.includes('शनि') || dayOfWeek.toLowerCase().includes('sat')) weekdayRemedy = 'Shani dev ke mandir me tel ka diya jalayein';

        if (tierType === 1) {
          const tier1Data = calculateTier1Data(questionTopic, astroData) || { score: 50, date: "2026-11" };
          const scoreText = convertScore(tier1Data.score);
          const timingText = convertDateWindow(tier1Data.date);

          const summary = `${name} Beta, aapki kundli ke hisaab se ${questionTopic === 'career' ? 'career/naukri' : 'vivah/marriage'} ke liye ${scoreText}.`;
          const timing = `${questionTopic === 'career' ? 'Naukri' : 'Shaadi'} ke yog aapko ${timingText} milne ke bante hain.`;
          const reason = `Kyunki aapki kundli me ${astroData?.mahadasha || 'Sun'} ki mahadasha aur ${astroData?.antardasha || 'Moon'} ki antardasha chal rahi hai.`;
          const upay = `Upay: Roz subah surya dev ko jal arpit karein.`;
          const question = `Kya aap is vishay me aur gehrai se jaanna chahenge?`;

          fallbackText = `${summary}\n\n${timing}\n\n${reason}\n\n${upay}\n\n${question}`;
        } else if (tierType === 2) {
          const qTextLower = (questionText || '').toLowerCase();
          if (questionTopic === 'love') {
            const data = calculateLoveEngine(astroData);
            let specificGuidance = `Rishte ki sthiti: ${data.relationshipStrength}.`;
            if (/ex|wapas|patch|reunion/i.test(qTextLower)) {
              specificGuidance = `Reunion hone ke yog: ${data.reunionPotential}.`;
            } else if (/soulmate|sachcha|sacha|true/i.test(qTextLower)) {
              specificGuidance = `Soulmate potential: ${data.soulmatePotential}.`;
            } else if (/crush|pasand|loyal|dhokha/i.test(qTextLower)) {
              specificGuidance = `Rishte me vishwas aur sthiti: ${data.relationshipStrength}.`;
            }
            fallbackText = `${name} Beta, aapki kundli ke hisaab se prem yog ki anukoolta ${convertScore(data.loveScore)} hai. ${specificGuidance} Timing: ${data.loveWindows.join(', ')}.`;
          } else if (questionTopic === 'money') {
            const data = calculateMoneyEngine(astroData);
            let specificGuidance = `Aamdani potential: ${data.incomePotential}.`;
            if (/karz|debt|loan/i.test(qTextLower)) {
              specificGuidance = `Karz se chhutkara aur bachat: ${data.savingsPotential}.`;
            } else if (/invest|stock|crypto|share/i.test(qTextLower)) {
              specificGuidance = `Nivesh aur dhansanchay: ${data.savingsPotential}.`;
            }
            fallbackText = `${name} Beta, aapki kundli me dhan yog ki anukoolta ${convertScore(data.wealthScore)} hai. ${specificGuidance} Timing: ${data.wealthWindows.join(', ')}.`;
          } else if (questionTopic === 'daily') {
            const data = calculateDailyTransitEngine(astroData, dayOfWeek);
            let specificGuidance = `Mood: ${data.mood}. Kaam: ${data.work}.`;
            if (/color|rang/i.test(qTextLower)) {
              specificGuidance = `Aaj ka din anukul rahega aur mood ${data.mood} rahega.`;
            } else if (/number|ank/i.test(qTextLower)) {
              specificGuidance = `Dhan sthiti ${data.money} rahegi.`;
            } else if (/savdhani|caution/i.test(qTextLower)) {
              specificGuidance = `Savdhani: ${data.caution}.`;
            }
            fallbackText = `${name} Beta, aaj aapka bhagya pratishat ${convertScore(data.todayScore)} hai. ${specificGuidance} Rishte: ${data.relationships}.`;
          } else if (questionTopic === 'health') {
            const data = calculateHealthEngine(astroData);
            let specificGuidance = `Stress level: ${data.stressLevel}.`;
            if (/stress|mental|anxiety/i.test(qTextLower)) {
              specificGuidance = `Stress aur chinta se recovery: ${data.recoveryPotential}.`;
            }
            fallbackText = `${name} Beta, swasthya vitality level ${convertScore(data.vitalityScore)} hai. ${specificGuidance} Guidance: ${data.healthGuidance}.`;
          } else if (questionTopic === 'foreign') {
            const data = calculateForeignTravelEngine(astroData);
            fallbackText = `${name} Beta, videsh yatra potential: ${data.foreignTravelPotential}. Settlement potential: ${data.settlementPotential}. Timing: ${data.travelWindows.join(', ')}.`;
          } else if (questionTopic === 'children') {
            const data = calculateChildrenEngine(astroData);
            fallbackText = `${name} Beta, santan potential: ${data.childrenPotential}. Family growth: ${data.familyGrowth}. Timing: ${data.childWindows.join(', ')}.`;
          } else if (questionTopic === 'family') {
            fallbackText = `${name} Beta, parivar me sukh shanti ke liye aapas me sanyam rakhna zaroori hai. Aaj shanti ke upay karein.`;
          } else if (questionTopic === 'future') {
            fallbackText = `${name} Beta, kismat aur future ke liye grah badalte rehte hain. Mehnat aur upay se anukul yog banenge.`;
          } else {
            const guidanceMap = {
              future: "Grah badalte rehte hain, mehnat aur upay se kismat banati hai",
              family: "Parivar me sukh shanti ke liye aapas me sanyam rakhna zaroori hai"
            };
            const genericGuidance = guidanceMap[questionTopic] || "samanya grah sthiti badalti rehti hai";
            fallbackText = `${name} Beta, ${questionTopic} ke liye vistaar se kundli dekhni padti hai.\n\nFilhal samanya grah sthiti ke anusaar ${genericGuidance}.\n\nAaj ${dayOfWeek} hai, isliye ${weekdayRemedy}.\n\nKya aap career ya vivah ke baare me jaanna chahenge? Uske liye yog ki ganana uplabdh hai.`;
          }
        } else {
          if (questionTopic === 'dreams') {
            const data = getDreamMeaning(questionText);
            fallbackText = `${name} Beta, aapke sapne me dekha gaya ${data.symbol} ka matlab hai: ${data.meaning}. Iska arth: ${data.description}`;
          } else if (['nazar', 'spiritual', 'lucky'].includes(questionTopic)) {
            const data = getSpiritualGuidance(questionText, astroData?.lagna);
            fallbackText = `${name} Beta, spiritual guidance ke anusaar: Mantra: ${data.mantra} Daan: ${data.daan} Pooja: ${data.pooja} Dhyan: ${data.dhyan}.`;
            if (data.ishtDev) {
              fallbackText += ` Aapke isht dev: ${data.ishtDev}.`;
            }
          } else {
            const principleMap = {
              general: "Jeevan ke har sankat me dhairya aur ishwar par vishwas sabse bada sahara hai."
            };
            const remedyMap = {
              general: "Pratidin subah dhyan lagayein aur sakaratmak sochein."
            };
            const generalSpiritualPrinciple = principleMap[questionTopic] || principleMap.general;
            const safeRemedyOnly = remedyMap[questionTopic] || remedyMap.general;

            fallbackText = `${name} Beta, ${questionTopic} ke vishay me shastra me kaha gaya hai...\n\n${generalSpiritualPrinciple}\n\nUpay: ${safeRemedyOnly}\n\nMann shant rakhein. Kya career ya vivah sambandhi prashn hai?`;
          }
        }

        aiText = fallbackText;
        jsonResponse = {
          text: await injectSecretAndScore(fallbackText, uid, userData, progress, getSecretCategory(detectedIntent))
        };
        success = true;
      } catch (fallbackError) {
        console.error("Offline fallback failed:", fallbackError);
        lastError = fallbackError;
      }
    }
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
    const formattedFallback = await injectSecretAndScore(backendFallback, uid, userData, progress, getSecretCategory(detectedIntent));
    return res.status(200).json({
      text: formattedFallback
    });
  }

  console.log("RESPONSE SOURCE = OFFLINE");
  return res.status(finalStatusCode === 429 ? 429 : 500).json({
    error: isQuotaError ? "Quota exceeded" : (lastError?.message || "Internal Server Error"),
  });
}
