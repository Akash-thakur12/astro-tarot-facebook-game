import { vi, describe, it, expect } from 'vitest';
import { humanize } from '../src/utils/humanizer.js';
import handler from '../api/pandit-ai.js';

// Mock firebase-admin
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  cert: vi.fn(),
  getApps: vi.fn(() => [{ name: 'mock' }])
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: vi.fn(async (token) => {
      return { uid: 'test_verify_user' };
    })
  }))
}));

let mockProfileData = null;
let mockFactsData = null;

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
                return { exists: false };
              }),
              set: vi.fn(async () => {})
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
  generateAIResponse: vi.fn(async () => {
    return mockAIResponse;
  })
}));

describe('CRITICAL BUGFIX Verification Tests', () => {
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
      const isGreetingResponse = res.jsonData?.text?.includes("Namaste! Kaise hain aap?");
      console.log(`Input: "${tc.q}" -> Is Greeting: ${isGreetingResponse} (Expected: ${tc.shouldBeGreeting})`);
      expect(isGreetingResponse).toBe(tc.shouldBeGreeting);
    }
  });

  it('2. ADD "samay" to forbidden list / validation', async () => {
    // We can indirectly verify containsForbiddenPhrases triggers retry/failure or returns correctly
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

    // Setting mock response with forbidden word
    mockAIResponse = "🔮 Prediction: Samay badlega.\n📿 Reasoning: Kundali me samay achha hai.\n🪔 Guidance: Mantra jaap.";
    
    process.env.BEDROCK_API_KEY = "mock-key";
    process.env.BEDROCK_BASE_URL = "mock-url";

    await handler(req, res);
    
    // Should trigger validation retry and eventually return the 3x validation fail text
    expect(res.jsonData.text).toContain('Takneeki karan se vistar se nahi bata pa raha');
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

    mockAIResponse = "🔮 Prediction: Kuch bhi.\n📿 Reasoning: Grah achhe hain.\n🪔 Guidance: Mantra.";
    
    await handler(req, res);
    
    expect(res.jsonData.text).toContain('Kundali data uplabdh nahi hai.');
    expect(res.jsonData.text).toContain('Janm details sahi nahi mili.');
    expect(res.jsonData.text).toContain('DOB, time, city check karke dobara puchiye.');
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

    await handler(req, res);

    expect(res.jsonData.text).toContain('🔮 Prediction:\nAapke profile ke anusaar aap avivahit hain.');
    expect(res.jsonData.text).toContain('📿 Reasoning:\nCurrent profile me marital status Single hai.');
    expect(res.jsonData.text).toContain('🪔 Guidance:\nYadi sambandh ya bhavishya ke vivaah ke baare me poochna hai to uske baare me pooch sakte hain.');
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

    await handler(req, res);

    expect(res.jsonData.text).toContain('🔮 Prediction:\nAapke profile ke anusaar aap avivahit hain, isliye patni sambandhit prashn laagu nahi hota.');
    expect(res.jsonData.text).toContain('📿 Reasoning:\nCurrent profile me marital status Single hai.');
    expect(res.jsonData.text).toContain('🪔 Guidance:\nYadi bhavishya ke vivaah ya sambandh ke baare me poochna hai to uske baare me pooch sakte hain.');
  });
});
