import { vi, describe, it, expect, beforeEach } from 'vitest';
import { humanize } from '../src/utils/humanizer.js';
import handler from '../api/pandit-ai.js';

let mockHouses = { Sun: 10, Jupiter: 4, Venus: 9 };

vi.mock('../src/utils/astroEngine.js', () => ({
  getAstrologyData: vi.fn(async (params) => {
    return {
      lagna: 'Kanya',
      moonSign: 'Kanya',
      nakshatra: 'Hasta',
      planets: { Sun: 'Kanya', Moon: 'Kanya', Jupiter: 'Kanya', Venus: 'Kanya' },
      mahadasha: 'Sun',
      antardasha: 'Moon',
      antardashaEnd: '12/2026',
      gochar: 'Sun in Mesh',
      houses: mockHouses,
      dhaiya: false,
      sadesati: false
    };
  })
}));

// Mock firebase-admin
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  cert: vi.fn(),
  getApps: vi.fn(() => [{ name: 'mock' }])
}));

let mockUid = 'test_verify_user';

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: vi.fn(async (token) => {
      return { uid: mockUid };
    })
  }))
}));

let mockProfileData = null;
let mockFactsData = null;
let mockFactMemoryData = null;

vi.mock('firebase-admin/firestore', () => {
  const mockGet = vi.fn(async () => ({
    exists: true,
    data: vi.fn(() => ({ coins: 1000, premium: true, name: 'Test User' }))
  }));
  const mockSet = vi.fn(async () => {});
  const mockUpdate = vi.fn(async () => {});
  
  return {
    getFirestore: vi.fn(() => ({
      collection: vi.fn((col) => ({
        doc: vi.fn((docId) => ({
          get: mockGet,
          set: mockSet,
          update: mockUpdate,
          collection: vi.fn((sub) => ({
            doc: vi.fn((subDocId) => ({
              get: vi.fn(async () => {
                if (sub === 'profile' && subDocId === 'main' && mockProfileData) {
                  return { exists: true, data: () => mockProfileData };
                }
                if (sub === 'facts' && subDocId === 'current' && mockFactsData) {
                  return { exists: true, data: () => mockFactsData };
                }
                if (sub === 'factMemory' && subDocId === 'facts') {
                  return { exists: !!mockFactMemoryData, data: () => mockFactMemoryData || {} };
                }
                return { exists: false };
              }),
              set: vi.fn(async (data) => {
                if (sub === 'factMemory' && subDocId === 'facts') {
                  mockFactMemoryData = { ...mockFactMemoryData, ...data };
                }
              })
            }))
          }))
        }))
      })),
      runTransaction: vi.fn(async (cb) => {
        return cb({
          get: mockGet,
          update: mockUpdate
        });
      })
    })),
    FieldValue: {
      serverTimestamp: vi.fn(() => 'mock-timestamp')
    }
  };
});

// Mock aiService
let mockAIResponse = "🔮 Prediction: Safalta milegi.\n📿 Reasoning: Kundali achhi hai.\n🪔 Guidance: Dhyan karein.";
vi.mock('../services/aiService.js', () => ({
  generateAIResponse: vi.fn(async (prompt) => {
    if (prompt.includes("Extract ONLY structured facts")) {
      const relationship = { wifeAlive: null, relationshipStatus: null, girlfriendStatus: null, spouseName: null };
      const family = { childrenCount: null, childrenNames: [] };
      const career = { occupation: null, targetExam: null, dreamJob: null };
      const finance = { status: null };
      const health = { issues: [] };
      
      let questionPart = "";
      const match = prompt.match(/Latest Question: "(.*)"/i);
      if (match) {
        questionPart = match[1];
      }
      const q = questionPart.toLowerCase();
      if (q.includes("wife mar") || q.includes("patni nahi rahi") || q.includes("wife expire")) {
        relationship.wifeAlive = false;
        relationship.relationshipStatus = "widowed";
      } else if ((q.includes("wife") || q.includes("patni")) && !q.includes("baat")) {
        relationship.wifeAlive = true;
        relationship.relationshipStatus = "married";
      }
      
      if (q.includes("breakup") || q.includes("chhod gayi") || q.includes("toot gaya")) {
        relationship.girlfriendStatus = "breakup";
        relationship.relationshipStatus = "breakup";
      } else if (q.includes("girlfriend") || q.includes("gf")) {
        relationship.girlfriendStatus = "active";
      }
      
      if (q.includes("meri ek beti") || q.includes("mera ek beta") || q.includes("santan") || q.includes("bachcha kab hoga")) {
        family.childrenCount = 1;
      }
      
      if (q.includes("ssc")) {
        career.targetExam = "SSC";
      }
      if (q.includes("upsc")) {
        career.targetExam = "UPSC";
      }
      
      if (q.includes("loan") || q.includes("karza") || q.includes("karz") || q.includes("debt")) {
        finance.status = "debt";
      }
      
      return JSON.stringify({
        relationship,
        family,
        career,
        finance,
        health,
        confidence: 0.95
      });
    }

    if (prompt.includes("[GREETING MODE ACTIVE]")) {
      return `🔮 Prediction: Welcome to Pandit AI. Feel free to ask any question regarding career, marriage, health, or finance.
📿 Astrological Reasoning: Divine celestial energies are aligned.
🪔 Guidance: Namaste! Kaise hain aap? Pranam. Kalyan ho. Boliye, aaj kis vishay me margdarshan chahte hain?`;
    }

    if (prompt.includes("[VAGUE QUESTION MODE ACTIVE]")) {
      if (prompt.toLowerCase().includes("meri bat suno") || prompt.toLowerCase().includes("meri baat suno")) {
        return `🔮 Prediction: Haan Beta, sun raha hun. Kalyan ho.
📿 Astrological Reasoning: Ishvariya kripa se aapke aur mere beech samvaad ka yog bana hai.
🪔 Guidance: Aap bina kisi sankoch ke apne jeevan ka koi bhi prashna pooch sakte hain. Main aapka margdarshan karunga.`;
      }
      return `🔮 Prediction: Please feel free to ask your question.
📿 Astrological Reasoning: Astrological guidance is based on your birth chart details.
🪔 Guidance: Please ask your question clearly. I can guide you on career, marriage, love life, and more.`;
    }

    return mockAIResponse;
  })
}));

describe('CRITICAL BUGFIX Verification Tests', () => {
  beforeEach(() => {
    mockUid = 'user_' + Math.random().toString(36).substring(7);
    mockHouses = { Sun: 10, Jupiter: 4, Venus: 9 };
    mockProfileData = null;
    mockFactsData = null;
    mockFactMemoryData = null;
    mockAIResponse = "🔮 Prediction: Safalta milegi.\n📿 Reasoning: Kundali achhi hai.\n🪔 Guidance: Dhyan karein.";
    process.env.BEDROCK_API_KEY = "mock-key";
    process.env.BEDROCK_BASE_URL = "mock-url";
  });

  it('1. FIX humanize() - Add emoji stripper at TOP of function', () => {
    // Strip standard emojis
    const stripped = humanize('Hello 😂 there 😁 😆 check this! 🔮 📿 🪔');
    expect(stripped).toContain('🔮');
    expect(stripped).toContain('📿');
    expect(stripped).toContain('🪔');
    expect(stripped).not.toContain('😂');
    expect(stripped).not.toContain('😁');
    expect(stripped).not.toContain('😆');
  });

  it('1b. Debug Greeting "Hlo" and other greetings', async () => {
    const testCases = [
      { q: 'Hlo', shouldBeGreeting: true },
      { q: 'Hlo!', shouldBeGreeting: true },
      { q: 'Hello!', shouldBeGreeting: true },
      { q: 'Namaste!', shouldBeGreeting: true },
      { q: 'Ram Ram!', shouldBeGreeting: true },
      { q: 'hello there', shouldBeGreeting: false }
    ];

    for (const tc of testCases) {
      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer mock_token' },
        body: {
          mode: 'chat',
          userData: {
            uid: 'test_verify_user',
            question: tc.q
          },
          history: []
        }
      };

      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.jsonData = data; return this; }
      };

      await handler(req, res);
      const text = res.jsonData?.text || "";
      const isGreetingResponse = text.includes("Kaise hain aap") || text.includes("How are you today") || text.includes("How can I help");
      console.log(`Input: "${tc.q}" -> Is Greeting: ${isGreetingResponse} (Expected: ${tc.shouldBeGreeting})`);
      expect(isGreetingResponse).toBe(tc.shouldBeGreeting);
    }
  });

  it('should allow samay word after validator bugfix', async () => {
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user',
          dobDay: 31, dobMonth: 8, dobYear: 1999,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'Is samay meri job ke yog kaise hain?'
        },
        history: []
      }
    };

    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };

    // Setting mock response with "samay" word
    mockAIResponse = "🔮 Prediction: Samay badlega.\n📿 Reasoning: Kundali me samay achha hai.\n🪔 Guidance: Mantra jaap.";
    
    process.env.BEDROCK_API_KEY = "mock-key";
    process.env.BEDROCK_BASE_URL = "mock-url";

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.text).not.toContain('Takneeki karan');
  });

  it('4. ADD HARD CHECK - If astroData=null or no lagna, OVERWRITE AI RESPONSE', async () => {
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user',
          // Omitting dob, time, place so astroData is null
          question: 'Job kab milegi'
        },
        history: []
      }
    };

    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };

    mockAIResponse = "🔮 Prediction: Grahon ki dasha ke anusaar general Vedic prediction.\n\n📿 Reasoning: General astrology principles.\n\n🪔 Guidance: Agar aap DOB share karenge to behtar reading milegi.";
    
    await handler(req, res);
    
    expect(res.jsonData.text).toContain('general Vedic prediction');
    expect(res.jsonData.text).toContain('DOB share karenge');
    expect(res.jsonData.text).not.toContain('janm tarikh sahi format me nahi mili.');
  });

  it('5. FIX Marital Status Priority / Old Memory contradiction', async () => {
    mockProfileData = { maritalStatus: 'Single' };
    mockFactsData = { married: { value: true, currentValue: true } };

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user',
          question: 'meri shadi ho gyi hai ya ni',
          maritalStatus: 'Unknown'
        },
        history: []
      }
    };

    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };

    mockAIResponse = "🔮 Prediction: Aap avivahit hain.\n\n📿 Reasoning: Chart details show single karma.\n\n🪔 Guidance: Do good deeds.";

    await handler(req, res);

    expect(res.jsonData.text).toContain('avivahit');
  });

  it('6. FIX DOB Parsing Fallback - Parse DD-MM-YYYY if dobDay undefined', async () => {
    mockProfileData = null;
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user',
          dob: '31-08-1999',
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'Job kab milegi'
        },
        history: []
      }
    };

    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };

    mockAIResponse = "🔮 Prediction: Safalta milegi.\n📿 Reasoning: Kundali achhi hai.\n🪔 Guidance: Dhyan karein.";

    await handler(req, res);

    // Should NOT say "Kundali data uplabdh nahi hai." but succeed and contain the AI response
    expect(res.jsonData.text).not.toContain('Kundali data uplabdh nahi hai.');
    expect(res.jsonData.text).toContain('Safalta milegi');
  });

  it('7. FIX Single + Spouse Guard', async () => {
    mockProfileData = { maritalStatus: 'Single' };
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user',
          question: 'meri wife kaisi hogi',
          maritalStatus: 'Single'
        },
        history: []
      }
    };

    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };

    mockAIResponse = "🔮 Prediction: Future wife will be supportive.\n\n📿 Reasoning: 7th house has good indications.\n\n🪔 Guidance: Pray to Lord Shiva.";

    await handler(req, res);

    expect(res.jsonData.text).toContain('supportive');
  });

  it('8. Verify Occupation and Marital Status Context prompt injection', async () => {
    const { generateAIResponse } = await import('../services/aiService.js');
    generateAIResponse.mockClear();

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user',
          dobDay: 31, dobMonth: 8, dobYear: 1999,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'Job kab lagegi',
          occupation: 'Government Job',
          maritalStatus: 'Single'
        },
        history: []
      }
    };

    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };

    mockAIResponse = "🔮 Prediction: Government service yog banega.\n📿 Reasoning: 10th house strong hai.\n🪔 Guidance: Surya ko jal dein.";

    await handler(req, res);

    expect(generateAIResponse).toHaveBeenCalled();
    const lastPrompt = generateAIResponse.mock.calls.find(c => c[0].includes('Occupation='))[0];

    expect(lastPrompt).toContain('Occupation=Government Job');
    expect(lastPrompt).toContain('Marital=Single');
    expect(lastPrompt).toContain('Focus on SSC, UPSC, State PSC, Banking and government service opportunities.');
    expect(lastPrompt).toContain('Marriage timing questions are valid.');
  });

  it('9. Verify Loss/Widow Memory Guard', async () => {
    const { generateAIResponse } = await import('../services/aiService.js');
    generateAIResponse.mockClear();

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user',
          dobDay: 31, dobMonth: 8, dobYear: 1999,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'meri wife mar gayi hai, ab kya hoga',
          occupation: 'Government Job',
          maritalStatus: 'Unknown'
        },
        history: []
      }
    };

    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };

    mockAIResponse = "🔮 Prediction: Career par dhyan dein.\n📿 Reasoning: Grah sthiti thik hai.\n🪔 Guidance: Mantra path karein.";

    await handler(req, res);

    expect(generateAIResponse).toHaveBeenCalled();
    const lastPrompt = generateAIResponse.mock.calls.find(c => c[0].includes('Occupation='))[0];

    expect(lastPrompt).toContain('Marital=Widowed');
    expect(lastPrompt).toContain('User experienced loss.');
    expect(lastPrompt).toContain('DO NOT immediately suggest remarriage.');
  });

  it('10. Verify Government Job Age > 28 rule', async () => {
    const { generateAIResponse } = await import('../services/aiService.js');
    generateAIResponse.mockClear();

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user',
          dobDay: 31, dobMonth: 8, dobYear: 1990, // Age 35 (in 2026)
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'job kab lagegi',
          occupation: 'Government Job',
          maritalStatus: 'Single'
        },
        history: []
      }
    };

    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };

    mockAIResponse = "🔮 Prediction: Departmental opportunities milengi.\n📿 Reasoning: Shani support kar raha hai.\n🪔 Guidance: Dhyan lagayein.";

    await handler(req, res);

    expect(generateAIResponse).toHaveBeenCalled();
    const lastPrompt = generateAIResponse.mock.calls.find(c => c[0].includes('Occupation='))[0];

    expect(lastPrompt).toContain('Age=35');
    expect(lastPrompt).toContain('Avoid always mentioning UPSC');
    expect(lastPrompt).toContain('departmental opportunities');
  });

  it('11. Verify House Safety rule (missing astro houses)', async () => {
    const { generateAIResponse } = await import('../services/aiService.js');
    generateAIResponse.mockClear();

    mockHouses = {}; // Empty houses!

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user',
          dobDay: 31, dobMonth: 8, dobYear: 1999,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'Job kab lagegi',
          occupation: 'Government Job',
          maritalStatus: 'Single'
        },
        history: []
      }
    };

    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };

    mockAIResponse = "🔮 Prediction: Grah sthiti samarthan kar rahi hai.\n📿 Reasoning: Kundali data uplabdh nahi hai.\n🪔 Guidance: Surya jal arpan.";

    await handler(req, res);

    expect(generateAIResponse).toHaveBeenCalled();
    const lastPrompt = generateAIResponse.mock.calls.find(c => c[0].includes('Occupation='))[0];

    expect(lastPrompt).toContain('HOUSE SAFETY RULES');
    expect(lastPrompt).toContain('FORBIDDEN: Do NOT mention specific houses (e.g., 4th, 5th, 7th, 9th, 10th house).');
  });

  it('12. Verify Phase 2.4 - Test 1: Wife deceased contradiction test', async () => {
    mockFactMemoryData = null;

    const req1 = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p24',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'meri wife mar gyi',
          maritalStatus: 'Unknown'
        },
        history: []
      }
    };
    const res1 = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req1, res1);

    const req2 = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p24',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'meri wife kab baat karegi',
          maritalStatus: 'Unknown'
        },
        history: []
      }
    };
    const res2 = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req2, res2);

    expect(res2.jsonData.text).toContain('Kya aap purani yaadon, punarvivah ya kisi anya sambandh ke baare me pooch rahe hain?');
  });

  it('13. Verify Phase 2.4 - Test 2: Married user shaadi kab contradiction test', async () => {
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p24_2',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'meri shaadi kab hogi',
          maritalStatus: 'Married'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);

    expect(res.jsonData.text).toContain('punarvivah');
  });

  it('14. Verify Phase 2.4 - Test 3: Age 35 Government Job UPSC contradiction test', async () => {
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p24_3',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'UPSC kab',
          occupation: 'Government Job',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);

    expect(res.jsonData.text).toContain('State PSC');
    expect(res.jsonData.text).toContain('SSC');
    expect(res.jsonData.text).toContain('government service');
  });

  it('15. Verify Phase 2.5 - Test 1: childrenCount extraction', async () => {
    mockFactMemoryData = null;
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p25_1',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'meri ek beti hai',
          maritalStatus: 'Married'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(mockFactMemoryData?.childrenCount).toBe(1);
  });

  it('16. Verify Phase 2.5 - Test 2: childrenCount contradiction', async () => {
    mockFactMemoryData = { childrenCount: 1 };
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p25_2',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'bachcha kab hoga',
          maritalStatus: 'Married'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(res.jsonData.text).toContain('doosri santan');
  });

  it('17. Verify Phase 2.5 - Test 3: targetExam extraction', async () => {
    mockFactMemoryData = null;
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p25_3',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'SSC ki taiyari',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(mockFactMemoryData?.targetExam).toBe('SSC');
  });

  it('18. Verify Phase 2.5 - Test 4: targetExam contradiction', async () => {
    mockFactMemoryData = { targetExam: 'SSC' };
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p25_4',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'UPSC kab',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(res.jsonData.text).toContain('SSC');
    expect(res.jsonData.text).toContain('focus ab bhi SSC');
  });

  it('19. Verify Phase 2.5 - Test 5: breakup contradiction', async () => {
    mockFactMemoryData = null;
    const req1 = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p25_5',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'breakup ho gaya',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res1 = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req1, res1);

    const req2 = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p25_5',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'kya meri girlfriend mujhse pyaar karti hai',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res2 = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req2, res2);
    expect(res2.jsonData.text).toContain('patch-up');
  });

  it('19b. Verify Clarification Resolution - Test 1: hnn patchup ke bare mai puch ra', async () => {
    mockFactMemoryData = null;
    const req1 = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_clarify_1',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'breakup ho gaya',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res1 = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req1, res1);

    const req2 = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_clarify_1',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'kya meri girlfriend vapas aayegi',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res2 = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req2, res2);
    expect(res2.jsonData.text).toContain('patch-up');

    const req3 = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_clarify_1',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'hnn patchup ke bare mai puch ra',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res3 = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req3, res3);
    expect(res3.jsonData.text).toContain('Prediction');

    const req4 = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_clarify_1',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'kya meri girlfriend vapas aayegi',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res4 = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req4, res4);
    expect(res4.jsonData.text).toContain('Prediction');
    expect(res4.jsonData.text).not.toContain('patch-up');
  });

  it('19c. Verify Clarification Resolution - Test 2: hnn ex girlfriend ke bare mai', async () => {
    mockFactMemoryData = { awaitingClarification: true, clarificationType: 'relationship_return', girlfriendStatus: 'breakup' };
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_clarify_2',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'hnn ex girlfriend ke bare mai',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(res.jsonData.text).toContain('Prediction');
  });

  it('19d. Verify Clarification Resolution - Test 3: wahi ladki', async () => {
    mockFactMemoryData = { awaitingClarification: true, clarificationType: 'relationship_return', girlfriendStatus: 'breakup' };
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_clarify_3',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'wahi ladki',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(res.jsonData.text).toContain('Prediction');
  });

  it('19e. Verify Clarification Resolution - Test 4: usi ke baare me', async () => {
    mockFactMemoryData = { awaitingClarification: true, clarificationType: 'relationship_return', girlfriendStatus: 'breakup' };
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_clarify_4',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'usi ke baare me',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(res.jsonData.text).toContain('Prediction');
  });

  it('20. Verify Phase 2.5.1 - Test 1: Married check with empty factMemory and userData.maritalStatus=Married', async () => {
    mockFactMemoryData = null;
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p251_1',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'shaadi kab hogi',
          maritalStatus: 'Married'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(res.jsonData.text).toContain('punarvivah');
  });

  it('21. Verify Phase 2.5.1 - Test 2: previousTargetExam with targetExam=SSC and question=UPSC kab', async () => {
    mockFactMemoryData = { targetExam: 'SSC' };
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p251_2',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'UPSC kab',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(res.jsonData.text).toContain('focus ab bhi SSC');
  });

  it('22. Verify Phase 2.5.1 - Test 3: buildCompactContext prompt generation', async () => {
    const { generateAIResponse } = await import('../services/aiService.js');
    const { getAstrologyData } = await import('../src/utils/astroEngine.js');
    
    generateAIResponse.mockClear();
    getAstrologyData.mockClear();

    getAstrologyData.mockResolvedValueOnce({
      lagna: 'Kanya',
      moonSign: 'Kanya',
      nakshatra: 'Hasta',
      planets: { Sun: 'Kanya', Moon: 'Kanya', Jupiter: 'Kanya', Venus: 'Kanya' },
      mahadasha: 'Jupiter',
      antardasha: 'Mars',
      antardashaEnd: '12/2026',
      gochar: 'Sun in Mesh',
      houses: { Sun: 10 },
      dhaiya: false,
      sadesati: false
    });

    mockFactMemoryData = { childrenCount: 1, targetExam: 'SSC' };

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p251_3',
          dobDay: 31, dobMonth: 8, dobYear: 1995,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'Job kab milegi',
          occupation: 'Government Job',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);

    expect(generateAIResponse).toHaveBeenCalled();
    const lastPrompt = generateAIResponse.mock.calls.find(c => c[0].includes('Occupation='))[0];

    expect(lastPrompt).toContain('Dasha=Jupiter/Mars');
    expect(lastPrompt).toContain('Children=1');
    expect(lastPrompt).toContain('TargetExam=SSC');

    const { buildCompactContext } = await import('../api/pandit-ai.js');
    const compactContextResult = buildCompactContext(
      { occupation: 'Government Job', maritalStatus: 'Single' },
      { mahadasha: 'Jupiter', antardasha: 'Mars' },
      { childrenCount: 1, targetExam: 'SSC' }
    );
    expect(compactContextResult).toContain("Dasha=");
    expect(compactContextResult).not.toContain("astroData?.");
    expect(compactContextResult).not.toContain("wifeAliveBlock");
    expect(compactContextResult).toContain("ChildrenCount=1");
  });

  it('23. Verify Phase 2.6A - Test 1: wife mar gyi extraction', async () => {
    mockFactMemoryData = null;
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p26a_1',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'wife mar gyi',
          maritalStatus: 'Unknown'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(mockFactMemoryData?.wifeAlive).toBe(false);
  });

  it('24. Verify Phase 2.6A - Test 2: wifeAlive=false contradiction clarification', async () => {
    mockFactMemoryData = { wifeAlive: false };
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p26a_2',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'wife kab baat karegi',
          maritalStatus: 'Unknown'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(res.jsonData.text).toContain('Kya aap purani yaadon, punarvivah ya kisi anya sambandh ke baare me pooch rahe hain?');
  });

  it('25. Verify Phase 2.6A - Test 3: meri ek beti hai childrenCount extraction', async () => {
    mockFactMemoryData = null;
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p26a_3',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'meri ek beti hai',
          maritalStatus: 'Married'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(mockFactMemoryData?.childrenCount).toBe(1);
  });

  it('26. Verify Phase 2.6A - Test 4: childrenCount=1 question bachcha kab hoga clarification', async () => {
    mockFactMemoryData = { childrenCount: 1 };
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p26a_4',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'bachcha kab hoga',
          maritalStatus: 'Married'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(res.jsonData.text).toContain('🔮 Prediction:');
    expect(res.jsonData.text).toContain('Pehle se santan sambandhit jankari uplabdh hai.');
    expect(res.jsonData.text).toContain('Kya aap doosri santan ke baare me pooch rahe hain?');
  });

  it('27. Verify Phase 2.6A - Test 5: loan hai financialStatus extraction', async () => {
    mockFactMemoryData = null;
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p26a_5',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'loan hai',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(mockFactMemoryData?.financialStatus).toBe('debt');
  });

  it('28. Verify Phase 2.6A Hotfix - Test 28: wife expire ho gayi extraction', async () => {
    mockFactMemoryData = null;
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p26a_28',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'wife expire ho gayi',
          maritalStatus: 'Unknown'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(mockFactMemoryData?.wifeAlive).toBe(false);
  });

  it('29. Verify Phase 2.6A Hotfix - Test 29: patni nahi rahi extraction', async () => {
    mockFactMemoryData = null;
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p26a_29',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'patni nahi rahi',
          maritalStatus: 'Unknown'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(mockFactMemoryData?.wifeAlive).toBe(false);
  });

  it('30. Verify Phase 2.6A Hotfix - Test 30: childrenCount=1 + bachcha kab hoga structured clarification', async () => {
    mockFactMemoryData = { childrenCount: 1 };
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p26a_30',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'bachcha kab hoga',
          maritalStatus: 'Married'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(res.jsonData.text).toContain('🔮 Prediction:');
    expect(res.jsonData.text).toContain('Pehle se santan sambandhit jankari uplabdh hai.');
    expect(res.jsonData.text).toContain('📿 Reasoning:');
    expect(res.jsonData.text).toContain('Memory ke anusaar pehle ek santan ka ullekh ho chuka hai.');
    expect(res.jsonData.text).toContain('🪔 Guidance:');
    expect(res.jsonData.text).toContain('Kya aap doosri santan ke baare me pooch rahe hain?');
  });

  it('31. Verify Phase 2.6A Hotfix - Test 31: financialStatus=debt prompt contains rule', async () => {
    const { generateAIResponse } = await import('../services/aiService.js');
    const { getAstrologyData } = await import('../src/utils/astroEngine.js');

    generateAIResponse.mockClear();
    getAstrologyData.mockClear();

    getAstrologyData.mockResolvedValueOnce({
      lagna: 'Kanya',
      moonSign: 'Kanya',
      nakshatra: 'Hasta',
      planets: { Sun: 'Kanya' },
      mahadasha: 'Jupiter',
      antardasha: 'Mars',
      antardashaEnd: '12/2026',
      gochar: 'Sun in Mesh',
      houses: {},
      dhaiya: false,
      sadesati: false
    });

    mockFactMemoryData = { financialStatus: 'debt' };

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p26a_31',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'karza kaise utare',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    
    expect(generateAIResponse).toHaveBeenCalled();
    const lastPrompt = generateAIResponse.mock.calls.find(c => c[0].includes('Occupation='))[0];
    expect(lastPrompt).toContain('Avoid costly remedies');
  });

  it('32. Verify Phase 2.6A Hotfix - Test 32: previousTargetExam=SSC + UPSC query asks exam switch', async () => {
    mockFactMemoryData = { previousTargetExam: 'SSC' };
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_p26a_32',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'UPSC ki taiyari kaise karein',
          maritalStatus: 'Single'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(res.jsonData.text).toContain('🔮 Prediction:');
    expect(res.jsonData.text).toContain('Pehle SSC taiyari ka ullekh kiya gaya tha.');
    expect(res.jsonData.text).toContain('Kya focus ab bhi SSC par hai ya UPSC ki taraf badal gaya hai?');
  });

  it('33. Verify Greeting "Hello Pandit ji" returns conversational response and secret/score', async () => {
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_greetings',
          question: 'Hello Pandit ji'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(res.jsonData.text).not.toContain('🔮 Prediction:');
    expect(res.jsonData.text).not.toContain('📿 Astrological Reasoning:');
    expect(res.jsonData.text).not.toContain('🪔 Guidance:');
    expect(res.jsonData.text).toContain('Kaise hain aap');
    expect(res.jsonData.text).toContain('Aaj Ka Secret:');
    expect(res.jsonData.text).toContain('Karma Score:');
  });

  it('34. Verify "meri shadi kb hogi" with Married status inside birthDetails redirects to married life/punarvivah', async () => {
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_married_shadi',
          dobDay: 31, dobMonth: 8, dobYear: 1990,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'meri shadi kb hogi',
          birthDetails: {
            maritalStatus: 'Married'
          }
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(res.jsonData.text).toContain('punarvivah');
  });

  it('35. Verify vague message "meri bat suno" returns "Haan Beta, sun raha hun" reply', async () => {
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock_token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_verify_user_vague',
          question: 'meri bat suno'
        },
        history: []
      }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await handler(req, res);
    expect(res.jsonData.text).toContain('Haan Beta, sun raha hun');
  });

  it('36. Verify Zero-Refusal Manual Queries', async () => {
    const queries = [
      'Hello',
      'Hlo pandi ji',
      'Namaste',
      'Mujhe ek sawal puchna hai',
      'Help',
      'Kya',
      'Meri GF kab wapas aayegi',
      'Shaadi kab hogi',
      'Promotion kab hoga',
      'Business me loss kyu'
    ];

    for (const q of queries) {
      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer mock_token' },
        body: {
          mode: 'chat',
          userData: {
            uid: 'test_verify_user_manual',
            question: q
          },
          history: []
        }
      };
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.jsonData = data; return this; }
      };

      await handler(req, res);
      expect(res.statusCode).toBe(200);
      const text = res.jsonData?.text || "";
      expect(text.toLowerCase()).not.toContain('unable to verify');
      expect(text.toLowerCase()).not.toContain('invalid question');
      expect(text.toLowerCase()).not.toContain('unsupported request');
      expect(text.toLowerCase()).not.toContain('technical issue');
    }
  });

  it('37. Verify parseModelResponse() utility behavior', async () => {
    const { parseModelResponse } = await import('../api/pandit-ai.js');

    // 1. JSON Backward Compatibility
    const jsonInput = '{"score": 85, "guidance": "Relationship looks very compatible.", "sections": []}';
    const parsedJson = parseModelResponse(jsonInput);
    expect(parsedJson.score).toBe(85);
    expect(parsedJson.guidance).toBe("Relationship looks very compatible.");

    // 2. Structured Headers
    const headerInput = `
🔮 Prediction
Aapko 15 Dec 2026 tak job milegi.

📿 Reasoning
10th bhav me shani gochar kar raha hai.

🪔 Guidance
Shanivaar ko til daan karein. Kya aap career ke baare me detail chahengi?
`;
    const parsedHeaders = parseModelResponse(headerInput);
    expect(parsedHeaders.prediction).toContain("Aapko 15 Dec 2026 tak job milegi.");
    expect(parsedHeaders.reasoning).toContain("10th bhav me shani gochar kar raha hai.");
    expect(parsedHeaders.guidance).toContain("Shanivaar ko til daan karein. Kya aap career ke baare me detail chahengi?");

    // 3. Fallback plaintext (Krishnamurti Style)
    const plainInput = `
Govt job ke 80% yog ban rahe hain agle saal.
Mehnat badhao aur positive raho.
Dasha me shukra aur gochar me guru anukool hain.
Ganesh ji ki upasana karein. Kya aur kuch janna chahte hain?
`;
    const parsedPlain = parseModelResponse(plainInput);
    expect(parsedPlain.prediction).toContain("Govt job ke 80% yog ban rahe hain agle saal.");
    expect(parsedPlain.reasoning).toContain("Dasha me shukra aur gochar me guru anukool hain.");
    expect(parsedPlain.guidance).toContain("Ganesh ji ki upasana karein. Kya aur kuch janna chahte hain?");

    // 4. Short / empty safety
    expect(() => parseModelResponse("No")).toThrow('INCOMPLETE_AI_RESPONSE');
    expect(() => parseModelResponse(null)).toThrow('INVALID_AI_RESPONSE');
  });
});
