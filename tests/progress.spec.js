import { vi, describe, it, expect } from 'vitest';

// Mock firebase-admin completely
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  cert: vi.fn(),
  getApps: vi.fn(() => [{ name: 'mock' }])
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: vi.fn(async (token) => {
      if (token === 'invalid_token') throw new Error("Invalid");
      return { uid: 'test_user_progress' };
    })
  }))
}));

vi.mock('firebase-admin/firestore', () => {
  const mockGet = vi.fn(async () => ({
    exists: true,
    data: vi.fn(() => ({ coins: 1000, premium: true, name: 'Test User', dob: '1999-08-31' }))
  }));
  const mockSet = vi.fn(async () => {});
  const mockUpdate = vi.fn(async () => {});
  
  const mockDb = {
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
  };
  
  return {
    getFirestore: vi.fn(() => mockDb),
    FieldValue: {
      serverTimestamp: vi.fn(() => 'mock-timestamp')
    }
  };
});

// Mock services/aiService.js so we don't hit external model APIs
vi.mock('../services/aiService.js', () => ({
  generateAIResponse: vi.fn(async (prompt) => {
    if (prompt.includes("Mera lucky number")) {
      return `🔮 Prediction: Mai jyotish se sambandhit prashna ka hi uttar de sakta hun.
📿 Reasoning: Aapka prashna Mera lucky number kya hai? kundali par aadharit nahi hai. Jyotish me bhav aur grah dekha jata hai.
🪔 Guidance: Agar aap kundali alternative jaanna chahte hain to puch sakte hain.`;
    }
    if (prompt.includes("PROFILE ACKNOWLEDGEMENT MODE RULES")) {
      const leaks = [];
      const forbidden = ['vrishchik', 'ashwini', 'government service', 'spouse', 'deceased', 'debt'];
      for (const word of forbidden) {
        if (prompt.toLowerCase().includes(word)) {
          leaks.push(word);
        }
      }
      if (leaks.length > 0) {
        return `🔮 Prediction: Leaked: ${leaks.join(', ')}`;
      }
      if (prompt.includes("Married: Yes")) {
        return `🔮 Prediction: Ji haan, aapke profile ke anusaar aap vivahit hain.`;
      }
      if (prompt.includes("Occupation: Government Job")) {
        return `🔮 Prediction: Ji haan, aapke profile ke anusaar aap sarkari naukri me hain.`;
      }
      return `🔮 Prediction: Ji haan, mujhe aapke details ke baare me pata hai.`;
    }
    if (prompt.includes("MEMORY RECALL MODE RULES")) {
      const leaks = [];
      const forbidden = ['vrishchik', 'ashwini', 'government service', 'spouse', 'deceased', 'debt'];
      for (const word of forbidden) {
        if (prompt.toLowerCase().includes(word)) {
          leaks.push(word);
        }
      }
      if (leaks.length > 0) {
        return `🔮 Prediction: Leaked: ${leaks.join(', ')}`;
      }
      return `🔮 Prediction: Mujhe aapke baare me ye details yaad hain:\n- Naam: Akash\n- Janm Sthan: Hamirpur Himachal Pradesh`;
    }
    if (prompt.includes("VAGUE MODE RULES")) {
      const leaks = [];
      const forbidden = ['vrishchik', 'ashwini', 'himachal pradesh', 'wifealive', 'childrencount', 'financialstatus', 'government service', 'spouse', 'deceased', 'debt', 'pob'];
      for (const word of forbidden) {
        if (prompt.toLowerCase().includes(word)) {
          leaks.push(word);
        }
      }
      if (leaks.length > 0) {
        return `🔮 Prediction: Leaked: ${leaks.join(', ')}`;
      }
      return `🔮 Prediction: Ji beta, poochiye. Main aapka sawal sunne ke liye taiyar hoon.`;
    }
    if (prompt.includes("GREETING MODE RULES")) {
      const leaks = [];
      const forbidden = ['vrishchik', 'ashwini', 'himachal pradesh', 'wifealive', 'childrencount', 'financialstatus'];
      for (const word of forbidden) {
        if (prompt.toLowerCase().includes(word)) {
          leaks.push(word);
        }
      }
      if (leaks.length > 0) {
        return `🔮 Prediction: Leaked: ${leaks.join(', ')}`;
      }
      return `🔮 Prediction: Namaste! Kaise hain aap? Aaj aap kya puchna chahte hain?`;
    }
    if (prompt.toLowerCase().includes("shaadi") || prompt.toLowerCase().includes("shadi")) {
      return `🔮 Prediction: Vivah ke yog 2026 ke baad majboot dikh rahe hain.
📿 Reasoning: Lagna Vrishchik hai aur Dasha achhi hai.
🪔 Guidance: Mangal grah ke mantra ka jaap karein.`;
    }
    return `🔮 Prediction: Aapka career safal hoga.
📿 Reasoning: Lagna Vrishchik hai aur Dasha achhi hai.
🪔 Guidance: Mangal grah ke mantra ka jaap karein.`;
  })
}));

// Now import target modules
import handler from '../api/pandit-ai.js';
import { getProgress, updateProgress, getDailySecret } from '../src/utils/progressEngine.js';

describe('Pandit AI - Addiction & Progress Engine', () => {

  it('should correctly initialize and update progress stats', async () => {
    const uid = 'test_progress_user';
    const progress = await getProgress(uid);
    expect(progress.score).toBe(0);
    expect(progress.streak).toBe(0);

    const updated = await updateProgress(uid, 'checkin');
    expect(updated.score).toBe(5);
    expect(updated.streak).toBe(1);
  });

  it('should return 200 with 5-section response (Prediction, Reasoning, Guidance, Secret, Score) for astrology question', async () => {
    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid_mock_token'
      },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_progress_user',
          dobDay: 31,
          dobMonth: 8,
          dobYear: 1999,
          tobHour: 12,
          tobMinute: 50,
          tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'Job kab lagegi'
        },
        history: []
      }
    };

    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };

    process.env.BEDROCK_API_KEY = "mock-key";
    process.env.BEDROCK_BASE_URL = "mock-url";

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonData.text).toContain('🔮 Prediction:');
    expect(res.jsonData.text).toContain('📿 Reasoning:');
    expect(res.jsonData.text).toContain('🪔 Guidance:');
    expect(res.jsonData.text).toContain('🎲 Aaj Ka Secret:');
    expect(res.jsonData.text).toContain('📊 Karma Score:');
  });

  it('should return 4-section fallback format for non-astrological question', async () => {
    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid_mock_token'
      },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_progress_user',
          dobDay: 31,
          dobMonth: 8,
          dobYear: 1999,
          tobHour: 12,
          tobMinute: 50,
          tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'Mera lucky number kya hai?'
        },
        history: []
      }
    };

    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };

    process.env.BEDROCK_API_KEY = "mock-key";
    process.env.BEDROCK_BASE_URL = "mock-url";

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonData.text).toContain('Mai jyotish se sambandhit prashna ka hi uttar de sakta hun.');
    expect(res.jsonData.text).toContain('🎲 Aaj Ka Secret:');
    expect(res.jsonData.text).toContain('📊 Karma Score:');
  });

  it('should route "muje ek bat puchni hai" to vague mode and not contain astrology parameters', async () => {
    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-token'
      },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_vague_user',
          dobDay: 31,
          dobMonth: 8,
          dobYear: 1999,
          tobHour: 12,
          tobMinute: 50,
          tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'muje ek bat puchni hai'
        },
        history: []
      }
    };

    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };

    process.env.BEDROCK_API_KEY = "mock-key";
    process.env.BEDROCK_BASE_URL = "mock-url";

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonData).not.toBeNull();
    const text = res.jsonData.text;
    expect(text).toContain('sawal sunne ke liye taiyar hoon');
    expect(text).not.toContain('Nakshatra');
    expect(text).not.toContain('Mahadasha');
    expect(text).not.toContain('Antardasha');
    expect(text).not.toContain('Lagna');
  });

  it('should isolate greeting mode and not leak any astrology/profile data', async () => {
    const inputs = ['hi', 'hii', 'hiii', 'hello', 'helo', 'hlo', 'ram ram ji'];
    for (const input of inputs) {
      const req = {
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-token'
        },
        body: {
          mode: 'chat',
          userData: {
            uid: 'test_greeting_user',
            dobDay: 31,
            dobMonth: 8,
            dobYear: 1999,
            tobHour: 12,
            tobMinute: 50,
            tobPeriod: 'PM',
            pob: 'Hamirpur Himachal Pradesh',
            question: input
          },
          history: []
        }
      };

      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.jsonData = data;
          return this;
        }
      };

      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.jsonData).not.toBeNull();
      const text = res.jsonData.text.toLowerCase();
      expect(text).not.toContain('mahadasha');
      expect(text).not.toContain('nakshatra');
      expect(text).not.toContain('lagna');
      expect(text).not.toContain('government job');
      expect(text).not.toContain('wife');
      expect(text).not.toContain('family');
      expect(text).not.toContain('finance');
      expect(text).not.toContain('leaked');
    }
  });

  it('should route "ek bat puchni thi apse" to vague mode and not contain profile/astrology parameters', async () => {
    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-token'
      },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_vague_user_2',
          dobDay: 31,
          dobMonth: 8,
          dobYear: 1999,
          tobHour: 12,
          tobMinute: 50,
          tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'ek bat puchni thi apse'
        },
        history: []
      }
    };

    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonData).not.toBeNull();
    const text = res.jsonData.text.toLowerCase();
    expect(text).toContain('sawal sunne ke liye taiyar hoon');
    expect(text).not.toContain('government');
    expect(text).not.toContain('wife');
    expect(text).not.toContain('family');
    expect(text).not.toContain('finance');
    expect(text).not.toContain('child');
    expect(text).not.toContain('hamirpur');
    expect(text).not.toContain('leaked');
  });

  it('should route "meri shaadi kab hogi" and not start with standard greeting', async () => {
    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-token'
      },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_marriage_user',
          dobDay: 31,
          dobMonth: 8,
          dobYear: 1999,
          tobHour: 12,
          tobMinute: 50,
          tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'meri shaadi kab hogi'
        },
        history: []
      }
    };

    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonData).not.toBeNull();
    const text = res.jsonData.text;
    expect(text).not.toMatch(/^(Ram Ram beta|Namaste beta|Pranam beta)/i);
  });

  it('should route "ram ram ji" as greeting', async () => {
    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-token'
      },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_greeting_ji_user',
          dobDay: 31,
          dobMonth: 8,
          dobYear: 1999,
          tobHour: 12,
          tobMinute: 50,
          tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          question: 'ram ram ji'
        },
        history: []
      }
    };

    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonData).not.toBeNull();
    const text = res.jsonData.text.toLowerCase();
    expect(text).toContain('namaste');
  });

  it('should route profile acknowledgement inputs and verify no leaks', async () => {
    const cases = [
      { q: 'apko pta hai mai shadi shuda hu', expected: 'vivahit hain', maritalStatus: 'Married', occupation: 'Unknown' },
      { q: 'apko pta hai mai sarkari naukri me hu', expected: 'sarkari naukri', maritalStatus: 'Unknown', occupation: 'Government Job' },
      { q: 'apko mera janm sthan yaad hai', expected: 'details ke baare me pata hai', maritalStatus: 'Unknown', occupation: 'Unknown' }
    ];

    for (const c of cases) {
      const req = {
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-token'
        },
        body: {
          mode: 'chat',
          userData: {
            uid: 'test_ack_user_' + Math.random().toString(36).substring(7),
            dobDay: 31,
            dobMonth: 8,
            dobYear: 1999,
            tobHour: 12,
            tobMinute: 50,
            tobPeriod: 'PM',
            pob: 'Hamirpur Himachal Pradesh',
            maritalStatus: c.maritalStatus,
            occupation: c.occupation,
            question: c.q
          },
          history: []
        }
      };

      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.jsonData = data;
          return this;
        }
      };

      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.jsonData).not.toBeNull();
      const text = res.jsonData.text.toLowerCase();
      expect(text).toContain(c.expected);
      expect(text).not.toContain('leaked');
    }
  });

  it('should handle direct recall queries without LLM and preserve user language script preference', async () => {
    const cases = [
      { q: 'mera naam kya hai', expected: 'akash' },
      { q: 'mera DOB kya hai', expected: '31-08-1999' },
      { q: 'mera janm sthan kya hai', expected: 'hamirpur' },
      { q: 'meri age kitni hai', expected: '26 saal' },
      { q: 'mai kya kaam karta hu', expected: 'sarkari naukri' },
      { q: 'mere kitne bachche hain', expected: '1 bachche' }
    ];

    for (const c of cases) {
      const req = {
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-token'
        },
        body: {
          mode: 'chat',
          userData: {
            uid: 'test_direct_recall_user',
            name: 'Akash',
            dobDay: 31,
            dobMonth: 8,
            dobYear: 1999,
            tobHour: 12,
            tobMinute: 50,
            tobPeriod: 'PM',
            pob: 'Hamirpur Himachal Pradesh',
            maritalStatus: 'Married',
            occupation: 'Government Job',
            childrenCount: 1,
            question: c.q
          },
          history: []
        }
      };

      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.jsonData = data;
          return this;
        }
      };

      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.jsonData).not.toBeNull();
      const text = res.jsonData.text.toLowerCase();
      expect(text).toContain(c.expected);
      expect(text).not.toContain('leaked');
    }
  });

  it('should route general recall queries to Tier 6 (LLM Memory Recall) and verify no leaks', async () => {
    const cases = [
      { q: 'mere baare me kya yaad hai', expected: 'naam: akash' },
      { q: 'maine tumhe kya bataya tha', expected: 'hamirpur' }
    ];

    for (const c of cases) {
      const req = {
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-token'
        },
        body: {
          mode: 'chat',
          userData: {
            uid: 'test_llm_recall_user',
            dobDay: 31,
            dobMonth: 8,
            dobYear: 1999,
            tobHour: 12,
            tobMinute: 50,
            tobPeriod: 'PM',
            pob: 'Hamirpur Himachal Pradesh',
            maritalStatus: 'Married',
            occupation: 'Government Job',
            question: c.q
          },
          history: []
        }
      };

      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.jsonData = data;
          return this;
        }
      };

      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.jsonData).not.toBeNull();
      const text = res.jsonData.text.toLowerCase();
      expect(text).toContain(c.expected);
      expect(text).not.toContain('leaked');
    }
  });

  it('should route profile acknowledgement direct confirmation patterns to Tier 5', async () => {
    const cases = [
      { q: 'meri shaadi ho chuki hai na', expected: 'vivahit hain' },
      { q: 'vivahit hu na', expected: 'vivahit hain' }
    ];

    for (const c of cases) {
      const req = {
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-token'
        },
        body: {
          mode: 'chat',
          userData: {
            uid: 'test_ack_direct_user',
            dobDay: 31,
            dobMonth: 8,
            dobYear: 1999,
            tobHour: 12,
            tobMinute: 50,
            tobPeriod: 'PM',
            pob: 'Hamirpur Himachal Pradesh',
            maritalStatus: 'Married',
            occupation: 'Government Job',
            question: c.q
          },
          history: []
        }
      };

      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.jsonData = data;
          return this;
        }
      };

      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.jsonData).not.toBeNull();
      const text = res.jsonData.text.toLowerCase();
      expect(text).toContain(c.expected);
      expect(text).not.toContain('leaked');
    }
  });

  it('should validate dasha presence using validateAstroResponse', async () => {
    const { validateAstroResponse } = await import('../api/pandit-ai.js');
    const astroData = {
      mahadasha: 'Sun',
      antardasha: 'Mercury'
    };
    
    // Set TEST_DASHA_PRESERVATION env var to true
    process.env.TEST_DASHA_PRESERVATION = 'true';
    try {
      // Valid response with both Surya and Budh
      expect(validateAstroResponse('Aapki Surya dasha chal rahi hai aur Budh bhava me hai. Secret: 1. Score: 5', astroData)).toBe(true);
      
      // Invalid response with only Surya
      expect(validateAstroResponse('Aapki Surya dasha chal rahi hai. Secret: 1. Score: 5', astroData)).toBe(false);
      
      // Invalid response with neither
      expect(validateAstroResponse('Kuch nahi chal raha. Secret: 1. Score: 5', astroData)).toBe(false);
    } finally {
      delete process.env.TEST_DASHA_PRESERVATION;
    }
  });

  it('should verify persistent topic progression and cliffhanger tracking across subsequent turns', async () => {
    const { getAuth } = await import('firebase-admin/auth');
    const auth = getAuth();
    vi.spyOn(auth, 'verifyIdToken').mockResolvedValue({ uid: 'test_progress_user' });

    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();
    const docRef = db.collection('users').doc('test_progress_user');
    const mockGet = docRef.get;
    const mockUpdate = docRef.update;

    let userStore = {
      coins: 1000,
      premium: true,
      name: 'Akash',
      dob: '1999-08-31',
      topicProgress: {
        marriage: 1, love: 1, career: 1, money: 1, health: 1, travel: 1, children: 1, daily: 1
      },
      lastCliffhangers: [],
      lastActiveTopic: null
    };

    mockGet.mockImplementation(async () => ({
      exists: true,
      data: () => userStore
    }));

    mockUpdate.mockImplementation(async (updates) => {
      userStore = { ...userStore, ...updates };
    });

    // Mock db.runTransaction so that it performs actual updates in the userStore
    db.runTransaction.mockImplementation(async (cb) => {
      const tx = {
        get: async () => ({
          exists: true,
          data: () => userStore
        }),
        update: (ref, updates) => {
          userStore = { ...userStore, ...updates };
        }
      };
      return cb(tx);
    });

    // Mock generateAIResponse to return a response with CLIFFHANGER: tag
    const { generateAIResponse } = await import('../services/aiService.js');
    vi.mocked(generateAIResponse).mockResolvedValue(`🔮 Prediction: Aapka career safal hoga.
📿 Reasoning: Lagna Mesh hai.
🪔 Guidance: Puja karein.
🚨 **The Cliffhanger (Open Loop)**
Kya aap sarkari naukri lagne ka samay jaanna chahte hain?

CLIFFHANGER: Kya aap sarkari naukri lagne ka samay jaanna chahte hain?`);

    // Turn 1: Initial query on Career
    const req1 = {
      method: 'POST',
      headers: { authorization: 'Bearer mock-token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_progress_user',
          dobDay: 31, dobMonth: 8, dobYear: 1999,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          maritalStatus: 'Married',
          occupation: 'Government Job',
          question: 'Career kaisa rahega?'
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
    expect(res1.statusCode).toBe(200);
    expect(userStore.lastActiveTopic).toBe('career');
    expect(userStore.topicProgress.career).toBe(1); // Turn 1 should not advance, starts at 1
    expect(userStore.lastCliffhangers).toContain('Kya aap sarkari naukri lagne ka samay jaanna chahte hain?');
    // The CLIFFHANGER tag must be removed from the returned text
    expect(res1.jsonData.text).not.toContain('CLIFFHANGER:');

    // Turn 2: Follow-up query "aur batao"
    const req2 = {
      method: 'POST',
      headers: { authorization: 'Bearer mock-token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_progress_user',
          dobDay: 31, dobMonth: 8, dobYear: 1999,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          maritalStatus: 'Married',
          occupation: 'Government Job',
          question: 'aur batao'
        },
        history: [
          { role: 'user', content: 'Career kaisa rahega?' },
          { role: 'assistant', content: res1.jsonData.text }
        ]
      }
    };
    const res2 = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };

    // Modify generateAIResponse to return a different cliffhanger
    vi.mocked(generateAIResponse).mockResolvedValue(`🔮 Prediction: Agla varsh behtar hoga.
📿 Reasoning: Dasha achhi hai.
🪔 Guidance: Suryadev ko arghya dein.
🚨 **The Cliffhanger (Open Loop)**
Kya aap shubh gemstone jaanna chahte hain?

CLIFFHANGER: Kya aap shubh gemstone jaanna chahte hain?`);

    await handler(req2, res2);
    expect(res2.statusCode).toBe(200);
    expect(userStore.lastActiveTopic).toBe('career');
    expect(userStore.topicProgress.career).toBe(2); // Turn 2 follow-up should advance to 2
    expect(userStore.lastCliffhangers).toContain('Kya aap shubh gemstone jaanna chahte hain?');

    // Turn 3: Same question again (repetition check)
    const req3 = {
      method: 'POST',
      headers: { authorization: 'Bearer mock-token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_progress_user',
          dobDay: 31, dobMonth: 8, dobYear: 1999,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          maritalStatus: 'Married',
          occupation: 'Government Job',
          question: 'aur batao'
        },
        history: [
          { role: 'user', content: 'Career kaisa rahega?' },
          { role: 'assistant', content: res1.jsonData.text },
          { role: 'user', content: 'aur batao' },
          { role: 'assistant', content: res2.jsonData.text }
        ]
      }
    };
    const res3 = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };

    vi.mocked(generateAIResponse).mockResolvedValue(`🔮 Prediction: Dhan labh hoga.
CLIFFHANGER: Dhan labh kab hoga?`);

    await handler(req3, res3);
    expect(res3.statusCode).toBe(200);
    expect(userStore.topicProgress.career).toBe(3); // Should advance to 3
    expect(userStore.lastCliffhangers.length).toBeLessThanOrEqual(3);
  });

  it('should verify follow-up query "hnn btao" does not trigger VAGUE MODE and advances marriage layer progression', async () => {
    const { getAuth } = await import('firebase-admin/auth');
    const auth = getAuth();
    vi.spyOn(auth, 'verifyIdToken').mockResolvedValue({ uid: 'test_vague_override_user' });

    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();
    const docRef = db.collection('users').doc('test_vague_override_user');
    const mockGet = docRef.get;
    const mockUpdate = docRef.update;

    let userStore = {
      coins: 1000,
      premium: true,
      name: 'Akash',
      dob: '1999-08-31',
      topicProgress: {
        marriage: 1, love: 1, career: 1, money: 1, health: 1, travel: 1, children: 1, daily: 1
      },
      lastCliffhangers: [],
      lastActiveTopic: null
    };

    mockGet.mockImplementation(async () => ({
      exists: true,
      data: () => userStore
    }));

    mockUpdate.mockImplementation(async (updates) => {
      userStore = { ...userStore, ...updates };
    });

    db.runTransaction.mockImplementation(async (cb) => {
      const tx = {
        get: async () => ({
          exists: true,
          data: () => userStore
        }),
        update: (ref, updates) => {
          userStore = { ...userStore, ...updates };
        }
      };
      return cb(tx);
    });

    const { generateAIResponse } = await import('../services/aiService.js');
    vi.mocked(generateAIResponse).mockResolvedValue(`🔮 Prediction: Timing holds strong.
📿 Reasoning: Dasha Venus.
🪔 Guidance: Pray.
🚨 **The Cliffhanger (Open Loop)**
Kya aap saathi ka swabhav kaisa hoga jaanna chahte hain?

CLIFFHANGER: Kya aap saathi ka swabhav kaisa hoga jaanna chahte hain?`);

    // Turn 1: Initial query on Marriage
    const req1 = {
      method: 'POST',
      headers: { authorization: 'Bearer mock-token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_vague_override_user',
          dobDay: 31, dobMonth: 8, dobYear: 1999,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          maritalStatus: 'Single',
          occupation: 'Government Job',
          question: 'Meri shadi kab hogi?'
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
    expect(res1.statusCode).toBe(200);
    expect(userStore.lastActiveTopic).toBe('marriage');
    expect(userStore.topicProgress.marriage).toBe(1);

    // Turn 2: Follow-up query "hnn btao" (Should NOT trigger vague mode, should advance target layer to 2)
    const req2 = {
      method: 'POST',
      headers: { authorization: 'Bearer mock-token' },
      body: {
        mode: 'chat',
        userData: {
          uid: 'test_vague_override_user',
          dobDay: 31, dobMonth: 8, dobYear: 1999,
          tobHour: 12, tobMinute: 50, tobPeriod: 'PM',
          pob: 'Hamirpur Himachal Pradesh',
          maritalStatus: 'Single',
          occupation: 'Government Job',
          question: 'hnn btao'
        },
        history: [
          { role: 'user', content: 'Meri shadi kab hogi?' },
          { role: 'assistant', content: res1.jsonData.text }
        ]
      }
    };
    const res2 = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };

    vi.mocked(generateAIResponse).mockImplementation(async (prompt) => {
      if (prompt.includes("Extract ONLY structured facts")) {
        return JSON.stringify({ confidence: 0 });
      }
      // If vague rules are matched, prompt will not contain TARGET_LAYER: 2
      expect(prompt).toContain('ACTIVE_TOPIC: marriage');
      expect(prompt).toContain('TARGET_LAYER: 2');
      expect(prompt).not.toContain('VAGUE MODE RULES');
      return `🔮 Prediction: Partner will be supportive.
CLIFFHANGER: What about spouse profession?`;
    });

    await handler(req2, res2);
    expect(res2.statusCode).toBe(200);
    expect(userStore.lastActiveTopic).toBe('marriage');
    expect(userStore.topicProgress.marriage).toBe(2);
  });
});
