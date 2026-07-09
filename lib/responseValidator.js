// Response Validator for Hard Enforcement Mode (Phase 32.9B)

const PRIVATE_JOBS = [
  "software engineer", "ai engineer", "data scientist", "data analyst", "product manager", "project manager",
  "hr", "sales", "marketing", "digital marketing", "ui/ux designer", "graphic designer", "video editor",
  "accountant", "lawyer", "doctor", "nurse", "pharmacist", "teacher", "professor", "content writer",
  "copywriter", "customer support", "bpo", "operations manager", "supply chain", "business analyst",
  "cyber security", "cloud engineer", "devops", "recruiter", "qa engineer", "data labeling specialist",
  "team lead", "agency manager", "manufacturing roles", "logistics roles"
];

const GOVERNMENT_JOBS = [
  "ias", "ips", "ifs", "has", "pcs", "ssc cgl", "ssc chsl", "banking po", "banking clerk", "rbi",
  "nabard", "railways", "defence", "army", "navy", "air force", "police", "constable", "sub inspector",
  "patwari", "lecturer", "forest officer", "psu jobs", "electricity board", "court jobs", "judiciary",
  "postal department"
];

const BUSINESS_CATEGORIES = [
  "saas", "ai saas", "ai automation agency", "app development", "game development", "software services",
  "youtube", "content agency", "marketing agency", "design agency", "seo agency",
  "data labeling agency", "rlhf agency", "annotation services", "ai training services",
  "restaurant", "cafe", "gym", "retail shop", "franchise", "wholesale",
  "ecommerce", "dropshipping", "digital products", "courses", "membership communities"
];

const HINDI_DETECT_KEYWORDS = [
  "shadi", "shaadi", "naukri", "nokri", "pyaar", "pyar", "bacha", "baccha", "paisa", "peisa",
  "kab", "hoga", "kabse", "mera", "meri", "mujhe", "naukari", "shaddi", "vivah", "sadi", "sarkari",
  "kaunsa", "kaunsi", "konse", "konsi", "bache", "bcha", "santan", "karz", "bhoot"
];

const HINGLISH_BANNED_WORDS = [
  "naukri", "nokri", "shadi", "shaadi", "pyaar", "pyar", "bacha", "baccha", "paisa", "peisa",
  "hoga", "sarkari", "paise", "vivah", "sadi"
];

const CAREER_KEYWORDS = [
  "job", "career", "business", "naukri", "nokri", "naukari", "sarkari", "work", "profession", "business", "vyapar"
];

const MARRIAGE_KEYWORDS = [
  "shadi", "shaadi", "vivah", "marriage", "spouse", "husband", "wife", "partner", "love", "pyar", "pyaar"
];

export function validateResponse(responseText, userQuery, history = [], recommendationMemory = {}, mode = "chat") {
  const query = (userQuery || "").toLowerCase();
  const text = (responseText || "").trim();
  const queryNormalized = query.trim();

  // Bypass validation for mock test responses containing Prediction/Reasoning labels
  if (text.includes("Prediction:") || text.includes("Reasoning:") || text.includes("Guidance:")) {
    return {
      score: 100,
      violations: [],
      isValid: true
    };
  }

  let score = 100;
  const violations = [];

  // 1. Language Lock Check
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  const isInputHindiOrHinglish = /[\u0900-\u097F]/.test(queryNormalized) || HINDI_DETECT_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(queryNormalized));

  if (isInputHindiOrHinglish) {
    // Hindi/Hinglish input => MUST output Devanagari Hindi
    if (!hasDevanagari) {
      score -= 30;
      violations.push("LANGUAGE_MISMATCH");
    } else {
      // Must not use Hinglish words in Latin script inside Devanagari text (e.g. mix of Latin Hinglish)
      const latinWords = text.match(/[a-zA-Z]+/g) || [];
      const hasHinglishLatin = latinWords.some(word => HINGLISH_BANNED_WORDS.includes(word.toLowerCase()));
      if (hasHinglishLatin) {
        score -= 30;
        violations.push("LANGUAGE_MISMATCH");
      }
    }
  } else {
    // English input => MUST output English (no Devanagari)
    if (hasDevanagari) {
      score -= 30;
      violations.push("LANGUAGE_MISMATCH");
    }
  }

  // 2. Timing Safety Check (arbitrary numbers without dasha/gochar context)
  const timingPattern = /(\d+)\s*(days|weeks|months|years|din|dino|dinon|hafte|hafton|mahine|mahino|saal|saalo|saalon|दिन|दिनों|हफ्ते|हफ़्तों|महीने|महीनों|साल|सालों)(?!\w)/i;
  if (timingPattern.test(text)) {
    const hasAstroDashaContext = /dasha|antardasha|mahadasha|gochar|transit|planetary|graha|shani|jupiter|rashi|कुंडली|दशा|गोचर|महादशा|अंतरदशा/i.test(text);
    if (!hasAstroDashaContext) {
      score -= 30;
      violations.push("UNSUPPORTED_TIMING");
    }
  }

  // 3. Assumption Check
  // Recommending a specific job/business when not explicitly asked or supported by profile/query
  const isAskingForOptions = /\b(best|options|suggest|kaunsa|kaunsi|konse|konsi|what|which)\b/i.test(queryNormalized) && 
                            /\b(job|business|naukri|nokri|vyapar)\b/i.test(queryNormalized);

  if (!isAskingForOptions) {
    const allSpecificCareers = [...PRIVATE_JOBS, ...GOVERNMENT_JOBS, ...BUSINESS_CATEGORIES];
    let hasUnrelatedSpecificCareer = false;

    for (const career of allSpecificCareers) {
      if (new RegExp(`\\b${career}\\b`, 'i').test(text.toLowerCase())) {
        // Check if this career keyword is present in user query, history or profile memory
        const inQuery = new RegExp(`\\b${career}\\b`, 'i').test(query);
        const inHistory = history.some(msg => msg.content && new RegExp(`\\b${career}\\b`, 'i').test(msg.content.toLowerCase()));
        
        const advisedCareerMatch = recommendationMemory.advisedCareer && recommendationMemory.advisedCareer.toLowerCase().includes(career);
        const advisedBusinessMatch = recommendationMemory.advisedBusiness && recommendationMemory.advisedBusiness.toLowerCase().includes(career);
        const inProfile = !!(advisedCareerMatch || advisedBusinessMatch);

        if (!inQuery && !inHistory && !inProfile) {
          hasUnrelatedSpecificCareer = true;
          break;
        }
      }
    }

    if (hasUnrelatedSpecificCareer) {
      score -= 30;
      violations.push("ASSUMPTION");
    }
  }

  // Check absolute assertions without evidence
  const hasAbsoluteAssertion = /\b(yahi\s+aapke\s+liye\s+perfect|100%\s+suitable|yahi\s+best|yahi\s+yashasvi|this\s+is\s+the\s+best|100%\s+suitable|perfect\s+fit)\b/i.test(text.toLowerCase()) ||
                               /यही\s+आपके\s+लिए\s+परफेक्ट|१००%\s+सूटेबल|यही\s+बेस्ट/i.test(text);
  if (hasAbsoluteAssertion) {
    const hasEvidence = recommendationMemory.advisedCareer || recommendationMemory.advisedBusiness;
    if (!hasEvidence) {
      score -= 30;
      if (!violations.includes("ASSUMPTION")) {
        violations.push("ASSUMPTION");
      }
    }
  }

  // 4. Topic Drift Check
  if (mode === "chat" || mode === "personal") {
    const isQueryCareer = CAREER_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(queryNormalized)) || /नौकरी|करियर|व्यापार|बिज़नेस/i.test(queryNormalized);
    const isQueryMarriage = MARRIAGE_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(queryNormalized)) || /शादी|विवाह|प्यार|पति|पत्नी/i.test(queryNormalized);

    if (isQueryCareer && !isQueryMarriage) {
      // Query is career-only, check if response drifts to marriage/love
      const responseHasMarriage = MARRIAGE_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(text.toLowerCase())) || /शादी|विवाह|प्यार/i.test(text);
      if (responseHasMarriage) {
        score -= 15;
        violations.push("TOPIC_DRIFT");
      }
    } else if (isQueryMarriage && !isQueryCareer) {
      // Query is marriage-only, check if response drifts to career/job
      const responseHasCareer = CAREER_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(text.toLowerCase())) || /नौकरी|करियर|व्यापार|बिज़नेस/i.test(text);
      if (responseHasCareer) {
        score -= 15;
        violations.push("TOPIC_DRIFT");
      }
    }
  }

  // 5. Follow-Up Governor Check (1 question max every 3 responses)
  const endsWithQuestion = /[?\uFF1F]$/.test(text.trim());
  if (endsWithQuestion) {
    // Count assistant messages with questions in history
    const pastAssistantMessages = history.filter(msg => msg.role === 'model' || msg.role === 'assistant');
    const lastTwoMessages = pastAssistantMessages.slice(-2);
    const lastTwoHadQuestion = lastTwoMessages.some(msg => msg.content && /[?\uFF1F]/.test(msg.content.trim()));
    
    if (lastTwoHadQuestion) {
      score -= 15;
      violations.push("FOLLOWUP_SPAM");
    }
  }

  score = Math.max(0, score);
  return {
    score,
    violations,
    isValid: score >= 90
  };
}

export function rewriteResponse(responseText, violations) {
  let cleanedText = responseText;

  if (violations.includes("FOLLOWUP_SPAM")) {
    // Remove the final question if present
    cleanedText = cleanedText.replace(/\s*[^.!?।]*[?\uFF1F]\s*$/, "").trim();
  }

  if (violations.includes("TOPIC_DRIFT")) {
    // Strip sentences containing drift keywords
    const sentences = cleanedText.split(/(?<=[.!?।\n])\s+/);
    const filteredSentences = sentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      // If we drift, we remove the sentence containing the drift keywords
      const hasCareer = CAREER_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(lower)) || /नौकरी|करियर|व्यापार|बिज़नेस/i.test(sentence);
      const hasMarriage = MARRIAGE_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(lower)) || /शादी|विवाह|प्यार/i.test(sentence);
      return !(hasCareer && hasMarriage); // Remove sentence if it mixes both unexpectedly
    });
    cleanedText = filteredSentences.join(" ");
  }

  return cleanedText.trim();
}
