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
  const maritalStatus = getFact(factMemory, 'relationship.relationshipStatus') || userData?.maritalStatus;

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

  // Married + shaadi kab
  if (
    (maritalStatus === 'Married') &&
    q.includes('shaadi') &&
    q.includes('kab')
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
  const age = getFact(factMemory, 'career.age') || userData?.age;
  const parsedAge = parseInt(age);
  const occupation = getFact(factMemory, 'career.occupation') || userData?.occupation;
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
  Widowed: 'Focus on emotional recovery and stability.'
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
  const mar = relationshipLoss ? 'Widowed' : (userData?.maritalStatus || 'Single');
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
    if (!hasAstro || !astroData.nakshatra) return false;
    const calcNak = astroData.nakshatra.toLowerCase();
    for (const nak of NAKSHATRAS) {
      const nakLower = nak.toLowerCase();
      if (nakLower !== calcNak && lower.includes(nakLower)) return false;
    }
  }

  // Check Dasha
  if (lower.includes("mahadasha") || lower.includes("महादशा") || lower.includes("dasha") || lower.includes("दशा")) {
    if (!hasAstro || !astroData.mahadasha) return false;
    const calcMaha = astroData.mahadasha.toLowerCase();
    const calcAntar = astroData.antardasha ? astroData.antardasha.toLowerCase() : "";
    for (const lord of DASHA_LORDS) {
      const lordLower = lord.name.toLowerCase();
      if (lordLower !== calcMaha && lordLower !== calcAntar && lower.includes(lordLower + " dasha")) return false;
    }
  }

  // Check ALL 12 Lagnas, not just Kanya
  const lagnas = ['mesh','vrishabh','mithun','kark','simha','kanya','tula','vrishchik','dhanu','makar','kumbh','meen'];
  for (const lagna of lagnas) {
    if (lower.includes(lagna + ' lagna') || lower.includes(lagna + ' लग्न')) {
      if (!hasAstro || !astroData.lagna || !astroData.lagna.toLowerCase().includes(lagna)) return false;
    }
  }

  // Check Planet Positions - if AI mentions Mars in X, verify against calc
  const planetSigns = hasAstro ? (astroData.planets || {}) : {};
  for (const [planet, sign] of Object.entries(planetSigns)) {
    const regex = new RegExp(`${planet}\\s+(in|me)\\s+\\w+`, 'i');
    const match = text.match(regex);
    if (match && !match[0].toLowerCase().includes(sign.toLowerCase())) return false;
  }

  // Check Dhaiya - only allow if calculated
  if (lower.includes('dhaiya') && (!hasAstro || !astroData.dhaiya)) return false;

  // Check Sadesati - only allow if calculated
  if (lower.includes('sadesati') && (!hasAstro || !astroData.sadesati)) return false;

  // Check Houses - if AI mentions "4th house", verify against calc
  const hasHouses = astroData?.houses && Object.keys(astroData.houses).length > 0;
  if (!hasHouses) {
    const forbiddenHousePatterns = [
      /\b4th\s+(?:house|bhav)\b/i,
      /\b5th\s+(?:house|bhav)\b/i,
      /\b7th\s+(?:house|bhav)\b/i,
      /\b9th\s+(?:house|bhav)\b/i,
      /\b10th\s+(?:house|bhav)\b/i
    ];
    if (forbiddenHousePatterns.some(pattern => pattern.test(text))) {
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
  const blacklist = ['beta','😂','😁','😆'];
  if (blacklist.some(w => text.toLowerCase().includes(w))) return true;

  const INVALID_RASHI_PATTERN = /(surya|chandra|mangal|budh|guru|shukra|shani|rahu|ketu)\s+(rashi|राशि)\s+me/gi;
  if ([...text.matchAll(INVALID_RASHI_PATTERN)].length > 0) return true;

  const lower = text.toLowerCase();
  
  const forbidden = [
    "beta",
    "बेटा",
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

function parseModelResponse(text) {
  let cleanedText = text.trim();
  cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleanedText);
  } catch (parseError) {
    const scoreMatch = cleanedText.match(/"?score"?\s*:\s*(\d+)/);
    const guidanceMatch = cleanedText.match(/"?guidance"?\s*:\s*"(.*?)"/);
    return {
      score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
      guidance: guidanceMatch ? guidanceMatch[1] : cleanedText,
      sections: []
    };
  }
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

function getLevel(score) {
  if (score < 100) return 'Seeker';
  if (score < 300) return 'Explorer';
  if (score < 600) return 'Believer';
  return 'Master';
}

async function injectSecretAndScore(text, uid, userData, cachedProgress = null) {
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
  const secret = getDailySecret(dobKey, today);
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

    // Greeting Routing Hotfix (length <= 5 and contains hi, hello, hlo, namaste, ram ram)
    const cleanInput = questionTextNormalized.replace(/[^a-z0-9\s]/g, '').trim();
    const isGreeting = (cleanInput.length <= 5 && ['hlo', 'hello', 'hi'].some(g => cleanInput.includes(g))) || 
                       (cleanInput.length <= 8 && ['namaste', 'ram ram'].some(g => cleanInput.includes(g)));

    if (isGreeting) {
      return res.status(200).json({
        text: "Namaste! Kaise hain aap? Main aapki kundali aur tarot prashno ke uttar de sakta hoon. Kripya apna prashna likhein."
      });
    }
    
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

    // Structured married/single user guard

    const asksMarriageStatus = (originalIntent === 'marriage_when') || 
                               questionTextNormalized.includes("shadi kab") || 
                               questionTextNormalized.includes("shaadi kab") ||
                               questionTextNormalized.includes("marriage when") ||
                               questionTextNormalized.includes("shadi ho gyi") || 
                               questionTextNormalized.includes("shadi ho gayi") ||
                               questionTextNormalized.includes("shaadi ho gayi") ||
                               questionTextNormalized.includes("shaadi ho chuki") ||
                               questionTextNormalized.includes("shadi ho chuki");

    const asksAboutSpouse = questionTextNormalized.includes("wife") ||
                           questionTextNormalized.includes("patni") ||
                           questionTextNormalized.includes("husband") ||
                           questionTextNormalized.includes("pati") ||
                           questionTextNormalized.includes("biwi") ||
                           questionTextNormalized.includes("shaadi") ||
                           questionTextNormalized.includes("bacha") ||
                           questionTextNormalized.includes("bcha") ||
                           questionTextNormalized.includes("baby") ||
                           questionTextNormalized.includes("child");

    if (currentMarital === 'Single' && asksAboutSpouse) {
      const safeText = "🔮 Prediction:\nAapke profile ke anusaar aap avivahit hain, isliye vivah/santan sambandhit prashn laagu nahi hota.\n\n📿 Reasoning:\nCurrent profile me marital status Single hai.\n\n🪔 Guidance:\nYadi bhavishya ke vivaah ya sambandh ke baare me poochna hai to uske baare me pooch sakte hain.";
      return res.status(200).json({ text: await injectSecretAndScore(safeText, uid, userData, progress) });
    }

    if (currentMarital === 'Single' && asksMarriageStatus) {
      return res.status(200).json({
        text: "🔮 Prediction:\nAapke profile ke anusaar aap avivahit hain.\n\n📿 Reasoning:\nCurrent profile me marital status Single hai.\n\n🪔 Guidance:\nYadi sambandh ya bhavishya ke vivaah ke baare me poochna hai to uske baare me pooch sakte hain."
      });
    }

    if (currentMarital === 'Married' && asksMarriageStatus) {
      return res.status(200).json({
        text: "🔮 Prediction:\nAap pehle se vivahit hain.\n\n📿 Reasoning:\nProfile me marital status Married hai.\n\n🪔 Guidance:\nYadi vivaahik jeevan ya punarvivah sambandhit prashn hai to uske baare me pooch sakte hain."
      });
    }
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

  const systemInstruction = `Speak as AstroTarot AI Predictor. Natural Hindi. No baba talk.
Understand occupation semantically.
Understand marital status semantically.

CRITICAL:
* Married = no first-marriage predictions.
* Business = no exam advice.
* Gov Job = mention SSC/UPSC/Banking when relevant.
* Private Job = promotions/growth.
* Housewife = family/finances.
* No houses (4/5/7/9/10) unless in Houses block. If empty, say "Career sambandhit yog" or "Grah sthiti".

Format:
🔮 Prediction:
[Direct answer]

📿 Reasoning:
[Use ONLY Astro Data below. If missing: "Kundali data uplabdh nahi hai."]

🪔 Guidance:
[Practical remedy]

🎲 Aaj Ka Secret: ${secret}

📊 Karma Score: ${progress.score}/${nextLevel} | Level: ${getLevel(progress.score)} | Streak: ${progress.streak}🔥

Rules:
* Job/marriage: mention antardashaEnd. If missing: 'Kundali data me timeline uplabdh nahi hai'. No vague timelines.
* Simple Hindi. No emojis except 🔮, 📿, 🪔.
* Forbidden: beta, bhai, mere bhai, bhagwan ki kripa, sab theek ho jayega, taare dekho, atkal, aabki, fayda daru, shahar ke antardasha.
* 80-130 words.
For non-astro query: use format. Pred: "Mai jyotish se sambandhit prashna ka hi uttar de sakta hun." Reason: "Aapka prashna [user question] kundali par aadharit nahi hai. Jyotish me [related topic] dekha jata hai."
🪔 Guidance: Agar aap [astro alternative] jaanna chahte hain to puch sakte hain.
Then add 🎲 Secret and 📊 Score normally.`;

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

  if (mode === 'chat' || mode === 'personal') {
    name = profile?.name || userData?.name || 'Unknown';
    
    let resolvedGender = 'Unknown';
    if (userData?.gender && userData.gender !== 'Unknown') {
      resolvedGender = userData.gender;
    } else if (profile?.gender && profile.gender !== 'Unknown') {
      resolvedGender = profile.gender;
    } else if (getFactValue(facts.gender)) {
      resolvedGender = getFactValue(facts.gender);
    }
    gender = resolvedGender;

    let resolvedMarital = 'Unknown';
    if (relationshipLoss) {
      resolvedMarital = 'Widowed';
    } else if (userData?.maritalStatus && userData.maritalStatus !== 'Unknown') {
      resolvedMarital = userData.maritalStatus;
    } else if (profile?.maritalStatus && profile.maritalStatus !== 'Unknown') {
      resolvedMarital = profile.maritalStatus;
    } else if (getFactValue(facts.married) === true) {
      resolvedMarital = 'Married';
    } else if (getFactValue(facts.married) === false) {
      resolvedMarital = 'Single';
    }
    maritalStatus = resolvedMarital;

    // DOB
    let dobDay = userData?.dobDay || profile?.dobDay;
    let dobMonth = userData?.dobMonth || profile?.dobMonth;
    let dobYear = userData?.dobYear || profile?.dobYear;

    // FALLBACK: Parse YYYY-MM-DD or DD-MM-YYYY string if dobDay undefined
    if (!dobDay && userData?.dob) {
      const parts = userData.dob.split('-');
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

    if (!dobDay || !dobMonth || !dobYear) {
      const errText = `🔮 Prediction:\n${userData.name || ''} ji, janm tarikh sahi format me nahi mili.\n\n📿 Reasoning:\nKripya DOB DD-MM-YYYY format me daalein.\n\n🪔 Guidance:\nDetails dobara submit karke prashna puchiye.`;
      return res.status(200).json({ text: await injectSecretAndScore(errText, uid, userData, progress) });
    }

    dob = `${dobYear}-${String(dobMonth).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;
    ageDisplay = calculateAge(dob);

    // Time (TOB)
    const tobHour = userData?.tobHour || profile?.tobHour;
    const tobMinute = userData?.tobMinute || profile?.tobMinute;
    const tobPeriod = userData?.tobPeriod || profile?.tobPeriod;
    if (tobHour !== undefined && tobMinute !== undefined) {
      tob = `${tobHour}:${String(tobMinute).padStart(2, '0')} ${tobPeriod || ''}`.trim();
    } else if (profile?.tob) {
      tob = profile.tob;
    } else if (profile?.timeOfBirth) {
      tob = profile.timeOfBirth;
    }

    // Place (POB)
    pob = profile?.pob || profile?.placeOfBirth || userData?.pob || 'Unknown';
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

    const contradiction = detectSmartContradiction(
      questionText,
      updatedFacts,
      userData,
      history
    );

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

    const language = req.body.language || userData?.language || 'Hindi';
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

    fullPrompt = `
${systemInstruction}

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

      const isAstroDataMissing = (mode === 'chat' || mode === 'personal') && (!astroData || !astroData.lagna);

      if (!isAstroDataMissing) {
        // Check forbidden phrases (Step 4)
        if (containsForbiddenPhrases(aiText, updatedFacts)) {
          needsRetry = true;
          retryReason = "blacklist";
        }

        // Check astrology hallucinations (Step 11)
        const validatedText = await injectSecretAndScore(aiText, uid, userData, progress);
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

        const validatedRetryText = await injectSecretAndScore(aiText, uid, userData, progress);
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
        const failText = `🔮 Prediction:\nTakneeki karan se vistar se nahi bata pa raha.\n\n📿 Reasoning:\nKundali data verify nahi ho paya.\n\n🪔 Guidance:\nKuch der baad dobara try karein.`;
        return res.status(200).json({ text: await injectSecretAndScore(humanize(failText), uid, userData, progress) });
      }

      if (!aiText || !aiText.trim()) {
        throw new Error("Empty AI output");
      }

      if (mode === 'chat' || mode === 'personal') {
        const deduplicatedText = removeDuplicateSentences(aiText);
        jsonResponse = {
          text: await injectSecretAndScore(deduplicatedText, uid, userData, progress)
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
    console.log("OFFLINE FALLBACK TRIGGERED");
    responseSource = "OFFLINE";
    if (mode === 'chat' || mode === 'personal') {
      try {
        console.log("Using horoscopeEngine / dataset fallback");
        const fallbackText = buildResponse(progressUid, detectedIntent, todayString, questionText);
        aiText = fallbackText;
        jsonResponse = {
          text: await injectSecretAndScore(fallbackText, uid, userData, progress)
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
  
  const fallbackMessage = isQuotaError 
    ? "Pandit AI is temporarily busy. Please try again later."
    : "I apologize, but I am experiencing cosmic interference. Please try again later.";

  if (mode === 'chat' || mode === 'personal') {
    console.log("RESPONSE SOURCE = OFFLINE");
    return res.status(200).json({ 
      text: fallbackMessage
    });
  }

  console.log("RESPONSE SOURCE = OFFLINE");
  return res.status(finalStatusCode === 429 ? 429 : 500).json({ 
    error: isQuotaError ? "Quota exceeded" : (lastError?.message || "Internal Server Error"),
  });
}
