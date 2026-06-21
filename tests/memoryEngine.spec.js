import { describe, it, expect } from 'vitest';
import { normalizeFacts, updatePersistentFacts, matchesAny, classifyDimension } from '../src/utils/memoryEngine.js';

describe('matchesAny and classifyDimension helpers', () => {
  it('should match regex list correctly', () => {
    expect(matchesAny('hello world', [/hello/, /world/])).toBe(true);
    expect(matchesAny('test string', [/hello/, /world/])).toBe(false);
  });

  it('should classify based on config priority', () => {
    const config = {
      future: [/\bkab\b/, /\bwhen\b/],
      negative: [/\bnahi\b/, /\bno\b/],
      positive: [/\bhai\b/, /\byes\b/]
    };
    expect(classifyDimension('kab hoga', config)).toBeNull();
    expect(classifyDimension('nahi hai', config)).toBe(false);
    expect(classifyDimension('hai', config)).toBe(true);
    expect(classifyDimension('nothing matched', config)).toBeNull();
  });
});

describe('normalizeFacts - 50+ Test Cases', () => {
  // 1. Married Positives (15 cases)
  const marriedPositives = [
    "meri shadi ho chuki hai",
    "meri wife hai",
    "main shaadishuda hu",
    "already married",
    "shadi ho gayi hai",
    "mera husband hai",
    "my wife is beautiful",
    "patni ke saath rehta hu",
    "pati ka naam kya hai",
    "shaadi ho chuki",
    "shadishuda hu main",
    "husband ke sath rehti hu",
    "wife ke sath rehta hu",
    "shadi done",
    "meri patni hai",
    "meri shadi ho gayi hai",
    "meri shaadi ho chuki hai",
    "meri to shadi ho gyi hai",
    "main married hu",
    "meri shaadi ho gayi"
  ];
  marriedPositives.forEach((txt, idx) => {
    it(`married positive case #${idx + 1}: "${txt}"`, () => {
      expect(normalizeFacts(txt).married).toBe(true);
    });
  });

  // 2. Married Negatives (15 cases)
  const marriedNegatives = [
    "meri wife nahi hai",
    "shadi nahi hui",
    "unmarried hu",
    "single hu",
    "divorce ho gaya",
    "divorced hu",
    "wife thi ab nahi hai",
    "husband tha ab nahi hai",
    "ex wife hai meri",
    "separated hu wife se",
    "ex husband hai",
    "separated hu",
    "shadi toot gayi",
    "un-married hu",
    "main single hu"
  ];
  marriedNegatives.forEach((txt, idx) => {
    it(`married negative case #${idx + 1}: "${txt}"`, () => {
      expect(normalizeFacts(txt).married).toBe(false);
    });
  });

  // 3. Children Positives (10 cases)
  const childrenPositives = [
    "mera beta hai",
    "meri beti hai",
    "mere bachche hain",
    "ek child hai",
    "my son is young",
    "ek beti hai",
    "mera ek beta hai",
    "bacche hain mere",
    "santan hai meri",
    "i have kids"
  ];
  childrenPositives.forEach((txt, idx) => {
    it(`children positive case #${idx + 1}: "${txt}"`, () => {
      expect(normalizeFacts(txt).hasChildren).toBe(true);
    });
  });

  // 4. Children Negatives (10 cases)
  const childrenNegatives = [
    "mere bachche nahi hain",
    "koi santan nahi",
    "no child",
    "bacche nahi hain",
    "santan nahi hai",
    "koi bacha nahi hai",
    "no kids",
    "no children",
    "mere koi santan nahi hai",
    "baccha nahi hai mera"
  ];
  childrenNegatives.forEach((txt, idx) => {
    it(`children negative case #${idx + 1}: "${txt}"`, () => {
      expect(normalizeFacts(txt).hasChildren).toBe(false);
    });
  });

  // 5. Job Positives (10 cases)
  const jobPositives = [
    "main private job karta hu",
    "main employed hu",
    "meri naukri hai",
    "working in IT sector",
    "i have a job",
    "govt job karta hu",
    "private job hai meri",
    "working as engineer",
    "naukri karta hu",
    "i am working"
  ];
  jobPositives.forEach((txt, idx) => {
    it(`job positive case #${idx + 1}: "${txt}"`, () => {
      expect(normalizeFacts(txt).hasJob).toBe(true);
    });
  });

  // 6. Job Negatives & Loss (10 cases)
  const jobNegatives = [
    "job nahi hai",
    "unemployed hu",
    "meri naukri chali gayi",
    "job chali gayi",
    "laid off recently",
    "naukri chali gayi",
    "laid off",
    "jobless hu",
    "no job",
    "naukri chhut gayi"
  ];
  jobNegatives.forEach((txt, idx) => {
    it(`job negative case #${idx + 1}: "${txt}"`, () => {
      expect(normalizeFacts(txt).hasJob).toBe(false);
    });
  });

  // 7. Business Positives (10 cases)
  const businessPositives = [
    "mera business hai",
    "meri shop hai",
    "apna startup hai",
    "vyapar karta hu",
    "own business is growing",
    "dukan hai meri",
    "vyapaar chal raha hai",
    "dhandha chal raha hai",
    "own startup",
    "apna dhandha hai"
  ];
  businessPositives.forEach((txt, idx) => {
    it(`business positive case #${idx + 1}: "${txt}"`, () => {
      expect(normalizeFacts(txt).hasBusiness).toBe(true);
    });
  });

  // 8. Business Negatives & Closed (10 cases)
  const businessNegatives = [
    "business band ho gaya",
    "shop band ho gayi",
    "business nahi hai",
    "business tha ab nahi hai",
    "startup closed down",
    "vyapar band ho gaya",
    "shop closed",
    "failed business",
    "no business",
    "dukan band ho gayi"
  ];
  businessNegatives.forEach((txt, idx) => {
    it(`business negative case #${idx + 1}: "${txt}"`, () => {
      expect(normalizeFacts(txt).hasBusiness).toBe(false);
    });
  });

  // 9. Gender Cases (4 cases)
  it('should detect gender correctly', () => {
    expect(normalizeFacts("main ladka hu").gender).toBe("male");
    expect(normalizeFacts("male hu").gender).toBe("male");
    expect(normalizeFacts("main ladki hu").gender).toBe("female");
    expect(normalizeFacts("female hu").gender).toBe("female");
  });

  // 10. Future Questions / False Positives (12 cases)
  const futureQuestions = [
    "meri shadi kab hogi",
    "beta kab hoga",
    "job kab milegi",
    "business kab chalega",
    "when will I marry",
    "wife kab milegi",
    "meri ex meri life me kab aayegi",
    "bacche kab honge",
    "naukri kab lagegi",
    "vyapar kab shuru karu",
    "baby kab hoga",
    "naukri kab tak milegi"
  ];
  futureQuestions.forEach((txt, idx) => {
    it(`future/false positive case #${idx + 1}: "${txt}"`, () => {
      expect(normalizeFacts(txt)).toEqual({});
    });
  });

  // 11. Mixed Priority Cases (2 cases)
  it('should prioritize negatives over positives in mixed statements', () => {
    expect(normalizeFacts("mera business tha lekin ab band ho gaya").hasBusiness).toBe(false);
    expect(normalizeFacts("pehle job thi par ab chali gayi").hasJob).toBe(false);
  });
});

describe('updatePersistentFacts - 30+ Test Cases', () => {
  // 1. Initial State updates (5 cases)
  it('should initialize empty values with confidence 1', () => {
    let state = {
      married: { value: null, confidence: 0 },
      hasChildren: { value: null, confidence: 0 },
      hasJob: { value: null, confidence: 0 },
      hasBusiness: { value: null, confidence: 0 },
      gender: { value: null, confidence: 0 }
    };

    const res = updatePersistentFacts(state, { married: true, hasChildren: false });
    expect(res.storedFacts.married).toEqual({ value: true, confidence: 1 });
    expect(res.storedFacts.hasChildren).toEqual({ value: false, confidence: 1 });
    expect(res.updated).toBe(true);
  });

  // 2. Increments and Capping (15 cases)
  it('should increment confidence on matching facts but cap at 5', () => {
    let state = {
      married: { value: true, confidence: 1 },
      hasChildren: { value: null, confidence: 0 },
      hasJob: { value: null, confidence: 0 },
      hasBusiness: { value: null, confidence: 0 },
      gender: { value: null, confidence: 0 }
    };

    // Increments to 2, 3, 4, 5
    for (let c = 2; c <= 5; c++) {
      const res = updatePersistentFacts(state, { married: true });
      state = res.storedFacts;
      expect(state.married.confidence).toBe(c);
      expect(res.updated).toBe(true);
    }

    // Caps at 5
    for (let i = 0; i < 5; i++) {
      const res = updatePersistentFacts(state, { married: true });
      state = res.storedFacts;
      expect(state.married.confidence).toBe(5);
      // Wait, is updated true or false when capping at 5?
      // In code:
      // else if (current.value === newValue) {
      //   if (current.confidence < 5) {
      //     current.confidence += 1;
      //     updated = true;
      //   }
      // }
      // So if it's already 5, it doesn't increment and updated remains false.
      // Let's verify:
      expect(res.updated).toBe(false);
    }
  });

  // 3. Decrement and Contradiction Overwriting (10 cases)
  it('should decrement confidence on contradiction and flip when it reaches 1', () => {
    let state = {
      married: { value: true, confidence: 5 },
      hasChildren: { value: null, confidence: 0 },
      hasJob: { value: null, confidence: 0 },
      hasBusiness: { value: null, confidence: 0 },
      gender: { value: null, confidence: 0 }
    };

    // Decrement from 5 to 4, 3, 2, 1
    for (let c = 4; c >= 1; c--) {
      const res = updatePersistentFacts(state, { married: false });
      state = res.storedFacts;
      expect(state.married.value).toBe(true);
      expect(state.married.confidence).toBe(c);
      expect(res.updated).toBe(true);
    }

    // Now at confidence 1, another contradiction should flip value to false and reset confidence to 1
    const resFlip = updatePersistentFacts(state, { married: false });
    state = resFlip.storedFacts;
    expect(state.married.value).toBe(false);
    expect(state.married.confidence).toBe(1);
    expect(resFlip.updated).toBe(true);
  });
});
