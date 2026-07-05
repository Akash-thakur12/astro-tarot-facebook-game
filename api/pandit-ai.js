import { generateAIResponse } from '../services/aiService.js';
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

export function isNonAstrologyQuestion(question) {
  if (!question) return false;
  const q = question.toLowerCase().trim();
  return NON_ASTROLOGY_PATTERNS.some(p => p.test(q)) || NON_ASTROLOGY_PATTERNS_DEV.some(p => p.test(question));
}

export const SEMANTIC_CATEGORIES = {
  career: {
    tier: 1,
    patterns: [
      { phrase: "life me kya karu", isStrong: true },
      { phrase: "life me kya karun", isStrong: true },
      { phrase: "future kya hoga", isStrong: true },
      { phrase: "career stable nahi", isStrong: true },
      { phrase: "job tikti nahi", isStrong: true },
      { phrase: "confused hu", isStrong: true },
      { phrase: "kis field me jaun", isStrong: true },
      { phrase: "kya line choose karu", isStrong: true },
      { phrase: "tarakki nahi ho rahi", isStrong: true },
      { phrase: "progress ruk gayi", isStrong: true },
      { phrase: "naukri kab milegi", isStrong: false },
      { phrase: "job kab lagegi", isStrong: false },
      { phrase: "promotion kab hoga", isStrong: false },
      { phrase: "vyapar me loss", isStrong: false },
      { phrase: "business growth kaise", isStrong: false },
      { phrase: "interview clear hoga", isStrong: false },
      { phrase: "tarakki kab milegi", isStrong: false },
      { phrase: "career guidelines", isStrong: false },
      { phrase: "government job milegi", isStrong: false },
      { phrase: "govt job lagne ke yog", isStrong: false },
      { phrase: "private job me growth", isStrong: false },
      { phrase: "business kaisa chalega", isStrong: false },
      { phrase: "new job search", isStrong: false },
      { phrase: "job change karu", isStrong: false },
      { phrase: "salary hike kab hoga", isStrong: false },
      { phrase: "career me problem", isStrong: false },
      { phrase: "dhandha nahi chal raha", isStrong: false },
      { phrase: "apna kaam kab shuru", isStrong: false },
      { phrase: "naukri chhoot gayi", isStrong: false },
      { phrase: "boss se pareshan", isStrong: false },
      { phrase: "job kab tak milegi", isStrong: true },
      { phrase: "business me safalta", isStrong: true }
    ]
  },
  marriage: {
    tier: 1,
    patterns: [
      { phrase: "pati ignore karta hai", isStrong: true },
      { phrase: "wife baat nahi karti", isStrong: true },
      { phrase: "rishte me problem hai", isStrong: true },
      { phrase: "ghar me ladai rehti hai", isStrong: true },
      { phrase: "sambandh kharab hai", isStrong: true },
      { phrase: "partner door ho gaya", isStrong: true },
      { phrase: "rishta tootne", isStrong: true },
      { phrase: "shadi kab hogi", isStrong: true },
      { phrase: "vivah kab hoga", isStrong: false },
      { phrase: "husband ignore", isStrong: false },
      { phrase: "wife ignore", isStrong: false },
      { phrase: "divorce", isStrong: false },
      { phrase: "second marriage", isStrong: false },
      { phrase: "shadi me delay", isStrong: false },
      { phrase: "rishta kab aayega", isStrong: false },
      { phrase: "love marriage hogi ya arrange", isStrong: false },
      { phrase: "kundli milan kaise", isStrong: false },
      { phrase: "life partner kaisa milega", isStrong: false },
      { phrase: "patni se anban", isStrong: false },
      { phrase: "pati se anban", isStrong: false },
      { phrase: "sasural me problem", isStrong: false },
      { phrase: "shadi me rukawat", isStrong: false },
      { phrase: "marry when", isStrong: false },
      { phrase: "when will I get married", isStrong: false },
      { phrase: "husband and wife fight", isStrong: false },
      { phrase: "rishta bar bar tootna", isStrong: false },
      { phrase: "shadi ke yog kab hain", isStrong: false },
      { phrase: "vivaah ki pareshani", isStrong: false },
      { phrase: "marriage compatibility", isStrong: false },
      { phrase: "jeevansathi kaisa hoga", isStrong: false },
      { phrase: "rishta pakka kab hoga", isStrong: false },
      { phrase: "pati patni me pyar kaise badhe", isStrong: true },
      { phrase: "rishte tootne ki kagar par", isStrong: true }
    ]
  },
  love: {
    tier: 2,
    patterns: [
      { phrase: "relationship toot", isStrong: true },
      { phrase: "relationship toot raha hai", isStrong: true },
      { phrase: "ex back", isStrong: true },
      { phrase: "partner love", isStrong: true },
      { phrase: "breakup", isStrong: true },
      { phrase: "patch up", isStrong: true },
      { phrase: "patchup", isStrong: true },
      { phrase: "patch-up", isStrong: true },
      { phrase: "ex gf", isStrong: true },
      { phrase: "ex girlfriend", isStrong: true },
      { phrase: "wapis", isStrong: true },
      { phrase: "bapis", isStrong: true },
      { phrase: "vaapis", isStrong: true },
      { phrase: "reunion", isStrong: true },
      { phrase: "ex", isStrong: true },
      { phrase: "ex boyfriend", isStrong: true },
      { phrase: "move on", isStrong: true },
      { phrase: "move-on", isStrong: true },
      { phrase: "dhokha", isStrong: true },
      { phrase: "relationship status", isStrong: true },
      { phrase: "crush like me", isStrong: true },
      { phrase: "saccha pyaar", isStrong: true },
      { phrase: "pyaar kab milega", isStrong: true },
      { phrase: "he loves me or not", isStrong: false },
      { phrase: "she loves me or not", isStrong: false },
      { phrase: "bf ignore karta hai", isStrong: false },
      { phrase: "gf ignore karti hai", isStrong: false },
      { phrase: "boyfriend se ladai", isStrong: false },
      { phrase: "girlfriend se ladai", isStrong: false },
      { phrase: "love life problems", isStrong: false },
      { phrase: "partner dhokha de raha hai", isStrong: false },
      { phrase: "pyaar me safalta", isStrong: false },
      { phrase: "ex partner wapas aayega", isStrong: false },
      { phrase: "breakup se kaise nikle", isStrong: false },
      { phrase: "pyaar pane ke upay", isStrong: false },
      { phrase: "crush se baat kaise karu", isStrong: false },
      { phrase: "partner feelings for me", isStrong: false },
      { phrase: "dhokha mila hai", isStrong: false },
      { phrase: "pyaar me dard", isStrong: false },
      { phrase: "will ex text me", isStrong: false },
      { phrase: "relationship issues", isStrong: false },
      { phrase: "gf se anban", isStrong: false },
      { phrase: "bf se anban", isStrong: false },
      { phrase: "love prediction", isStrong: false },
      { phrase: "pyaar me kismat kaisi", isStrong: true },
      { phrase: "sacha pyar kab milega", isStrong: true }
    ]
  },
  money: {
    tier: 2,
    patterns: [
      { phrase: "paise problem", isStrong: false },
      { phrase: "paise ki problem", isStrong: false },
      { phrase: "paisa problem", isStrong: false },
      { phrase: "paise tikte nahi", isStrong: true },
      { phrase: "karz", isStrong: true },
      { phrase: "debt", isStrong: true },
      { phrase: "lottery", isStrong: true },
      { phrase: "wealth", isStrong: true },
      { phrase: "income kam", isStrong: true },
      { phrase: "financial crisis", isStrong: true },
      { phrase: "paisa kab aayega", isStrong: true },
      { phrase: "dhan labh", isStrong: true },
      { phrase: "paise ki dikkat", isStrong: false },
      { phrase: "paisa paani ki tarah beh raha hai", isStrong: false },
      { phrase: "karz se mukti", isStrong: false },
      { phrase: "loan clear kab hoga", isStrong: false },
      { phrase: "bankrupt ho gaya", isStrong: false },
      { phrase: "paisa fasa hua hai", isStrong: false },
      { phrase: "income badhane ke upay", isStrong: false },
      { phrase: "wealth generation", isStrong: false },
      { phrase: "paisa kab tikega", isStrong: false },
      { phrase: "dhan ki kami", isStrong: false },
      { phrase: "financial support", isStrong: false },
      { phrase: "money problem", isStrong: false },
      { phrase: "karza badh raha hai", isStrong: false },
      { phrase: "financial pressure", isStrong: false },
      { phrase: "ghar ka kharcha", isStrong: false },
      { phrase: "ameer kab banunga", isStrong: false },
      { phrase: "money flow", isStrong: false },
      { phrase: "financial growth", isStrong: false },
      { phrase: "paisa kaise bachayein", isStrong: false },
      { phrase: "udhar diya paisa kab milega", isStrong: false },
      { phrase: "dhan vridhi ke upay", isStrong: false },
      { phrase: "paise ki tangi chal rahi hai", isStrong: true },
      { phrase: "dhan kismat me kab hai", isStrong: true }
    ]
  },
  health: {
    tier: 2,
    patterns: [
      { phrase: "mann pareshan hai", isStrong: true },
      { phrase: "mann bahut pareshan", isStrong: true },
      { phrase: "bimari", isStrong: true },
      { phrase: "health issues", isStrong: true },
      { phrase: "disease", isStrong: true },
      { phrase: "surgery", isStrong: true },
      { phrase: "mental stress", isStrong: true },
      { phrase: "depression", isStrong: true },
      { phrase: "recovery", isStrong: true },
      { phrase: "health improve", isStrong: true },
      { phrase: "weight loss", isStrong: true },
      { phrase: "swasthya kharab", isStrong: false },
      { phrase: "illness", isStrong: false },
      { phrase: "disease cure", isStrong: false },
      { phrase: "physical weakness", isStrong: false },
      { phrase: "anxiety attacks", isStrong: false },
      { phrase: "operation kab hoga", isStrong: false },
      { phrase: "recovery from illness", isStrong: false },
      { phrase: "bimari se chhutkara", isStrong: false },
      { phrase: "swasthya thik nahi rehta", isStrong: false },
      { phrase: "maan pareshan rehta hai", isStrong: false },
      { phrase: "stress bahut hai", isStrong: false },
      { phrase: "health checkup", isStrong: false },
      { phrase: "mental peace kaise milegi", isStrong: false },
      { phrase: "bimari kab door hogi", isStrong: false },
      { phrase: "dawai asar nahi kar rahi", isStrong: false },
      { phrase: "health prediction", isStrong: false },
      { phrase: "weight gain tips", isStrong: false },
      { phrase: "neend nahi aati", isStrong: false },
      { phrase: "insomnia problem", isStrong: false },
      { phrase: "sharir me dard", isStrong: false },
      { phrase: "anxiety se mukti", isStrong: false },
      { phrase: "mann bahut pareshan rehta hai", isStrong: true },
      { phrase: "swasthya thik hone ke yog", isStrong: true }
    ]
  },
  family: {
    tier: 2,
    patterns: [
      { phrase: "family dispute", isStrong: true },
      { phrase: "ghar me kalesh", isStrong: true },
      { phrase: "parents health", isStrong: true },
      { phrase: "property dispute", isStrong: true },
      { phrase: "bhai behen se anban", isStrong: true },
      { phrase: "family peace", isStrong: true },
      { phrase: "ghar me shanti nahi hai", isStrong: false },
      { phrase: "mata pita se jhagda", isStrong: false },
      { phrase: "joint family problems", isStrong: false },
      { phrase: "ghar me ashanti", isStrong: false },
      { phrase: "family compatibility", isStrong: false },
      { phrase: "family support", isStrong: false },
      { phrase: "relative problems", isStrong: false },
      { phrase: "property batwara", isStrong: false },
      { phrase: "parivar me anban", isStrong: false },
      { phrase: "ghar walo se pareshan", isStrong: false },
      { phrase: "mummy ki health", isStrong: false },
      { phrase: "papa ki health", isStrong: false },
      { phrase: "sasur sasural", isStrong: false },
      { phrase: "ghar me negativity", isStrong: false },
      { phrase: "family conflicts", isStrong: false },
      { phrase: "bhaiyo me vivad", isStrong: false },
      { phrase: "parivar me shanti ke upay", isStrong: false },
      { phrase: "ghar ka vatavaran", isStrong: false },
      { phrase: "bahu se anban", isStrong: false },
      { phrase: "saas se jhagda", isStrong: false },
      { phrase: "family harmony", isStrong: false },
      { phrase: "family problem solve", isStrong: false },
      { phrase: "ghar me kalesh dur karne ke upay", isStrong: false },
      { phrase: "relative jealousy", isStrong: false },
      { phrase: "parivar me sukh shanti", isStrong: true },
      { phrase: "ghar me bar bar ladai", isStrong: true }
    ]
  },
  foreign: {
    tier: 2,
    patterns: [
      { phrase: "foreign jane ke yog", isStrong: true },
      { phrase: "foreign travel", isStrong: true },
      { phrase: "videsh yatra", isStrong: true },
      { phrase: "visa approval", isStrong: true },
      { phrase: "abroad study", isStrong: true },
      { phrase: "settle abroad", isStrong: true },
      { phrase: "pr card", isStrong: true },
      { phrase: "videsh me naukri", isStrong: false },
      { phrase: "abroad job opportunities", isStrong: false },
      { phrase: "videsh kab jaunga", isStrong: false },
      { phrase: "visa reject ho gaya", isStrong: false },
      { phrase: "foreign settlement yog", isStrong: false },
      { phrase: "travel abroad when", isStrong: false },
      { phrase: "videsh me padhai", isStrong: false },
      { phrase: "passport apply kiya kab milega", isStrong: false },
      { phrase: "green card processing", isStrong: false },
      { phrase: "abroad study visa", isStrong: false },
      { phrase: "videsh jane ke yog kab hai", isStrong: false },
      { phrase: "out of country travel", isStrong: false },
      { phrase: "foreign assignment", isStrong: false },
      { phrase: "videsh me business", isStrong: false },
      { phrase: "abroad life", isStrong: false },
      { phrase: "visa stuck problem", isStrong: false },
      { phrase: "videsh jane ke upay", isStrong: false },
      { phrase: "foreign client meeting", isStrong: false },
      { phrase: "shift to another country", isStrong: false },
      { phrase: "foreign passport", isStrong: false },
      { phrase: "videsh bhraman", isStrong: false },
      { phrase: "abroad tour", isStrong: false },
      { phrase: "foreign nationality", isStrong: false },
      { phrase: "overseas job", isStrong: false },
      { phrase: "videsh me basna", isStrong: true },
      { phrase: "visa kab milega", isStrong: true }
    ]
  },
  children: {
    tier: 2,
    patterns: [
      { phrase: "santan sukh", isStrong: true },
      { phrase: "bachha kab hoga", isStrong: true },
      { phrase: "pregnancy", isStrong: true },
      { phrase: "ivf success", isStrong: true },
      { phrase: "child future", isStrong: true },
      { phrase: "baby birth", isStrong: true },
      { phrase: "santan prapti ke yog", isStrong: false },
      { phrase: "child education", isStrong: false },
      { phrase: "pregnancy delay", isStrong: false },
      { phrase: "miscarriage concerns", isStrong: false },
      { phrase: "bachhe ki health", isStrong: false },
      { phrase: "ivf treatment", isStrong: false },
      { phrase: "conceiving issues", isStrong: false },
      { phrase: "bachha kab milega", isStrong: false },
      { phrase: "baby planning", isStrong: false },
      { phrase: "bachhe nahi ho rahe", isStrong: false },
      { phrase: "santan ki kismat", isStrong: false },
      { phrase: "beta hoga ya beti", isStrong: false },
      { phrase: "bachhe ka career", isStrong: false },
      { phrase: "child behaviour problems", isStrong: false },
      { phrase: "bachha padhai me kamzor hai", isStrong: false },
      { phrase: "bachhe ka padhai me mann", isStrong: false },
      { phrase: "first child prediction", isStrong: false },
      { phrase: "second child planning", isStrong: false },
      { phrase: "santan ki shadi", isStrong: false },
      { phrase: "bachhe ke dushprabhav", isStrong: false },
      { phrase: "child birth prediction", isStrong: false },
      { phrase: "pregnancy test positive", isStrong: false },
      { phrase: "santan dosh nivaran", isStrong: false },
      { phrase: "bachhe ki tarakki", isStrong: false },
      { phrase: "pregnancy conceiving", isStrong: true },
      { phrase: "bachhe ka bhavishya", isStrong: true }
    ]
  },
  future: {
    tier: 2,
    patterns: [
      { phrase: "future prediction", isStrong: true },
      { phrase: "agla saal kaisa hoga", isStrong: true },
      { phrase: "bhagya kab", isStrong: true },
      { phrase: "kismat kab badlegi", isStrong: true },
      { phrase: "success in life", isStrong: true },
      { phrase: "turning point", isStrong: true },
      { phrase: "sab kuch ruk sa gaya hai", isStrong: true },
      { phrase: "kismat me kya likha", isStrong: false },
      { phrase: "bhavishyafal", isStrong: false },
      { phrase: "coming years prediction", isStrong: false },
      { phrase: "mere sath kya hoga", isStrong: false },
      { phrase: "life change kab hogi", isStrong: false },
      { phrase: "acchhe din kab aayenge", isStrong: false },
      { phrase: "bad luck kab khatam", isStrong: false },
      { phrase: "good time when starting", isStrong: false },
      { phrase: "life prediction", isStrong: false },
      { phrase: "mera bhavishya kaisa", isStrong: false },
      { phrase: "success kab milegi", isStrong: false },
      { phrase: "future prospects", isStrong: false },
      { phrase: "destiny alignment", isStrong: false },
      { phrase: "luck support", isStrong: false },
      { phrase: "bhagya uday kab hoga", isStrong: false },
      { phrase: "kismat ka sath", isStrong: false },
      { phrase: "agla mahina kaisa", isStrong: false },
      { phrase: "what is written in my destiny", isStrong: false },
      { phrase: "future timeline", isStrong: false },
      { phrase: "life progression", isStrong: false },
      { phrase: "turning point of life", isStrong: false },
      { phrase: "bhavishya ki chinta", isStrong: false },
      { phrase: "bhagya badalne ke upay", isStrong: false },
      { phrase: "achha samay kab aayega", isStrong: true },
      { phrase: "bhavishya kaisa hoga", isStrong: true }
    ]
  },
  dreams: {
    tier: 3,
    patterns: [
      { phrase: "sapne me saanp", isStrong: true },
      { phrase: "dream meaning", isStrong: true },
      { phrase: "horror dream", isStrong: true },
      { phrase: "sapna dekhna", isStrong: true },
      { phrase: "nightmares", isStrong: true },
      { phrase: "dream interpretation", isStrong: false },
      { phrase: "sapne me pani dekhna", isStrong: false },
      { phrase: "sapne me mandir dekhna", isStrong: false },
      { phrase: "sapne me shivling", isStrong: false },
      { phrase: "sapne ka matlab", isStrong: false },
      { phrase: "bad dreams", isStrong: false },
      { phrase: "nightmares remedy", isStrong: false },
      { phrase: "sapne me mrityu", isStrong: false },
      { phrase: "dreaming about ex", isStrong: false },
      { phrase: "sapne me shadi", isStrong: false },
      { phrase: "strange dreams", isStrong: false },
      { phrase: "recurring dreams", isStrong: false },
      { phrase: "sapne me rona", isStrong: false },
      { phrase: "sapne me udna", isStrong: false },
      { phrase: "dream of falling", isStrong: false },
      { phrase: "sapne me khazana", isStrong: false },
      { phrase: "sapne me ghost", isStrong: false },
      { phrase: "night terrors", isStrong: false },
      { phrase: "sapne me pitru", isStrong: false },
      { phrase: "dream warning signs", isStrong: false },
      { phrase: "subah ka sapna", isStrong: false },
      { phrase: "sapne me durga maa", isStrong: false },
      { phrase: "sapne me kisi ki maut", isStrong: false },
      { phrase: "dream prediction", isStrong: false },
      { phrase: "sapno ka rahasya", isStrong: false },
      { phrase: "sapne me saap dekhna", isStrong: true },
      { phrase: "sapne me shiv ji", isStrong: true }
    ]
  },
  spiritual: {
    tier: 3,
    patterns: [
      { phrase: "isht dev", isStrong: true },
      { phrase: "mantra jaap", isStrong: true },
      { phrase: "pooja vidhi", isStrong: true },
      { phrase: "gemstone remedy", isStrong: true },
      { phrase: "dosh nivaran", isStrong: true },
      { phrase: "spiritual growth", isStrong: true },
      { phrase: "bhagwan ki bhakti", isStrong: false },
      { phrase: "mantra chanting", isStrong: false },
      { phrase: "kaal sarp dosh", isStrong: false },
      { phrase: "mangal dosh", isStrong: false },
      { phrase: "shani ki sadhesati", isStrong: false },
      { phrase: "gemstone recommendation", isStrong: false },
      { phrase: "pujas for success", isStrong: false },
      { phrase: "spiritual path", isStrong: false },
      { phrase: "god connection", isStrong: false },
      { phrase: "daan punya", isStrong: false },
      { phrase: "temple visiting", isStrong: false },
      { phrase: "shanti puja", isStrong: false },
      { phrase: "navgrah puja", isStrong: false },
      { phrase: "hanuman chalisa benefits", isStrong: false },
      { phrase: "spiritual awakening", isStrong: false },
      { phrase: "dharma karma", isStrong: false },
      { phrase: "dosh remedies", isStrong: false },
      { phrase: "lucky gemstone", isStrong: false },
      { phrase: "which mantra to chant", isStrong: false },
      { phrase: "kon sa mantra padhein", isStrong: false },
      { phrase: "vrat vidhi", isStrong: false },
      { phrase: "fasting rules", isStrong: false },
      { phrase: "kundalini awakening", isStrong: false },
      { phrase: "bhakti bhav", isStrong: false },
      { phrase: "mangal dosh ke upay", isStrong: true },
      { phrase: "kaal sarp dosh ke upay", isStrong: true }
    ]
  },
  vastu: {
    tier: 3,
    patterns: [
      { phrase: "vastu dosh", isStrong: true },
      { phrase: "house entrance vastu", isStrong: true },
      { phrase: "vastu remedies", isStrong: true },
      { phrase: "directions vastu", isStrong: true },
      { phrase: "bedroom vastu", isStrong: true },
      { phrase: "vastu tips for home", isStrong: false },
      { phrase: "kitchen vastu position", isStrong: false },
      { phrase: "vastu direction for cash box", isStrong: false },
      { phrase: "main gate vastu", isStrong: false },
      { phrase: "vastu corrections without demolition", isStrong: false },
      { phrase: "office vastu layout", isStrong: false },
      { phrase: "study room vastu", isStrong: false },
      { phrase: "vastu plants", isStrong: false },
      { phrase: "bathroom vastu", isStrong: false },
      { phrase: "vastu check for flat", isStrong: false },
      { phrase: "vastu layout plan", isStrong: false },
      { phrase: "sleeping direction vastu", isStrong: false },
      { phrase: "vastu for mirrors", isStrong: false },
      { phrase: "vastu dosh nivaran", isStrong: false },
      { phrase: "south facing house vastu", isStrong: false },
      { phrase: "north facing door vastu", isStrong: false },
      { phrase: "vastu color scheme", isStrong: false },
      { phrase: "vastu items for home", isStrong: false },
      { phrase: "vastu pyramid", isStrong: false },
      { phrase: "vastu remedies for finance", isStrong: false },
      { phrase: "plots vastu shape", isStrong: false },
      { phrase: "east facing house vastu", isStrong: false },
      { phrase: "vastu check online", isStrong: false },
      { phrase: "vastu expert guidance", isStrong: false },
      { phrase: "vastu dosh symptoms", isStrong: false },
      { phrase: "vastu shastra tips", isStrong: true },
      { phrase: "ghar ka vastu kaisa hona chahiye", isStrong: true }
    ]
  },
  numerology: {
    tier: 3,
    patterns: [
      { phrase: "lucky number", isStrong: true },
      { phrase: "birth number", isStrong: true },
      { phrase: "numerology reading", isStrong: true },
      { phrase: "radix number", isStrong: true },
      { phrase: "name spelling numerology", isStrong: true },
      { phrase: "life path number", isStrong: false },
      { phrase: "numerology calculator", isStrong: false },
      { phrase: "radix number calculation", isStrong: false },
      { phrase: "destiny number meaning", isStrong: false },
      { phrase: "lucky mobile number", isStrong: false },
      { phrase: "lucky vehicle number", isStrong: false },
      { phrase: "name change numerology", isStrong: false },
      { phrase: "birth date analysis", isStrong: false },
      { phrase: "lucky day according to date", isStrong: false },
      { phrase: "house number numerology", isStrong: false },
      { phrase: "numerology matching for marriage", isStrong: false },
      { phrase: "angel numbers meaning", isStrong: false },
      { phrase: "moolank kaisa nikalein", isStrong: false },
      { phrase: "bhagyank calculation", isStrong: false },
      { phrase: "numerology for career", isStrong: false },
      { phrase: "moolank prediction", isStrong: false },
      { phrase: "bhagyank prediction", isStrong: false },
      { phrase: "number compatibility", isStrong: false },
      { phrase: "repeating numbers meaning", isStrong: false },
      { phrase: "numerology charts", isStrong: false },
      { phrase: "lucky date of month", isStrong: false },
      { phrase: "name compatibility score", isStrong: false },
      { phrase: "numerology expert", isStrong: false },
      { phrase: "power of numbers", isStrong: false },
      { phrase: "personal year number", isStrong: false },
      { phrase: "moolank aur bhagyank", isStrong: true },
      { phrase: "apna lucky number kaise pata karein", isStrong: true }
    ]
  }
};

export function detectSemanticIntent(question) {
  if (!question) return null;

  // Normalize question
  const cleanQ = question.toLowerCase()
    .replace(/[?.!,:;()""']/g, "")
    .replace(/\s+/g, " ")
    .trim();

  let bestCategory = null;
  let maxScore = 0;

  for (const [category, categoryData] of Object.entries(SEMANTIC_CATEGORIES)) {
    let score = 0;

    for (const pattern of categoryData.patterns) {
      const normalizedPattern = pattern.phrase.toLowerCase()
        .replace(/[?.!,:;()""']/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (cleanQ === normalizedPattern) {
        score += 30;
      } else {
        const qWords = cleanQ.split(/\s+/);
        const pWords = normalizedPattern.split(/\s+/);
        const isMatch = pWords.every(pWord => qWords.includes(pWord));
        if (isMatch) {
          if (pattern.isStrong) {
            score += 20;
          } else {
            score += 10;
          }
        }
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  if (maxScore >= 20) {
    return {
      tier: SEMANTIC_CATEGORIES[bestCategory].tier,
      topic: bestCategory,
      confidence: maxScore
    };
  }

  return null;
}

const PRIORITY_ORDER = [
  'marriage',
  'career',
  'love',
  'money',
  'health',
  'family',
  'foreign',
  'children',
  'future',
  'dreams',
  'spiritual',
  'vastu',
  'numerology'
];

const KEYWORD_REGEXES = {
  career: /naukri|job|career|promotion|vyapar|business|salary|interview|tarakki|unnati/i,
  marriage: /shadi|vivah|marriage|marry|married|rishta|engagement|jeevan saathi/i,
  love: /pyaar|love|crush|\bex\b|relationship|partner|soulmate|breakup|patch up|patchup|reunion|wapas|bapis|vaapis|ex girlfriend|ex boyfriend|move on|move-on/i,
  money: /paisa|\bdhan\b|rich|crorepati|lottery|stock|crypto|property|karz|wealth|financial/i,
  health: /health|bimari|stress|mental|recovery|surgery|fitness|swasthya|swasth|anxiety/i,
  family: /family|ghar|parents|bhai|behen|property dispute/i,
  foreign: /videsh|foreign|visa|\bpr\b|abroad/i,
  children: /bachcha|bachche|baccha|bacche|bcha|bche|bache|santan|child|children|baby|family planning|offspring|pregnancy|ivf|beta|beti|family growth/i,
  future: /agla saal|6 mahine|kismat|turning point|success|future/i,
  dreams: /sapne|sapna|dream|saanp|paani|mandir|shivling/i,
  spiritual: /isht dev|mantra|vrat|pooja|gemstone|daan|bhagya|dosh/i,
  vastu: /vastu/i,
  numerology: /moolank|bhagyank|numerology|lucky (number|color|day|date|direction|mobile|vehicle)/i
};

export function detectMultiIntent(question) {
  if (!question) return { primary: null, secondary: [], scores: {}, confidence: 0 };

  const cleanQ = question.toLowerCase()
    .replace(/[?.!,:;()""']/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const scores = {};
  for (const cat of PRIORITY_ORDER) {
    scores[cat] = 0;
  }

  for (const [category, categoryData] of Object.entries(SEMANTIC_CATEGORIES)) {
    let score = 0;

    // 1. Keyword match: +5
    const regex = KEYWORD_REGEXES[category];
    if (regex && regex.test(cleanQ)) {
      score += 5;
    }

    // 2. Semantic patterns
    for (const pattern of categoryData.patterns) {
      const normalizedPattern = pattern.phrase.toLowerCase()
        .replace(/[?.!,:;()""']/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (cleanQ === normalizedPattern) {
        score += 30;
      } else {
        const qWords = cleanQ.split(/\s+/);
        const pWords = normalizedPattern.split(/\s+/);
        const isMatch = pWords.every(pWord => qWords.includes(pWord));
        if (isMatch) {
          if (pattern.isStrong) {
            score += 20;
          } else {
            score += 10;
          }
        }
      }
    }

    scores[category] = score;
  }

  const scoresOut = {};
  for (const [cat, val] of Object.entries(scores)) {
    if (val > 0) {
      scoresOut[cat] = val;
    }
  }

  const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);

  const sorted = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return PRIORITY_ORDER.indexOf(a[0]) - PRIORITY_ORDER.indexOf(b[0]);
    });

  let primary = null;
  const secondary = [];
  let confidence = 0;

  if (sorted.length > 0) {
    const [topTopic, topScore] = sorted[0];
    if (topScore >= 20) {
      primary = topTopic;
      if (totalScore > 0) {
        confidence = Math.round((topScore / totalScore) * 100);
      }

      for (let i = 1; i < sorted.length; i++) {
        const [cat, score] = sorted[i];
        if (score >= 20) {
          secondary.push(cat);
        }
      }
    }
  }

  return {
    primary,
    secondary,
    scores: scoresOut,
    confidence
  };
}

export function detectMultiSemanticIntent(question) {
  const res = detectMultiIntent(question);
  const secondaryObj = (res.secondary && res.secondary.length > 0)
    ? { topic: res.secondary[0], tier: SEMANTIC_CATEGORIES[res.secondary[0]].tier }
    : null;
  return {
    primary: res.primary ? { topic: res.primary, tier: SEMANTIC_CATEGORIES[res.primary].tier, confidence: res.scores[res.primary] } : null,
    secondary: secondaryObj,
    scores: res.scores
  };
}

export function getTopicAndSubType(question) {
  const result = _getTopicAndSubType(question);
  
  // Calculate matched keywords
  const q = (question || '').toLowerCase();
  const matchedKeywords = [];
  for (const [key, regex] of Object.entries(KEYWORD_REGEXES)) {
    if (regex.test(q)) {
      matchedKeywords.push(key);
    }
  }
  
  console.log(`[INTENT] Question: "${question}"`);
  console.log(`[INTENT] Intent: "${result.topic}"`);
  console.log(`[INTENT] Matched Keywords: ${JSON.stringify(matchedKeywords)}`);
  console.log(`[INTENT] Route Selected: Tier ${result.tier}, Topic: "${result.topic}"`);
  
  return result;
}

function _getTopicAndSubType(question) {
  const q = question.toLowerCase();

  if (isProfileAcknowledgementMessage(question)) {
    console.log("FINAL_TOPIC", "profile_acknowledgement");
    return { tier: 5, topic: 'profile_acknowledgement' };
  }

  if (isMemoryRecallMessage(question)) {
    console.log("FINAL_TOPIC", "memory_recall");
    return { tier: 6, topic: 'memory_recall' };
  }

  if (isNonAstrologyQuestion(question)) {
    console.log("FINAL_TOPIC", "non-astrology");
    return { tier: 4, topic: 'non-astrology' };
  }

  // 1. Multi-intent check
  const multi = detectMultiIntent(question);
  if (multi && multi.primary) {
    console.log("MULTI_INTENT_RESULT", JSON.stringify(multi));
    console.log("PRIMARY_INTENT", multi.primary);
    console.log("SECONDARY_INTENTS", JSON.stringify(multi.secondary));
    console.log("INTENT_CONFIDENCE", multi.confidence);
    console.log("FINAL_TOPIC", multi.primary);
    const tier = SEMANTIC_CATEGORIES[multi.primary].tier;
    return { tier, topic: multi.primary };
  }

  // 2. Semantic intent check
  const semantic = detectSemanticIntent(question);
  if (semantic) {
    console.log("SEMANTIC_INTENT_DETECTED", semantic.topic);
    console.log("SEMANTIC_SCORE", semantic.confidence);
    console.log("FINAL_TOPIC", semantic.topic);
    return { tier: semantic.tier, topic: semantic.topic };
  }

  // 3. Existing keyword routing
  // 1. Tier 1 - Full Engine
  if (/naukri|job|career|promotion|vyapar|business|salary|interview|tarakki|unnati/i.test(q))
    return { tier: 1, topic: 'career' };

  if (/shadi|vivah|marriage|marry|married|rishta|engagement|jeevan saathi/i.test(q))
    return { tier: 1, topic: 'marriage' };

  // 2. Nazar (Specific Tier 3)
  if (/nazar|negative|bhoot|kala jadu|atma|paranormal|darr/i.test(q))
    return { tier: 3, topic: 'nazar' };

  // 3. Specific Tier 2 Topics
  if (/pyaar|love|crush|\bex\b|relationship|partner|soulmate|breakup|patch up|patchup|reunion|wapas|bapis|vaapis|ex girlfriend|ex boyfriend|move on|move-on/i.test(q))
    return { tier: 2, topic: 'love' };

  if (/paisa|\bdhan\b|rich|crorepati|lottery|stock|crypto|property|karz|wealth|financial/i.test(q))
    return { tier: 2, topic: 'money' };

  if (/health|bimari|stress|mental|recovery|surgery|fitness|swasthya|swasth|anxiety/i.test(q))
    return { tier: 2, topic: 'health' };

  if (/videsh|foreign|visa|\bpr\b|abroad/i.test(q))
    return { tier: 2, topic: 'foreign' };

  if (/bachcha|bachche|baccha|bacche|bcha|bche|bache|santan|child|children|baby|family planning|offspring|pregnancy|ivf|beta|beti|family growth/i.test(q))
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

export function isProfileAcknowledgementMessage(text) {
  if (!text) return false;
  const normalized = normalizeText(text);

  const ackPhrases = [
    'apko pata hai', 'apko pta hai', 'yaad hai', 'do you know', 'remember',
    'maine bataya tha', 'tumhe yaad hai', 'kya tum jante ho', 'tumhe pata hai', 'tumhe pta hai'
  ];

  const profileKeywords = [
    'shadi', 'shaadi', 'married', 'job', 'naukri', 'sarkari', 'work', 'occupation',
    'janm', 'birth', 'dob', 'place', 'sthan', 'time', 'samay', 'financial', 'loan',
    'karz', 'karza', 'children', 'bachcha', 'baccha', 'child', 'gender', 'name'
  ];

  const hasAck = ackPhrases.some(phrase => normalized.includes(phrase));
  const hasProfile = profileKeywords.some(keyword => normalized.includes(keyword));

  const directConfirms = [
    'shaadi ho chuki hai na', 'shadi ho chuki hai na', 'vivahit hu na', 'married hu na'
  ];
  const hasDirectConfirm = directConfirms.some(pattern => normalized.includes(pattern));

  return (hasAck && hasProfile) || hasDirectConfirm;
}

export function detectDirectRecallKey(text) {
  if (!text) return null;
  const normalized = normalizeText(text);

  if (normalized.includes('mera naam') || normalized.includes('my name')) return 'name';
  
  if (normalized.includes('mera dob') || normalized.includes('my dob') || normalized.includes('meri dob') || 
      normalized.includes('birth date') || normalized.includes('janm tithi') || normalized.includes('janam tithi')) return 'dob';
      
  if (normalized.includes('janm sthan') || normalized.includes('janam sthan') || 
      normalized.includes('birthplace') || normalized.includes('birth place') || normalized.includes('pob')) return 'pob';
      
  if (normalized.includes('meri age') || normalized.includes('my age') || 
      normalized.includes('umar kitni') || normalized.includes('umar kya')) return 'age';
      
  if (normalized.includes('mai kya kaam') || normalized.includes('mai kya kam') || 
      normalized.includes('mera occupation') || normalized.includes('my occupation') || 
      normalized.includes('meri occupation') || normalized.includes('meri naukri') || 
      normalized.includes('my job') || normalized.includes('mera job')) return 'occupation';
      
  if (normalized.includes('kitne bachche') || normalized.includes('kitne bacche') || 
      normalized.includes('kitne child') || normalized.includes('how many kids') || 
      normalized.includes('how many children')) return 'children';

  return null;
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

export function isMemoryRecallMessage(text) {
  if (!text) return false;
  const normalized = normalizeText(text);

  const patterns = [
    'mere baare me', 'mere bare me',
    'kya bataya tha', 'maine bataya',
    'profile summarize', 'mujhe yaad dilao'
  ];

  return patterns.some(pattern => normalized.includes(pattern));
}

export function detectGreetingIntent(question) {
  if (!question) {
    return {
      greetingDetected: false,
      confidence: 0,
      greetingPart: "",
      remainingQuestion: ""
    };
  }

  const normalized = normalizeText(question);

  const GREETING_PATTERN_REGEX = /^(?:hiii|hii|hi|hello|hey|hlo|helo|namaste|namaskar|pranam|pranaam|charan\s*sparsh|vanakkam|adab|assalamualaikum|sat\s*sri\s*akal|good\s*(?:morning|evening|night|afternoon)|ram\s*ram|ramram|radhe\s*radhe|radheradhe|guruji|pandit\s*ji|panditji|pandi\s*ji|pandiji|baba|guru\s*ji|bholenath|bhole\s*nath|har\s*har\s*mahadev|jai\s*shiv\s*shankar|jai\s*mata\s*di|radhe\s*krishna|jai\s*shree\s*ram|jai\s*bholenath|jay\s*shree\s*ram|om\s*namah\s*shivaya?|waheguru|जय\s*श्री\s*राम|राधे\s*राधे|नमस्ते|राम\s*राम|प्रणाम|guru\s*ji|guru\s*ji|गुरु\s*जी|गुरुजी|पंडित\s*जी|पंडितजी|बाबा|हर\s*हर\s*महादेव|जय\s*माता\s*दी|राधे\s*कृष्ण|सत\s*श्री\s*अकाल|अस्सलाम\s*अलैकुम|शुभ\s*प्रभात|शुभ\s*रात्रि|(?:jai|jay|har\s+har|om|shree|sri|shri|radhe|radhey|hare|bol|bolo)\s+(?:ram|shyam|krishna|shiva|shiv|shankar|mahadev|bholenath|bhole\s+nath|mata\s+di|durga|laxmi|ganesh|hanuman|sai|radha|radhe|krishna|gurudev|guru|waheguru|shiv\s+shankar|shiv\s+shambhu|mahabali|sita\s+ram)(?:\s+ki\s+jai)?|ji|ji\s+pranam|ji\s+namaste)/i;

  let currentText = normalized;
  let accumulatedGreeting = [];
  let detected = false;

  let matchedThisLoop = true;
  while (matchedThisLoop && currentText.length > 0) {
    matchedThisLoop = false;

    const match = currentText.match(GREETING_PATTERN_REGEX);
    if (match) {
      const matchText = match[0];
      const nextChar = currentText.substring(matchText.length, matchText.length + 1);
      if (nextChar === "" || /^[,\s!?.\-]/.test(nextChar)) {
        accumulatedGreeting.push(matchText);
        currentText = currentText.substring(matchText.length).trim().replace(/^[,\s!?.-]+/, "").trim();
        detected = true;
        matchedThisLoop = true;
      }
    }
  }

  const remaining = currentText;
  const greetingPart = accumulatedGreeting.join(" ").trim();
  const confidence = detected ? (remaining === "" ? 100 : 80) : 0;

  return {
    greetingDetected: detected,
    confidence,
    greetingPart,
    remainingQuestion: remaining
  };
}

function isGreetingMessage(text) {
  const res = detectGreetingIntent(text);
  return res.greetingDetected && res.remainingQuestion === "";
}

function isVagueMessage(text) {
  if (!text) return false;
  const normalized = normalizeText(text);

  const shortVaguePhrases = new Set([
    'help', 'help me', 'question', 'query', 'doubt', 'sawal', 'sawal hai', 'ek sawal', 'prashna', 'prashn',
    'kya', 'batao', 'btao', 'suno', 'bolo', 'ek baat', 'ek bat', 'madad', 'hmm', 'accha', 'achha',
    'meri baat suno', 'meri bat suno', 'kuch puchna hai', 'kuch puchna tha', 'kuch puchna thi',
    'ek baat puchni hai', 'ek baat puchni thi', 'ek bat puchni hai', 'ek bat puchni thi',
    'mujhe ek sawal puchna hai', 'muje ek sawal puchna hai', 'mje ek sawal puchna hai',
    'kuch puchna tha', 'kuch puchna thi', 'kuch puchna hai',
    'मदद', 'क्या', 'बताओ', 'सुनो', 'बोलो', 'एक बात', 'एक सवाल', 'सवाल', 'प्रश्न', 'मेरी बात सुनो',
    'मुझे एक सवाल पूछना है', 'एक बात पूछनी है', 'सवाल पूछना है', 'कुछ पूछना है', 'कुछ पूछना था',
    'ramram', 'radheradhe'
  ]);

  if (shortVaguePhrases.has(normalized)) {
    return true;
  }

  const vagueKeywords = [
    'puchna', 'puchni', 'puchu', 'puch', 'pucho', 'pooch', 'poochhna', 'poochh',
    'ask', 'question', 'sawal', 'baat', 'bat', 'query', 'doubt', 'help', 'madad',
    'suno', 'bolo', 'batao', 'bataiye', 'kya', 'btao', 'prashna', 'prashn', 'bolna',
    'kehna', 'kahna', 'chahiye', 'bata', 'puchha', 'puchhi', 'puchhu', 'puchhe',
    'पूछना', 'पूछनी', 'पूछूं', 'पूछ', 'सवाल', 'बात', 'मदद', 'सुनो', 'बोलो', 'बताओ', 'बताइए', 'क्या', 'प्रश्न', 'पूछा', 'पूछी', 'पूछे'
  ];

  const hasVagueKeyword = vagueKeywords.some(keyword => normalized.includes(keyword));
  if (!hasVagueKeyword) {
    return false;
  }

  const specificKeywords = [
    'career', 'job', 'shadi', 'marriage', 'vivah', 'vivaah', 'finance', 'money', 'paisa', 'wealth',
    'health', 'disease', 'bimari', 'doctor', 'promotion', 'business', 'loss', 'profit', 'naukri', 'tarakki',
    'exam', 'study', 'ssc', 'upsc', 'ias', 'ips', 'police', 'court', 'dispute', 'case',
    'child', 'baby', 'bacha', 'baccha', 'pregnancy', 'travel', 'foreign', 'abroad', 'videsh', 'visa',
    'kundali', 'birth', 'placements', 'dasha', 'house', 'rashi', 'nakshatra', 'lagna', 'dhaiya', 'sadesati',
    'gochar', 'transit', 'manglik', 'kundli', 'love', 'pyar', 'spouse', 'wife', 'husband', 'patni', 'pati',
    'family', 'mummy', 'papa', 'parents', 'brother', 'sister', 'dost', 'friend', 'shatru', 'enemy',
    'नौकरी', 'शादी', 'विवाह', 'करियर', 'बिजनेस', 'पैसा', 'स्वास्थ्य', 'बच्चा', 'विदेश', 'दशा', 'घर',
    'राशि', 'नक्षत्र', 'लग्न', 'प्यार', 'पति', 'पत्नी', 'परिवार', 'दुश्मन', 'lucky', 'luck', 'bhagya',
    'fortune', 'destiny', 'remedy', 'upay', 'upae', 'mantra', 'gemstone', 'stone',
    'patchup', 'patch-up', 'patch up', 'ex', 'ex gf', 'ex girlfriend', 'breakup', 'wapis', 'bapis'
  ];

  const hasSpecificKeyword = specificKeywords.some(keyword => normalized.includes(keyword));
  if (hasSpecificKeyword) {
    return false;
  }

  const wordCount = normalized.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount <= 8) {
    return true;
  }

  return false;
}

export function extractGreeting(question) {
  const res = detectGreetingIntent(question);
  return {
    greetingDetected: res.greetingDetected,
    greeting: res.greetingPart || null,
    remainingQuestion: res.remainingQuestion
  };
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
    const questionTextRaw = userData.question || '';
    if (!questionTextRaw.trim()) {
      const currentLang = userData.currentLanguage || 'English';
      const emptyText = currentLang === 'Hindi'
        ? "कृपया अपना प्रश्न पूछें। (Please ask your question.)"
        : "Please ask your question.";
      return res.status(200).json({ text: emptyText });
    }

    const selfHarmKeywords = /\b(suicide|self-harm|kill myself|harm myself|end my life|die|zehar|zeher|atmahatya|mar jau|mar jaunga)\b/i;
    if (selfHarmKeywords.test(questionTextRaw)) {
      return res.status(200).json({
        text: "I cannot answer queries related to self-harm or suicide. Please contact a helpline for support (AASRA: 91-9820466726)."
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

  let languagePreference = "";
  if (resolvedLanguage === 'English') {
    languagePreference = "English (Latin/Roman script). Write the entire response in English.";
  } else {
    languagePreference = "Devanagari Hindi script (हिन्दी). Write the entire response in pure Hindi. Never use Roman Hindi or English.";
  }

  let cosmicHeading = "🌟 **The Cosmic Truth**";
  let frictionHeading = "⚡ **The Hidden Friction**";
  let powerHeading = "🔮 **Your Next Power Move**";

  if (resolvedLanguage !== 'English') {
    cosmicHeading = "🌟 **ब्रह्मांडीय संकेत**";
    frictionHeading = "⚡ **छिपा हुआ कारण**";
    powerHeading = "🔮 **आपका अगला कदम**";
  }

  const isGreeting = isGreetingMessage(questionText);
  const isProfileAck = isProfileAcknowledgementMessage(questionText);
  const isMemoryRecall = isMemoryRecallMessage(questionText);
  const isVague = !isProfileAck && !isMemoryRecall && !wasAwaitingClarification && !isRelationshipInvestigationQuery && isVagueMessage(questionText);



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
          promptSections.push(buildAstrologyBlock(astroData));
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

    let classification = getTopicAndSubType(questionText);
    if (isRelationshipInvestigationQuery) {
      classification = { tier: 2, topic: 'love' };
    }
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

    // Context Isolation Rule: Only include partnerData for love/compatibility/marriage topics,
    // or when the query explicitly asks about the partner/relationship.
    const relationshipKeywords = /partner|husband|wife|spouse|girlfriend|boyfriend|relationship|relation|shadi|shaadi|marriage|vivaah|vivah|love|pyar|pyaar|compatibility|cheat|affair|third\s*person|extra\s*marital|loyalty|faithfulness|chakkar/i;
    const isExplicitRelationshipQuery = relationshipKeywords.test(questionText);
    const isRelationshipTopic = ['love', 'marriage', 'compatibility', 'relationship_return', 'partner_loyal'].includes(questionTopic);
    const includePartnerData = isRelationshipTopic || isExplicitRelationshipQuery;
    const partnerData = includePartnerData ? (userData?.p2 || userData?.partner || null) : null;

    const aiContext = {
      primaryTopic,
      kundliData,
      loveData,
      moneyData,
      healthData,
      tarotData,
      userMemory,
      profileData,
      conversationHistory,
      partnerData
    };

    let tier1Data = null;
    if (tierType === 1) {
      tier1Data = calculateTier1Data(questionTopic, astroData);
    }

    const hasCalculatedData = !!(astroData || (loveData && loveData.loveScore) || (moneyData && moneyData.wealthScore) || (healthData && healthData.vitalityScore) || tarotData);

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
      systemInstruction = `
You are "AstroOracle", an elite, deeply intuitive, and charismatic Astrologer and Tarot Reader. You control tone, formatting, readability, engagement, and structure (acting purely as a presentation layer, and must NOT override routing, calculations, or validations).

### CORE IDENTITY:
You read the astrological and situational context, not just generic charts. You provide profound, empathetic guidance based on available evidence, relationship indicators, and chart details. You NEVER lie about astrology.

### INPUT:
USER: ${name}, DOB: ${dob || 'Not Provided'}
AI_CONTEXT: ${JSON.stringify(aiContext)}
CURRENT: ${todayFormatted}, ${dayOfWeek}, ${currentYear}

### DATA AVAILABILITY & ACCURACY RULES:
${hasCalculatedData ? `
- Valid astrology/engine calculations are AVAILABLE in AI_CONTEXT.
- You MUST NOT say "DOB do", "Janam vivaran hai nahi", "Janam vivaran ke bina", "Janam vivaran nahi hai", "Data nahi mila", or ask for birth details.
- Use the relevant engine data (e.g., loveData for love topic, moneyData for money/finance topic, etc.) as the PRIMARY evidence source.
- Use memory, profile data, conversation history, astrology context, and supporting engine outputs as secondary context.
- Never contradict computed engine data.
- IF AI_CONTEXT.kundliData contains Mahadasha/Antardasha details, you may mention them. If they are absent, do NOT invent them.
- When answering relationship queries, you are explicitly allowed to use and describe compatibility, reunion signals, relationship timing, emotional compatibility, and relationship obstacles from the provided loveData.
- Do NOT expose raw numerical scores (e.g., do NOT output "Reunion chance = 85%", "Marriage score = 80", or "Success probability = 81%"). Instead, translate them qualitatively:
  * Under 50: weak signal
  * 50-79: moderate signal
  * 80-89: strong signal
  * 90+: very strong signal
` : `
- No birth details or engine calculations are available.
- You MUST acknowledge honestly: "Janam vivaran ke bina main grah ki exact position nahi dekh paungi".
- Do NOT invent or make up specific dates, dasha names, planet positions, or numerical scores.
- You may politely invite the user to provide their birth details (DOB, birth time, and birth place) to calculate their exact mahadasha.
`}

### PSYCHIC LIMITS:
Avoid psychic claims or language implying supernatural certainty. Do NOT use phrases like "I can sense energy", "I feel your aura", "The universe told me", or "I know what they think". Replace with:
- "Based on your question..."
- "Based on available astrology signals..."
- "Based on relationship indicators..."
- "Based on the current context..."
${isRelationshipInvestigationQuery ? `
### RELATIONSHIP INVESTIGATION FLOW (HIGH ENGAGEMENT MODE):
- The user is asking about cheating, affair, third person, extra marital relation, loyalty, or faithfulness.
- You must perform a deep, emotionally compelling, and highly engaging analysis based on the available partner details (partnerData) and love/compatibility calculations (loveData).
- You MUST NOT reply with refusing or evasive phrases like "I cannot know" or "I don't have enough information".
- Instead, focus on allowed deep themes:
  * Hidden influence
  * Emotional distance
  * Third-party interference signals
  * Mixed intentions
  * Trust imbalance
  * Unspoken emotions
  * Communication blockage
- Analyze and discuss:
  * Compatibility analysis
  * Relationship indicators
  * Trust indicators
  * Communication indicators
  * Emotional compatibility
- CRITICAL SAFETY LIMITS:
  * Do NOT state "affair confirmed" or "cheating confirmed" or "third person confirmed".
  * Instead use soft indicators: "strong indications", "signals", "patterns", "possibility", "influence".
  * Make the response feel deep, personal, and mysterious without presenting speculation as proven fact.
- Keep the MANDATORY response structure:
  * ${cosmicHeading}: Give a strong, emotionally compelling interpretation using available metrics.
  * ${frictionHeading}: Identify the relationship tension and emotional blocks.
  * ${powerHeading}: Provide 1 practical, specific action.
  * **FINAL LINE - CURIOSITY HOOK**: Ask 1 natural question.
` : ''}

### RESPONSE STRUCTURE - MANDATORY:

${cosmicHeading}
[Read the situation. Use the relevant engine data from AI_CONTEXT as the primary evidence source. If no calculations exist, use universal archetypes + topic wisdom. Use **bold** for 2 key insights. Be specific about feelings/indications, not fake dates.]

${frictionHeading}
[Name the real emotional/psychological block user is facing in ${topic}. Make them feel understood.]

${powerHeading}
[Provide 1 practical, specific action or remedy from the available context or daily/universal guidelines. No generic "sab theek hoga".]

**FINAL LINE - CURIOSITY HOOK:**
Ask 1 natural question. Examples:
"Kya aap jaanna chahenge ki is energy ka peak kab aayega?"
"Kya us vyakti ke dil me kya chal raha hai ye aur gehra dekhna chahenge?"

### BANNED PHRASES:
"Data not available", "vistaar se kundli dekhni padti hai", "shastra me kaha gaya hai", 
"Sab theek ho jayega", "Achhe din aane wale hain", "khatra", "maut", "barbaad"

TONE: Warm, Mystical, Confident, Human. 100-180 words.
`;
    }

    const forbiddenRulesBlock = `
=== FORBIDDEN RULES ===
- Do NOT output: "Data not available", "score" (except in "Karma Score:"), "window", exact dates without engine calculations, "khatra", "maut", "barbaad".
- For Tier 2 and Tier 3, you should naturally and conversationally reference relevant astrological factors (planets, transits, houses, dasha, nakshatra) based ONLY on the provided USER PROFILE and Astrology Data. The explanation must flow naturally as part of the guidance and reasoning, and you must NEVER output raw data dumps or overly technical chart lists.
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

IMPORTANT LANGUAGE RULE:
${languagePreference}
Never answer in any other language.
`;
    promptSections.push(priorityRulesBlock.trim());

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
        if (!needsRetry && !validateAstroResponse(validatedText, astroData, skipDashaPreservation)) {
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
          !validateAstroResponse(validatedRetryText, astroData, skipDashaPreservation);

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
        let completedResponse = await injectSecretAndScore(deduplicatedText, uid, userData, progress, getSecretCategory(detectedIntent));
        if (isGreeting || isVague) {
          completedResponse = completedResponse
            .replace(/🔮\s*Prediction:\s*/gi, "")
            .replace(/📿\s*Astrological\s*Reasoning:\s*/gi, "")
            .replace(/📿\s*Reasoning:\s*/gi, "")
            .replace(/🪔\s*Guidance:\s*/gi, "")
            .replace(/🪔\s*Upay:\s*/gi, "")
            .trim();
        }
        if (pastHistory.length > 0) {
          completedResponse = completedResponse.replace(
            /^(🔮\s*Prediction:\s*(?:\n\n)?)(?:Namaste\s+Beta|Pranam\s+Beta|Kalyan\s+ho\s+Beta|Beta,\s+aapka\s+swagat\s+hai|Aapka\s+swagat\s+hai|Beta\b,?\s*swagat\s+hai)[!.,\s\n]*/i,
            '$1'
          );
          completedResponse = completedResponse.replace(
            /^(?:Namaste\s+Beta|Pranam\s+Beta|Kalyan\s+ho\s+Beta|Beta,\s+aapka\s+swagat\s+hai|Aapka\s+swagat\s+hai|Beta\b,?\s*swagat\s+hai)[!.,\s\n]*/i,
            ''
          );
        }
        jsonResponse = {
          text: completedResponse
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
