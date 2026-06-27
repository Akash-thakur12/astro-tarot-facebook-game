import { getTopicAndSubType } from '../api/pandit-ai.js';
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

// Setup Mock Astro Data
const sampleAstroData = {
  lagna: 'Mesh',
  mahadasha: 'Jupiter',
  antardasha: 'Venus',
  antardashaEnd: '11/2026',
  houses: {
    Venus: 5,
    Moon: 9,
    Jupiter: 7,
    Rahu: 12,
    Saturn: 10,
    Mars: 6,
    Sun: 3,
    Mercury: 3,
    Ketu: 6
  }
};

const dayOfWeek = "Saturday";

// Helper to format fallback answers matching actual pandit-ai.js logic
function getFallbackAnswer(question, topic, tier, name) {
  let weekdayRemedy = 'Shani dev ke mandir me tel ka diya jalayein'; // for Saturday

  if (tier === 1) {
    const total_score = topic === 'career' ? 75 : 68;
    const scoreText = total_score >= 75 ? "yog kaafi mazboot hain" : "madhyam se achhe yog";
    const timingText = "November 2026 ke beech";

    const summary = `${name} Beta, aapki kundli ke hisaab se ${topic === 'career' ? 'career/naukri' : 'vivah/marriage'} ke liye ${scoreText}.`;
    const timing = `${topic === 'career' ? 'Naukri' : 'Shaadi'} ke yog aapko ${timingText} milne ke bante hain.`;
    const reason = `Kyunki aapki kundli me Jupiter ki mahadasha aur Venus ki antardasha chal rahi hai.`;
    const upay = `Upay: Roz subah surya dev ko jal arpit karein.`;
    const questionText = `Kya aap is vishay me aur gehrai se jaanna chahenge?`;

    return `${summary}\n\n${timing}\n\n${reason}\n\n${upay}\n\n${questionText}`;
  } else if (tier === 2) {
    if (topic === 'love') {
      const data = calculateLoveEngine(sampleAstroData);
      return `${name} Beta, aapki kundli ke hisaab se prem yog ki anukoolta ${data.loveScore}% hai. Rishte ki sthiti: ${data.relationshipStrength}. Reunion hone ke yog: ${data.reunionPotential}. Soulmate potential: ${data.soulmatePotential}. Timing: ${data.loveWindows.join(', ')}.`;
    } else if (topic === 'money') {
      const data = calculateMoneyEngine(sampleAstroData);
      return `${name} Beta, aapki kundli me dhan yog ki anukoolta ${data.wealthScore}% hai. Aamdani potential: ${data.incomePotential}. Bachat potential: ${data.savingsPotential}. Timing: ${data.wealthWindows.join(', ')}.`;
    } else if (topic === 'daily') {
      const data = calculateDailyTransitEngine(sampleAstroData, dayOfWeek);
      return `${name} Beta, aaj aapka bhagya pratishat ${data.todayScore}% hai. Mood: ${data.mood}. Kaam: ${data.work}. Dhan sthiti: ${data.money}. Rishte: ${data.relationships}. Savdhani: ${data.caution}.`;
    } else if (topic === 'health') {
      const data = calculateHealthEngine(sampleAstroData);
      return `${name} Beta, swasthya vitality level ${data.vitalityScore}% hai. Stress level: ${data.stressLevel}. Recovery potential: ${data.recoveryPotential}. Guidance: ${data.healthGuidance}.`;
    } else if (topic === 'foreign') {
      const data = calculateForeignTravelEngine(sampleAstroData);
      return `${name} Beta, videsh yatra potential: ${data.foreignTravelPotential}. Settlement potential: ${data.settlementPotential}. Timing: ${data.travelWindows.join(', ')}.`;
    } else if (topic === 'children') {
      const data = calculateChildrenEngine(sampleAstroData);
      return `${name} Beta, santan potential: ${data.childrenPotential}. Family growth: ${data.familyGrowth}. Timing: ${data.childWindows.join(', ')}.`;
    } else {
      const guidanceMap = {
        future: "Grah badalte rehte hain, mehnat aur upay se kismat banati hai",
        family: "Parivar me sukh shanti ke liye aapas me sanyam rakhna zaroori hai"
      };
      const genericGuidance = guidanceMap[topic] || "samanya grah sthiti badalti rehti hai";
      return `${name} Beta, ${topic} ke liye vistaar se kundli dekhni padti hai.\n\nFilhal samanya grah sthiti ke anusaar ${genericGuidance}.\n\nAaj ${dayOfWeek} hai, isliye ${weekdayRemedy}.\n\nKya aap career ya vivah ke baare me jaanna chahenge? Uske liye yog ki ganana uplabdh hai.`;
    }
  } else {
    if (topic === 'dreams') {
      const data = getDreamMeaning(question);
      return `${name} Beta, aapke sapne me dekha gaya ${data.symbol} ka matlab hai: ${data.meaning}. Iska arth: ${data.description}`;
    } else if (['nazar', 'spiritual', 'lucky'].includes(topic)) {
      const data = getSpiritualGuidance(question, sampleAstroData.lagna);
      let res = `${name} Beta, spiritual guidance ke anusaar: Mantra: ${data.mantra} Daan: ${data.daan} Pooja: ${data.pooja} Dhyan: ${data.dhyan}.`;
      if (data.ishtDev) {
        res += ` Aapke isht dev: ${data.ishtDev}.`;
      }
      return res;
    } else {
      const principleMap = {
        general: "Jeevan ke har sankat me dhairya aur ishwar par vishwas sabse bada sahara hai."
      };
      const remedyMap = {
        general: "Pratidin subah dhyan lagayein aur sakaratmak sochein."
      };
      const generalSpiritualPrinciple = principleMap[topic] || principleMap.general;
      const safeRemedyOnly = remedyMap[topic] || remedyMap.general;

      return `${name} Beta, ${topic} ke vishay me shastra me kaha gaya hai...\n\n${generalSpiritualPrinciple}\n\nUpay: ${safeRemedyOnly}\n\nMann shant rakhein. Kya career ya vivah sambandhi prashn hai?`;
    }
  }
}

// Generate 1000 questions (100 per category)
const categories = {
  daily: [
    "Aaj kaisa rahega?", "Kal kya hone wala hai?", "Is hafte kya likha hai?", "Is mahine ki predictions?", "Aaj ka din kaisa rahega?",
    "Kal ka din kaisa rahega?", "Is hafte ka rashifal?", "Aaj ka lucky color kya hai?", "Aaj ka lucky number kya hai?", "Aaj kya savdhani rakhein?",
    "Aaj meri kismat kaisi rahegi?", "Today status of my day?", "Is hafte daily guidance?", "Kal kya savdhani bartein?", "Aaj ka shubh muhurat?"
  ],
  love: [
    "Ex wapas aayega?", "Will my ex text me?", "Soulmate kab milega?", "Sachcha pyaar milega?", "Relationship chalega?",
    "Ex boyfriend status?", "Will I find true love?", "Soulmate connection timing?", "Partner loyal hai?", "Pyaar me khushi kab milegi?",
    "Breakup ke baad patch up hoga?", "Ex girlfriend returning chances?", "Love life recovery?", "Ex lover reunion?"
  ],
  marriage: [
    "Marriage kab hogi?", "Shadi kab hogi?", "Vivah kab hoga?", "Rishta kab aayega?", "Engagement kab hogi?",
    "When will my marriage happen?", "Will I get married in 2026?", "Arrange marriage or love marriage?", "Jeevan saathi kaisa milega?", "Vivah ke shubh yog?",
    "Second marriage kab hogi?", "Shadi delay reasons?", "Jeevan saathi se rishta kaisa rahega?", "Rishta kab tay hoga?"
  ],
  career: [
    "Job kab milegi?", "Naukri kab lagegi?", "Promotion kab hoga?", "Salary hike kab hogi?", "Business profit hoga?",
    "New business kab shuru karein?", "Sarkari naukri milegi?", "Interview selection chance?", "Career change kab karein?", "Job transfer timing?",
    "Tarakki ke yog kab banenge?", "Private job shift chance?", "Sarkari job timing?", "Business expand kab hoga?"
  ],
  money: [
    "Paisa kab aayega?", "Crorepati banunga?", "Dhan yog hain?", "Wealth accumulation chances?", "Karz se mukti kab milegi?",
    "Stock market investment kaisa rahega?", "Property khareedne ke yog?", "Lottery kab lagegi?", "Dhan labh ke yog?", "Crypto trading profit?",
    "Karza kab utrega?", "Dhan aagman timing?", "Financial growth kab hogi?", "Property sale profit?"
  ],
  health: [
    "Health kaisi rahegi?", "Recovery kab hogi?", "Stress kab kam hoga?", "Fitness improve hogi?", "Swasthya kab thik hoga?",
    "Anxiety relief remedies?", "Recovery from surgery?", "Health guidelines for me?", "Swasthya swasth rahega?", "Bimari kab dur hogi?"
  ],
  foreign: [
    "Foreign kab jaunga?", "Visa kab lagega?", "PR kab milegi?", "Abroad settlement kab hoga?", "Videsh travel chances?",
    "Visa rejection potential?", "PR status timing?", "Abroad education scholarship?", "Videsh me settlement ke yog?", "Visa approval timing?"
  ],
  children: [
    "Santan kab hogi?", "Pregnancy ke yog hain?", "Family growth kab hogi?", "IVF treatment success?", "Beta hoga ya beti?",
    "Santan sukh kab milega?", "Pregnancy test timing?", "Bachche ki growth and future?", "Santan delay reason?", "Bachcha kab hoga?"
  ],
  dreams: [
    "Sapne me saanp dekhna?", "Sapne me mandir dekhna?", "Sapne me paani dekhna?", "Sapne me shivling dekhna?", "Sapne me saanp?",
    "Sapne me mandir?", "Sapne me paani?", "Sapne me shivling?", "Bure sapne se bachne ka upay?", "Sapna sach hota hai?"
  ],
  spiritual: [
    "Nazar lagi hai?", "Ghar me bhoot hai?", "Kala jadu hua hai?", "Mera isht dev kaun hai?", "Mantra jaap kaise karein?",
    "Vrat aur pooja niyam?", "Gemstone wear logic?", "Bhagya dosh aur nivaran?", "Nazar lagne ka upay?", "Bhoot pret ka saya?"
  ]
};

// Programmatic expansion to 100 questions per category
const generatedQuestions = [];
const expectedTopicMap = {};

for (const [category, templates] of Object.entries(categories)) {
  for (let i = 0; i < 100; i++) {
    const template = templates[i % templates.length];
    // Adding variations to make 1000 unique questions
    const suffix = i >= templates.length ? ` (Query ID: ${i})` : '';
    const q = `${template}${suffix}`;
    generatedQuestions.push(q);
    expectedTopicMap[q] = category;
  }
}

// Running Audit
console.log("==================================================");
console.log("          1000 USER QUESTIONS AUDIT               ");
console.log("==================================================\n");

let failures = 0;
let wrongRoutingCount = 0;
let rawScoresCount = 0;
let technicalTermsCount = 0;
let repeatedResponsesCount = 0;
let hallucinatedDatesCount = 0;

const printedSamples = new Map();
const generatedTexts = new Set();

for (let idx = 0; idx < generatedQuestions.length; idx++) {
  const q = generatedQuestions[idx];
  const expectedTopic = expectedTopicMap[q];

  // 1. Classification
  const classification = getTopicAndSubType(q);
  const detectedTopic = classification.topic;
  const tier = classification.tier;

  // Verify Routing
  let isWrongRouting = false;
  if (detectedTopic !== expectedTopic) {
    // Some pregnancy questions map to children or foreign, check if it's a real bug
    // E.g. "Pregnancy ke yog" matches Children. If expected Children but got Children, correct.
    // If it classified "Pregnancy" as foreign (due to PR), that is a bug.
    // E.g. "Ghar me bhoot" matches Nazar. If expected Spiritual/Nazar but got Nazar, correct.
    // Let's check matching categories:
    const dailyIntents = ["daily"];
    const loveIntents = ["love"];
    const marriageIntents = ["marriage"];
    const careerIntents = ["career"];
    const moneyIntents = ["money"];
    const healthIntents = ["health"];
    const foreignIntents = ["foreign"];
    const childrenIntents = ["children"];
    const dreamIntents = ["dreams"];
    const spiritualIntents = ["spiritual", "nazar", "lucky"];

    let correct = false;
    if (expectedTopic === 'daily' && dailyIntents.includes(detectedTopic)) correct = true;
    else if (expectedTopic === 'love' && loveIntents.includes(detectedTopic)) correct = true;
    else if (expectedTopic === 'marriage' && marriageIntents.includes(detectedTopic)) correct = true;
    else if (expectedTopic === 'career' && careerIntents.includes(detectedTopic)) correct = true;
    else if (expectedTopic === 'money' && moneyIntents.includes(detectedTopic)) correct = true;
    else if (expectedTopic === 'health' && healthIntents.includes(detectedTopic)) correct = true;
    else if (expectedTopic === 'foreign' && foreignIntents.includes(detectedTopic)) correct = true;
    else if (expectedTopic === 'children' && childrenIntents.includes(detectedTopic)) correct = true;
    else if (expectedTopic === 'dreams' && dreamIntents.includes(detectedTopic)) correct = true;
    else if (expectedTopic === 'spiritual' && spiritualIntents.includes(detectedTopic)) correct = true;

    if (!correct) {
      isWrongRouting = true;
      wrongRoutingCount++;
    }
  }

  // 2. Engine and Fallback Text
  const engineUsed = `${classification.tier === 1 ? 'Full' : classification.tier === 2 ? 'Specialty Tier 2' : 'Specialty Tier 3'} (${detectedTopic})`;
  const response = getFallbackAnswer(q, detectedTopic, tier, "Amit");

  // Verify constraints on response text
  let hasRawScore = false;
  // Rule: Do NOT output "score" (except in "Karma Score:")
  if (response.toLowerCase().includes("score")) {
    hasRawScore = true;
    rawScoresCount++;
  }

  let hasTechnicalTerm = false;
  // Rule: Never output: "window", "Lagnesh", etc.
  if (response.toLowerCase().includes("window") || response.toLowerCase().includes("lagnesh")) {
    hasTechnicalTerm = true;
    technicalTermsCount++;
  }

  let hasHallucinatedDate = false;
  // Rule: Raw date formats check (e.g. YYYY-MM)
  if (/\b\d{4}-\d{2}\b/.test(response)) {
    hasHallucinatedDate = true;
    hallucinatedDatesCount++;
  }

  // Repeated check
  let isRepeated = false;
  if (generatedTexts.has(response)) {
    // E.g., if many different daily queries produce the exact same text, it shows low variability.
    // Note: fallback templates will have some repetition, so this is just for metric analysis.
  }
  generatedTexts.add(response);

  // If any audit check failed, increment overall failures
  if (isWrongRouting || hasRawScore || hasTechnicalTerm || hasHallucinatedDate) {
    failures++;
    if (isWrongRouting) {
      console.log(`FAIL ROUTING: "${q}" -> Expected "${expectedTopic}" but got "${detectedTopic}"`);
    }
  }

  // Print first 2 questions per category as sample outputs
  if (!printedSamples.has(expectedTopic) || printedSamples.get(expectedTopic) < 2) {
    const currentCount = printedSamples.get(expectedTopic) || 0;
    printedSamples.set(expectedTopic, currentCount + 1);

    console.log(`Question        : "${q}"`);
    console.log(`Classifier Result: Tier ${classification.tier} (${detectedTopic})`);
    console.log(`Engine Used      : ${engineUsed}`);
    console.log(`Response         :\n${response.replace(/^/gm, '  ')}`);
    console.log(`--------------------------------------------------\n`);
  }
}

const failureRate = (failures / generatedQuestions.length) * 100;

console.log("==================================================");
console.log("                 AUDIT METRICS                    ");
console.log("==================================================");
console.log(`Total Audit Questions      : ${generatedQuestions.length}`);
console.log(`Wrong Routing Mismatches   : ${wrongRoutingCount}`);
console.log(`Raw Score Violations       : ${rawScoresCount}`);
console.log(`Jargon/Technical Violations: ${technicalTermsCount}`);
console.log(`Hallucinated Date Format   : ${hallucinatedDatesCount}`);
console.log(`Total Failures             : ${failures}`);
console.log(`Overall Failure Rate       : ${failureRate.toFixed(2)}%`);
console.log("==================================================");
