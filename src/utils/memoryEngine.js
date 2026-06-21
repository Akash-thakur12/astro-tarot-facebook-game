export function matchesAny(str, regexList) {
  if (!regexList || !Array.isArray(regexList)) return false;
  return regexList.some(rx => rx.test(str));
}

export function classifyDimension(str, config) {
  if (matchesAny(str, config.future)) {
    return null;
  }
  if (matchesAny(str, config.negative)) {
    return false;
  }
  if (matchesAny(str, config.positive)) {
    return true;
  }
  return null;
}

export function normalizeFacts(text) {
  if (!text || typeof text !== "string") return {};
  const t = text.toLowerCase().trim();
  const extracted = {};

  const configs = {
    married: {
      future: [
        /(?:kab|kab\s+tak|when|which\s+year|kis\s+saal|kis\s+varsh)\s+(?:hogi|hoga|shadi|shaadi|marriage|marry|vivah|biyaah|biyah|wedding|spouse|wife|husband)/,
        /(?:shadi|shaadi|marriage|vivah|biyaah|biyah|wedding|spouse|wife|husband)\s+(?:kab|kab\s+tak|when|kis\s+saal)/
      ],
      negative: [
        /\b(?:divorce|divorced|separated|separation|unmarried|un-married|single|alone|kunwara|kunwari)\b/,
        /(?:wife|husband|patni|pati|shadi|shaadi|marriage|vivah)\s+(?:nahi|na)\s+(?:hai|hui|huye|hoye|huin|thi|tha)/,
        /\b(?:wife|husband|patni|pati)\s+(?:thi|tha)\b/,
        /\b(?:ex\s+wife|ex\s+husband|ex-wife|ex-husband)\b/,
        /(?:shadi|shaadi)\s+toot\s+gayi/,
        /(?:शादी\s+नहीं|विवाह\s+नहीं|पत्नी\s+नहीं|पति\s+नहीं|कुंवारा|अविवाहित|तलाक|अकेला|अकेली)/
      ],
      positive: [
        /\b(?:married|already\s+married|shaadishuda|shadishuda|shaadi-shuda|shadi-shuda)\b/,
        /(?:shadi|shaadi|marriage|vivah|biyaah|biyah)\s+(?:to\s+)?(?:ho\s+)?(?:chuki|gayi|gai|gyi|done)/,
        /\b(?:wife|husband|patni|pati)\b/,
        /(?:शादीशुदा|विवाहित|पत्नी|पति)/
      ]
    },
    hasChildren: {
      future: [
        /(?:kab|kab\s+tak|when|how\s+many)\s+(?:hoga|hogi|baccha|bacha|bacche|bachche|bachhe|santan|son|daughter|baby|child|children|pregnant|pregnancy)/,
        /(?:baccha|bacha|bacche|bachche|bachhe|santan|son|daughter|baby|child|children|pregnant|pregnancy)\s+(?:kab|kab\s+tak|when)/
      ],
      negative: [
        /(?:baccha|bacha|bacche|bachche|bachhe|santan|son|daughter|baby|child|children)\s+(?:nahi|na)\s+(?:hai|hain|huin|thay|the)/,
        /\b(?:no\s+children|no\s+child|childless|no\s+kids|no\s+son|no\s+daughter)\b/,
        /\b(?:koi\s+santan\s+nahi|bacche\s+nahi\s+hain|bachche\s+nahi\s+hain)\b/,
        /(?:संतान\s+नहीं|बच्चे\s+नहीं|बेटा\s+नहीं|बेटी\s+नहीं)/
      ],
      positive: [
        /\b(?:son|daughter|baby|child|children|kids|santan|beta|beti|baccha|bacha|bacche|bachche|bachhe)\b/,
        /(?:बेटा|बेटी|संतान|बच्चा|बच्चे)/
      ]
    },
    hasJob: {
      future: [
        /(?:kab|kab\s+tak|when)\s+(?:milegi|milega|lagegi|lagega|job|work|naukri|naukari|employment|joining)/,
        /(?:job|work|naukri|naukari|employment|joining)\s+(?:kab|kab\s+tak|when|milegi|lagegi)/
      ],
      negative: [
        /(?:job|work|naukri|naukari)\s+(?:nahi|na)\s+(?:hai|rhi|rahi|thi|tha)/,
        /\b(?:unemployed|jobless|no\s+job|fired|laid\s+off|laid-off|left\s+job|chali\s+gayi|naukri\s+chali\s+gayi|naukri\s+chhut\s+gayi|job\s+chali\s+gayi|chhut\s+gai|job\s+loss)\b/,
        /(?:नौकरी\s+नहीं|जॉब\s+नहीं|बेरोजगार|नौकरी\s+चली\s+गई)/
      ],
      positive: [
        /\b(?:job|naukri|naukari|work|working|employed|employ|private\s+job|government\s+job|govt\s+job)\b/,
        /(?:नौकरी|जॉब|काम\s+करता|काम\s+करती)/
      ]
    },
    hasBusiness: {
      future: [
        /(?:kab|kab\s+tak|when)\s+(?:chalega|chalega\s+business|shuru|start|grow|open|setup)/,
        /(?:business|vyapar|vyapaar|dhandha|dhanda|shop|dukan|dukaan|startup)\s+(?:kab|kab\s+tak|when|chalega|shuru|start)/
      ],
      negative: [
        /(?:business|vyapar|vyapaar|dhandha|dhanda|shop|dukan|dukaan)\s+(?:nahi|na)\s+(?:hai|rhi|rahi|thi|tha)/,
        /\b(?:band|closed|shut\s+down|failed|no\s+business|no\s+shop)\b/,
        /(?:business|vyapar|dhandha|shop|dukan|dukaan)\s+band/,
        /\b(?:business|shop|vyapar)\s+tha\s+(?:ab\s+nahi|lekin\s+band)\b/,
        /(?:व्यापार\s+नहीं|बिज़नेस\s+नहीं|दुकान\s+बंद|व्यापार\s+बंद)/
      ],
      positive: [
        /\b(?:business|vyapar|vyapaar|dhandha|dhanda|shop|dukan|dukaan|startup|entrepreneur)\b/,
        /(?:व्यापार|बिज़नेस|धंधा|दुकान)/
      ]
    },
    gender: {
      future: [],
      negative: [
        /\b(?:female|girl|woman|lady|mahila|ladki|she)\b/,
        /(?:महिला|लड़की|नारी|स्त्री)/
      ],
      positive: [
        /\b(?:male|boy|man|gentleman|purush|ladka|he)\b/,
        /(?:पुरुष|लड़का|नर)/
      ]
    }
  };

  // 1. Married
  const marriedResult = classifyDimension(t, configs.married);
  if (marriedResult !== null) {
    extracted.married = marriedResult;
  }

  // 2. Has Children
  const childrenResult = classifyDimension(t, configs.hasChildren);
  if (childrenResult !== null) {
    extracted.hasChildren = childrenResult;
  }

  // 3. Has Job
  const jobResult = classifyDimension(t, configs.hasJob);
  if (jobResult !== null) {
    extracted.hasJob = jobResult;
  }

  // 4. Has Business
  const businessResult = classifyDimension(t, configs.hasBusiness);
  if (businessResult !== null) {
    extracted.hasBusiness = businessResult;
  }

  // 5. Gender
  const genderResult = classifyDimension(t, configs.gender);
  if (genderResult === true) {
    extracted.gender = "male";
  } else if (genderResult === false) {
    extracted.gender = "female";
  }

  return extracted;
}

export function updatePersistentFacts(storedFacts, newFacts) {
  const keys = ["married", "hasChildren", "hasJob", "hasBusiness", "gender"];
  let updated = false;

  keys.forEach(key => {
    if (newFacts[key] !== undefined) {
      const newValue = newFacts[key];
      const current = storedFacts[key] || { value: null, confidence: 0 };
      
      if (current.value === null) {
        current.value = newValue;
        current.confidence = 1;
        updated = true;
      } else if (current.value === newValue) {
        if (current.confidence < 5) {
          current.confidence += 1;
          updated = true;
        }
      } else {
        if (current.confidence <= 1) {
          current.value = newValue;
          current.confidence = 1;
          updated = true;
        } else {
          current.confidence -= 1;
          updated = true;
        }
      }
      storedFacts[key] = current;
    }
  });

  return { storedFacts, updated };
}
