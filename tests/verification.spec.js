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

vi.mock('firebase-admin/firestore', () => {
  const mockGet = vi.fn(async () => ({
    exists: true,
    data: vi.fn(() => ({ coins: 1000, premium: true, name: 'Test User' }))
  }));
  const mockSet = vi.fn(async () => {});
  const mockUpdate = vi.fn(async () => {});
  
  return {
    getFirestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: mockGet,
          set: mockSet,
          update: mockUpdate,
          collection: vi.fn(() => ({
            doc: vi.fn(() => ({
              get: vi.fn(async () => ({ exists: false })),
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
});
