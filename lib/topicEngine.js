import { TYPO_DICTIONARY } from './aiConfig.js';

export const TOPIC_MAPPING = {
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
  family: 'family',
  daily: 'daily',
  future: 'daily',
  compatibility: 'compatibility'
};

const PRIORITY_ORDER = [
  "marriage",
  "love",
  "career",
  "children",
  "money",
  "foreign",
  "health",
  "property",
  "spiritual",
  "numerology",
  "vastu",
  "future",
  "dreams"
];

const PROTECTED_INTENTS = [
  "marriage",
  "love",
  "career",
  "children"
];

const KEYWORD_REGEXES = {
  career: /naukri|job|career|promotion|vyapar|business|salary|interview|tarakki|unnati/i,
  marriage: /shadi|shaadi|shaddi|vivah|marriage|marry|married|rishta|engagement|jeevan saathi/i,
  love: /pyaar|love|crush|\bex\b|relationship|partner|soulmate|breakup|patch up|patchup|reunion|wapas|bapis|vaapis|ex girlfriend|ex boyfriend|move on|move-on/i,
  money: /paisa|\bdhan\b|rich|crorepati|lottery|stock|crypto|property|karz|wealth|financial/i,
  health: /health|bimari|stress|mental|recovery|surgery|fitness|swasthya|swasth|anxiety/i,
  family: /family|ghar|parents|bhai|behen|property dispute/i,
  foreign: /videsh|foreign|visa|\bpr\b|abroad/i,
  children: /bacha|bachcha|bachche|baccha|bacche|bcha|bche|bache|santan|child|children|baby|family planning|offspring|pregnancy|ivf|beta|beti|family growth/i,
  future: /agla saal|6 mahine|kismat|turning point|success|future/i,
  dreams: /sapne|sapna|dream|saanp|paani|mandir|shivling/i,
  spiritual: /isht dev|mantra|vrat|pooja|gemstone|daan|bhagya|dosh/i,
  vastu: /vastu/i,
  numerology: /moolank|bhagyank|numerology|lucky (number|color|day|date|direction|mobile|vehicle)/i
};

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
      { phrase: "name spelling modification", isStrong: false },
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

const NON_ASTROLOGY_PATTERNS = [
  /\b(code|coding|python|javascript|js|html|css|react|node|mongodb|sql|database|programming|algorithm|quicksort|merge sort|bubble sort|binary search|git|github|compile|compiler|runtime|bug|debug|api|endpoint|server|hosting|website|app development|developer|software|hardware|java|c\+\+|rust|golang|swift|kotlin|variables|loop|array|function|class|object|json|yaml|xml)\b/i,
  /\b(resume|cv|bio-data|biodata|cover letter|interview tips|resume template|resume tips|how to write a resume|portfolio)\b/i,
  /\b(marketing strategy|business model|startup pitch|pitch deck|how to start a company|venture capital|angel investor|seo optimization|conversion rate|b2b marketing|b2c marketing|swot analysis)\b/i,
  /\b(photosynthesis|periodic table|gravity|relativity|quantum|mitosis|meiosis|dna|rna|cellular|algebra|calculus|geometry|trigonometry|matrix|vector|equation|solve the equation|math problem|physics|chemistry|biology|geography|history|economics|civics|political science)\b/i,
  /\b(capital of|largest city|longest river|highest mountain|population of|distance between|how far is|who invented|who discovered|who wrote|author of|director of|cast of|release date of|how many bones|speed of light|speed of sound|formula of|definition of)\b/i,
  /\b(recipe|how to cook|how to make|ingredients for|workout plan|exercise for|calories in|weather in|weather today|news today|current events|how to repair|how to fix)\b/i,
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

export function isFollowUpMessage(text) {
  const q = (text || '').toLowerCase().trim();
  return (
    /^ji$/i.test(q) ||
    /^(ji\s+)?(hn|hnn|haan|yes|ok|okay)(\s+.*)?$/i.test(q) ||
    /^(ji\s+)?(batao|btaiye|aur batao|aur btaiye|next|detail|more)/i.test(q) ||
    /^(nhi|nahi|no|na\b|naa|bilkul|shayad|lagta hai|ho sakta hai|aisa kuch|aisa nahi)(?:\s+.*)?$/i.test(q)
  );
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
  const GREETING_PATTERN_REGEX = /^(?:hiii|hii|hi|hello|hey|hlo|helo|namaste|namaskar|pranam|pranaam|charan\s*sparsh|vanakkam|adab|assalamualaikum|sat\s*sri\s*akal|good\s*(?:morning|evening|night|afternoon)|ram\s*ram|ramram|radhe\s*radhe|radheradhe|guruji|pandit\s*ji|panditji|pandi\s*ji|panditji|pandiji|baba|guru\s*ji|bholenath|bhole\s*nath|har\s*har\s*mahadev|jai\s*shiv\s*shankar|jai\s*mata\s*di|radhe\s*krishna|jai\s*shree\s*ram|jai\s*bholenath|jay\s*shree\s*ram|om\s*namah\s*shivaya?|waheguru|जय\s*श्री\s*राम|राधे\s*राधे|नमस्ते|राम\s*राम|प्रणाम|guru\s*ji|गुरु\s*जी|गुरुजी|पंडित\s*जी|पंडितजी|बाबा|हर\s*हर\s*महादेव|जय\s*माता\s*दी|राधे\s*कृष्ण|सत\s*श्री\s*अकाल|अस्सलाम\s*अलैकुम|शुभ\s*प्रभात|शुभ\s*रात्रि|(?:jai|jay|har\s+har|om|shree|sri|shri|radhe|radhey|hare|bol|bolo)\s+(?:ram|shyam|krishna|shiva|shiv|shankar|mahadev|bholenath|bhole\s+nath|mata\s+di|durga|laxmi|ganesh|hanuman|sai|radha|radhe|krishna|gurudev|guru|waheguru|shiv\s+shankar|shiv\s+shambhu|mahabali|sita\s+ram)(?:\s+ki\s+jai)?|ji|ji\s+pranam|ji\s+namaste)/i;

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

export function isGreetingMessage(text) {
  const res = detectGreetingIntent(text);
  return res.greetingDetected && res.remainingQuestion === "";
}

export function isVagueMessage(text) {
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

export function getJaccardSimilarity(str1, str2) {
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

function normalizeIntentText(text) {
  if (!text) return "";
  let words = text.toLowerCase().trim().split(/\s+/);
  return words.map(word => {
    for (const [canonical, variants] of Object.entries(TYPO_DICTIONARY)) {
      if (variants.includes(word)) return canonical;
    }
    return word;
  }).join(' ');
}

export function detectMultiIntent(question) {
  if (!question) return { primary: null, secondary: [], overflow: [], scores: {}, confidence: 0 };

  const cleanQ = normalizeIntentText(question.toLowerCase()
    .replace(/[?.!,:;()""']/g, "")
    .replace(/\s+/g, " ")
    .trim());

  const scores = {};
  for (const cat of PRIORITY_ORDER) {
    scores[cat] = 0;
  }

  for (const [category, categoryData] of Object.entries(SEMANTIC_CATEGORIES)) {
    let score = 0;

    const regex = KEYWORD_REGEXES[category];
    if (regex && regex.test(cleanQ)) {
      score += 5;
    }

    let maxPatternScore = 0;
    for (const pattern of categoryData.patterns) {
      const normalizedPattern = normalizeIntentText(pattern.phrase.toLowerCase()
        .replace(/[?.!,:;()""']/g, "")
        .replace(/\s+/g, " ")
        .trim());

      if (cleanQ === normalizedPattern) {
        maxPatternScore = Math.max(maxPatternScore, 30);
      } else {
        const qWords = cleanQ.split(/\s+/);
        const pWords = normalizedPattern.split(/\s+/);
        const isMatch = pWords.every(pWord => qWords.includes(pWord));
        if (isMatch) {
          maxPatternScore = Math.max(maxPatternScore, pattern.isStrong ? 20 : 10);
        }
      }
    }
    score += maxPatternScore;
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
  const overflow = [];
  let confidence = 0;
  let primaryScore = 0;

  if (sorted.length > 0) {
    const matchedTopics = sorted.map(s => s[0]);
    const topScore = sorted[0][1];
    primaryScore = topScore;
    
    if (topScore >= 5) {
      const activeSet = new Set();
      for (const t of matchedTopics) {
        if (PROTECTED_INTENTS.includes(t) && activeSet.size < 5) {
          activeSet.add(t);
        }
      }
      for (const t of matchedTopics) {
        if (!PROTECTED_INTENTS.includes(t) && activeSet.size < 5) {
          activeSet.add(t);
        }
      }

      const activeTopics = matchedTopics.filter(t => activeSet.has(t));
      const overflowTopics = matchedTopics.filter(t => !activeSet.has(t));
      
      primary = activeTopics[0];
      for (let i = 1; i < activeTopics.length; i++) {
        secondary.push(activeTopics[i]);
      }
      for (const t of overflowTopics) {
        overflow.push(t);
      }
      if (totalScore > 0) {
        confidence = Math.round((topScore / totalScore) * 100);
      }
    }
  }

  return {
    primary,
    secondary,
    overflow,
    scores: scoresOut,
    primaryScore,
    confidence
  };
}

export function detectSemanticIntent(question) {
  if (!question) return null;

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
  const q = question.toLowerCase().trim();

  if (q.includes("property dispute resolution")) {
    return { tier: 2, topic: 'money' };
  }
  if (q.includes("aaj ka lucky number")) {
    return { tier: 2, topic: 'daily' };
  }

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

  const multi = detectMultiIntent(question);
  if (multi && multi.primary) {
    console.log("MULTI_INTENT_RESULT", JSON.stringify(multi));
    console.log("PRIMARY_INTENT", multi.primary);
    console.log("SECONDARY_INTENTS", JSON.stringify(multi.secondary));
    console.log("INTENT_CONFIDENCE", multi.confidence);
    console.log("FINAL_TOPIC", multi.primary);
    const tier = SEMANTIC_CATEGORIES[multi.primary].tier;
    return { tier, topic: multi.primary, secondary: multi.secondary, overflow: multi.overflow };
  }

  const semantic = detectSemanticIntent(question);
  if (semantic) {
    console.log("SEMANTIC_INTENT_DETECTED", semantic.topic);
    console.log("SEMANTIC_SCORE", semantic.confidence);
    console.log("FINAL_TOPIC", semantic.topic);
    return { tier: semantic.tier, topic: semantic.topic };
  }

  if (/naukri|job|career|promotion|vyapar|business|salary|interview|tarakki|unnati/i.test(q))
    return { tier: 1, topic: 'career' };

  if (/shadi|shaadi|shaddi|vivah|marriage|marry|married|rishta|engagement|jeevan saathi/i.test(q))
    return { tier: 1, topic: 'marriage' };

  if (/nazar|negative|bhoot|kala jadu|atma|paranormal|darr/i.test(q))
    return { tier: 3, topic: 'nazar' };

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

  if (/\baaj\b|\bkal\b|is hafte|is mahine|daily|lucky color|number|today/i.test(q))
    return { tier: 2, topic: 'daily' };

  if (/agla saal|6 mahine|kismat|turning point|success|future/i.test(q))
    return { tier: 2, topic: 'future' };

  if (/sapne|sapna|dream|saanp|paani|mandir|shivling/i.test(q))
    return { tier: 3, topic: 'dreams' };

  if (/isht dev|mantra|vrat|pooja|gemstone|daan|bhagya|dosh/i.test(q))
    return { tier: 3, topic: 'spiritual' };

  if (/lucky (number|color|day|date|direction|mobile|vehicle)/i.test(q))
    return { tier: 3, topic: 'lucky' };

  return { tier: 3, topic: 'general' };
}

function normalizeText(text) {
  if (!text) return "";
  let normalized = text.toLowerCase();
  normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"।|]/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ');
  return normalized.trim();
}

// ==========================================
// CORE TOPIC ENGINE API
// ==========================================

export function detectTopic(questionText) {
  const classification = getTopicAndSubType(questionText);
  const topic = TOPIC_MAPPING[classification.topic] || classification.topic;
  
  let confidence = 0.50;
  
  const multi = detectMultiIntent(questionText);
  if (multi && multi.primary && TOPIC_MAPPING[multi.primary] === topic) {
    confidence = multi.confidence / 100;
  } else if (classification.topic) {
    const sem = detectSemanticIntent(questionText);
    if (sem && sem.topic === classification.topic) {
      confidence = sem.confidence / 30;
    } else {
      const q = questionText.toLowerCase().trim();
      if (/naukri|job|career|promotion|vyapar|business|salary|interview|tarakki|unnati|shadi|shaadi|shaddi|vivah|marriage|marry|married|rishta|engagement|jeevan saathi|nazar|negative|bhoot|kala jadu|atma|paranormal|darr|pyaar|love|crush|\\bex\\b|relationship|partner|soulmate|breakup|patch up|patchup|reunion|wapas|bapis|vaapis|ex girlfriend|ex boyfriend|move on|move-on|paisa|\\bdhan\\b|rich|crorepati|lottery|stock|crypto|property|karz|wealth|financial|health|bimari|stress|mental|recovery|surgery|fitness|swasthya|swasth|anxiety|videsh|foreign|visa|\\bpr\\b|abroad|bachcha|bachche|baccha|bacche|bcha|bche|bache|santan|child|children|baby|family planning|offspring|pregnancy|ivf|beta|beti|family growth|family|ghar|parents|bhai|behen|property dispute|sapne|sapna|dream|saanp|paani|mandir|shivling|isht dev|mantra|vrat|pooja|gemstone|daan|bhagya|dosh|lucky (number|color|day|date|direction|mobile|vehicle)/i.test(q)) {
        confidence = 0.75;
      } else if (/\\baaj\\b|\\bkal\\b|is hafte|is mahine|daily|lucky color|number|today|agla saal|6 mahine|kismat|turning point|success|future/i.test(q)) {
        confidence = 0.65;
      }
    }
  }
  
  confidence = Math.min(Math.max(confidence, 0.0), 1.0);
  confidence = parseFloat(confidence.toFixed(2));


  const detected = [topic];
  if (classification.secondary) {
    classification.secondary.forEach(t => {
      const mapped = TOPIC_MAPPING[t] || t;
      if (!detected.includes(mapped)) {
        detected.push(mapped);
      }
    });
  }

  return {
    activeTopic: topic,
    confidence,
    detectedIntents: detected
  };
}

export function determineTargetLayer(activeTopic, shouldAdvance, topicProgress, revealedLayers = {}) {
  const currentProgressVal = topicProgress[activeTopic] || 1;
  let target = shouldAdvance ? Math.min(currentProgressVal + 1, 5) : currentProgressVal;
  
  // ANTI-REPETITION LAYER LOCK
  const topicRevealed = revealedLayers[activeTopic] || [];
  let isLocked = false;
  while (topicRevealed.includes(target) && target < 5) {
    target++;
    isLocked = true;
  }
  if (isLocked) {
    console.log("LAYER_LOCKED", activeTopic);
  }
  
  return target;
}

export function shouldAdvanceLayer(isFollowUpWord, isSameQuestion, isSemanticContinuation) {
  return !!(isFollowUpWord || isSameQuestion || isSemanticContinuation);
}

export function resolveMultiIntent(questionText) {
  const detected = detectTopic(questionText);
  const primary = detected.activeTopic;
  const secondary = detected.detectedIntents.find(t => t !== primary) || null;
  
  if (secondary) {
    console.log("MULTI_INTENT_DETECTED", detected.detectedIntents);
  }
  
  return {
    activeTopic: primary,
    secondaryTopic: secondary
  };
}

export function getTopicProgress(userDataDoc) {
  const defaultProgress = {
    marriage: 1, love: 1, career: 1, money: 1, health: 1, travel: 1, children: 1, daily: 1
  };
  return userDataDoc && userDataDoc.topicProgress 
    ? { ...defaultProgress, ...userDataDoc.topicProgress }
    : defaultProgress;
}

export function generateTopicState(questionText, lastActiveTopic, topicProgress, isFollowUpWord, lastUserMsgContent, savedMysteries = [], revealedLayers = {}) {
  const qClean = (questionText || "").toLowerCase().trim();
  
  const detection = detectTopic(questionText);
  const matchedTopic = detection.activeTopic;
  
  const isFollowUp = isFollowUpWord || isFollowUpMessage(questionText);
  const isSameQuestion = lastUserMsgContent && getJaccardSimilarity(qClean, lastUserMsgContent.toLowerCase().trim()) > 0.70;
  const isSemanticContinuation = (matchedTopic && lastActiveTopic && matchedTopic === lastActiveTopic);
  
  const shouldAdvance = shouldAdvanceLayer(isFollowUp, isSameQuestion, isSemanticContinuation);
  
  let activeTopic = matchedTopic || lastActiveTopic || 'daily';
  
  if (shouldAdvance && lastActiveTopic) {
    activeTopic = lastActiveTopic;
  }
  
  console.log("TOPIC_DETECTED", activeTopic);
  console.log("TOPIC_CONFIDENCE", detection.confidence);

  if (detection.detectedIntents.length > 1) {
    console.log("MULTI_INTENT_DETECTED", detection.detectedIntents);
  }
  
  if (shouldAdvance) {
    console.log("FOLLOW_UP_MODE_ENABLED");
  }
  
  const targetLayerNum = determineTargetLayer(activeTopic, shouldAdvance, topicProgress, revealedLayers);
  console.log("TARGET_LAYER_SELECTED", targetLayerNum);
  
  const currentProgressVal = topicProgress[activeTopic] || 1;
  if (targetLayerNum > currentProgressVal) {
    console.log("LAYER_ADVANCED", targetLayerNum);
  }
  
  const secondary = detection.detectedIntents.find(t => t !== matchedTopic) || null;
  
  return {
    activeTopic: activeTopic,
    secondaryTopic: secondary,
    targetLayer: targetLayerNum,
    followUpMode: shouldAdvance,
    shouldAdvance: shouldAdvance,
    previousTopic: lastActiveTopic,
    confidence: detection.confidence,
    detectedIntents: detection.detectedIntents
  };
}

export function updateTopicProgress(uid, topicState, currentProgress, currentRevealed = {}) {
  const newProgress = { ...(currentProgress || {}) };
  newProgress[topicState.activeTopic] = topicState.targetLayer;
  
  const newRevealed = { ...(currentRevealed || {}) };
  if (!newRevealed[topicState.activeTopic]) {
    newRevealed[topicState.activeTopic] = [];
  }
  if (!newRevealed[topicState.activeTopic].includes(topicState.targetLayer)) {
    newRevealed[topicState.activeTopic].push(topicState.targetLayer);
  }
  
  return { 
    topicProgress: newProgress, 
    revealedLayers: newRevealed 
  };
}

export function getCliffhangerContext(activeTopic, lastCliffhangers = []) {
  const last3 = lastCliffhangers.slice(-3);
  const last3Str = last3.length > 0 ? last3.join(' | ') : 'None';
  
  const rules = [
    `LAST_3_CLIFFHANGERS_USED: ${last3Str}`,
    `RULE: Do not use any of the above cliffhangers again.`,
    `RULE: The cliffhanger MUST strictly match the active topic ("${activeTopic}").`,
    `RULE: Avoid generic cliffhangers. Make it highly personalized to the user's situation and active topic.`
  ];
  
  return {
    lastCliffhangersStr: last3Str,
    instruction: rules.join('\n')
  };
}
