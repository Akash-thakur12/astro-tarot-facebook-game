import { describe, it, expect, vi, beforeEach } from 'vitest';

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
      return { uid: 'test_user_semantic' };
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
vi.mock('../services/aiService.js', () => ({
  generateAIResponse: vi.fn()
}));

import { extractSemanticFacts, mergeSemanticFacts, migrateFactMemory, getFact, setFact, sanitizeFactMemory } from '../src/utils/semanticMemory.js';
import handler, { buildCompactContext } from '../api/pandit-ai.js';
import { generateAIResponse } from '../services/aiService.js';

describe('Phase 2.7 - Semantic Memory Engine Tests', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. valid JSON extraction', async () => {
    const mockJSON = JSON.stringify({
      relationship: {
        wifeAlive: true,
        relationshipStatus: "married",
        girlfriendStatus: "none",
        spouseName: "Anjali"
      },
      family: {
        childrenCount: 1,
        childrenNames: ["Rahul"]
      },
      career: {
        occupation: "Government Job",
        targetExam: "SSC",
        dreamJob: "Inspector"
      },
      finance: {
        status: "debt"
      },
      health: {
        issues: ["diabetes"]
      },
      confidence: 0.95
    });

    vi.mocked(generateAIResponse).mockResolvedValueOnce(mockJSON);

    const result = await extractSemanticFacts({
      question: "SSC ki taiyari chal rahi hai",
      existingFacts: {},
      userProfile: {}
    });

    expect(result.confidence).toBe(0.95);
    expect(result.career.targetExam).toBe("SSC");
    expect(result.relationship.wifeAlive).toBe(true);
    expect(result.family.childrenNames).toContain("Rahul");
    expect(result.finance.status).toBe("debt");
  });

  it('2. malformed JSON fallback', async () => {
    vi.mocked(generateAIResponse).mockResolvedValueOnce("Oops! This is not JSON at all.");

    const result = await extractSemanticFacts({
      question: "Hello",
      existingFacts: {},
      userProfile: {}
    });

    expect(result.confidence).toBe(0.0);
    expect(result.relationship.wifeAlive).toBeNull();
  });

  it('3. confidence threshold', async () => {
    const mockJSON = JSON.stringify({
      relationship: { wifeAlive: true },
      confidence: 0.75
    });

    vi.mocked(generateAIResponse).mockResolvedValueOnce(mockJSON);

    const result = await extractSemanticFacts({
      question: "Kuchh shadi ka yog hai?",
      existingFacts: {},
      userProfile: {}
    });

    expect(result.confidence).toBe(0.75);
    expect(result.confidence).toBeLessThan(0.80);
  });

  it('4. merge keeps explicit user fact & higher confidence wins', () => {
    const existing = {
      wifeAlive: false, 
      targetExam: "SSC",
      history: [
        {
          field: "wifeAlive",
          previous: true,
          current: false,
          confidence: 1.0,
          updatedAt: new Date().toISOString()
        }
      ]
    };

    const semantic = {
      relationship: {
        wifeAlive: true,
        relationshipStatus: "married"
      },
      career: {
        targetExam: "UPSC"
      },
      confidence: 0.85
    };

    const merged = mergeSemanticFacts(existing, semantic);

    expect(merged.wifeAlive).toBe(false);
    expect(merged.facts.relationship.wifeAlive).toBe(false);

    const highConfidenceSemantic = {
      career: {
        targetExam: "UPSC"
      },
      confidence: 0.99
    };
    
    const mergedUPSC = mergeSemanticFacts(
      { targetExam: "SSC", history: [{ field: "targetExam", previous: "None", current: "SSC", confidence: 0.90, updatedAt: new Date().toISOString() }] }, 
      highConfidenceSemantic
    );
    expect(mergedUPSC.targetExam).toBe("UPSC");
  });

  it('5. previous value history', () => {
    const existing = {
      targetExam: "SSC",
      history: []
    };

    const semantic = {
      career: {
        targetExam: "UPSC"
      },
      confidence: 0.95
    };

    const merged = mergeSemanticFacts(existing, semantic);

    expect(merged.targetExam).toBe("UPSC");
    expect(merged.history).toBeInstanceOf(Array);
    const entry = merged.history.find(h => h.field === "targetExam");
    expect(entry).toBeDefined();
    expect(entry.previous).toBe("SSC");
    expect(entry.current).toBe("UPSC");
    expect(entry.confidence).toBe(0.95);
    expect(entry.updatedAt).toBeDefined();
  });

  it('6. Firestore schema', () => {
    const existing = {
      wifeAlive: true
    };
    const semantic = {
      relationship: {
        wifeAlive: false
      },
      confidence: 0.90
    };

    const merged = mergeSemanticFacts(existing, semantic);

    expect(merged.facts).toBeDefined();
    expect(merged.history).toBeDefined();
    expect(merged.updatedAt).toBeDefined();
    expect(merged.version).toBe(2);

    expect(merged.wifeAlive).toBe(false);
    expect(merged.facts.relationship.wifeAlive).toBe(false);
  });

  it('7. prompt under token budget', () => {
    const userData = {
      occupation: "Government Job",
      maritalStatus: "Single"
    };
    const astroData = {
      mahadasha: "Jupiter",
      antardasha: "Mars",
      houses: {}
    };
    const factMemory = {
      wifeAlive: false,
      spouseStatus: "deceased",
      childrenCount: 1,
      targetExam: "SSC",
      financialStatus: "debt"
    };

    const promptText = buildCompactContext(userData, astroData, factMemory);
    const tokenCount = Math.ceil(promptText.length / 4);

    console.log("Calculated Prompt Length (chars):", promptText.length);
    console.log("Calculated Prompt Tokens (approx):", tokenCount);
    console.log("Prompt content:\n", promptText);

    expect(tokenCount).toBeLessThanOrEqual(220);
  });

  // TASK 6 required tests:
  it('childrenBlock interpolation', () => {
    const factMemory = {
      childrenCount: 1
    };
    const context = buildCompactContext({ occupation: 'Government Job' }, {}, factMemory);
    expect(context).toContain('ChildrenCount=1');
    expect(context).toContain('Children=1');
    expect(context).not.toContain('factMemory.childrenCount');
  });

  it('flat->nested migration', () => {
    const legacy = {
      occupation: "Government Job",
      targetExam: "SSC",
      spouseStatus: "deceased",
      wifeAlive: false,
      childrenCount: 2
    };
    const migrated = migrateFactMemory(legacy);
    expect(migrated.facts.career.occupation).toBe("Government Job");
    expect(migrated.facts.career.targetExam).toBe("SSC");
    expect(migrated.facts.relationship.spouseStatus).toBe("deceased");
    expect(migrated.facts.relationship.wifeAlive).toBe(false);
    expect(migrated.facts.family.childrenCount).toBe(2);
  });

  it('history append', () => {
    const existing = {
      targetExam: "SSC",
      history: [
        { field: "targetExam", previous: "None", current: "SSC", confidence: 0.90, updatedAt: "2026-01-01T00:00:00.000Z" }
      ]
    };
    const semantic = {
      career: { targetExam: "UPSC" },
      confidence: 0.95
    };
    const merged = mergeSemanticFacts(existing, semantic);
    expect(merged.history.length).toBe(2);
    expect(merged.history[0].current).toBe("SSC");
    expect(merged.history[1].current).toBe("UPSC");
    expect(merged.history[1].previous).toBe("SSC");
  });

  it('recursion guard', async () => {
    vi.mocked(generateAIResponse).mockResolvedValueOnce(JSON.stringify({ success: true, fromAI: true }));
    
    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid_token'
      },
      body: {
        purpose: 'semantic-memory',
        prompt: 'Extract details from user: job=private',
        userData: { uid: 'user1' }
      }
    };
    
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, fromAI: true });
    expect(generateAIResponse).toHaveBeenCalledWith('Extract details from user: job=private', { purpose: 'semantic-memory', jsonMode: true });
  });

  it('backward compatibility', () => {
    const oldDoc = {
      occupation: "Government Job",
      targetExam: "SSC",
      history: {
        targetExam: {
          previous: "None",
          current: "SSC",
          confidence: 0.85,
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      }
    };
    
    const migrated = migrateFactMemory(oldDoc);
    expect(migrated.facts.career.occupation).toBe("Government Job");
    expect(migrated.facts.career.targetExam).toBe("SSC");
    expect(migrated.history).toBeInstanceOf(Array);
    expect(migrated.history[0].field).toBe("targetExam");
    expect(migrated.history[0].current).toBe("SSC");
    expect(migrated.history[0].confidence).toBe(0.85);
  });

  it('buildCompactContext output', () => {
    const userData = {
      occupation: "Government Job",
      maritalStatus: "Single"
    };
    const astroData = {
      mahadasha: "Jupiter",
      antardasha: "Mars"
    };
    const factMemory = {
      wifeAlive: false,
      spouseStatus: "deceased",
      childrenCount: 1,
      targetExam: "SSC",
      financialStatus: "debt"
    };
    
    const context = buildCompactContext(userData, astroData, factMemory);
    expect(context).toContain('Occupation=Government Job');
    expect(context).toContain('Marital=Widowed'); // relationshipLoss triggers Widowed
    expect(context).toContain('Dasha=Jupiter/Mars');
    expect(context).toContain('WifeAlive=false');
    expect(context).toContain('ChildrenCount=1');
    expect(context).toContain('Children=1');
    expect(context).toContain('TargetExam=SSC');
  });

  describe('Production Hardening Sprint (P0) Security & Sanitization Tests', () => {
    it('should sanitize fact memory by removing unknown keys and keeping whitelisted keys', () => {
      const dirtyFacts = {
        wifeAlive: true,
        wifeName: "Anjali",
        unknownKey: "hack",
        nestedHack: { malicious: true },
        occupation: "Software Engineer",
        age: "25"
      };

      const clean = sanitizeFactMemory(dirtyFacts);

      expect(clean.wifeAlive).toBe(true);
      expect(clean.wifeName).toBe("Anjali");
      expect(clean.unknownKey).toBeUndefined();
      expect(clean.nestedHack).toBeUndefined();
      expect(clean.occupation).toBe("Software Engineer");
      expect(clean.age).toBe("25");
    });

    it('should trim string values and restrict to max length of 100', () => {
      const longString = "A".repeat(150);
      const dirtyFacts = {
        wifeName: "  " + longString + "  ",
        occupation: "  Teacher  "
      };

      const clean = sanitizeFactMemory(dirtyFacts);

      expect(clean.wifeName).toBe("A".repeat(100));
      expect(clean.occupation).toBe("Teacher");
    });

    it('should restrict array values to max length of 10', () => {
      const dirtyFacts = {
        childrenNames: Array.from({ length: 15 }, (_, i) => `Child ${i}`)
      };

      const clean = sanitizeFactMemory(dirtyFacts);

      expect(clean.childrenNames.length).toBe(10);
      expect(clean.childrenNames[0]).toBe("Child 0");
      expect(clean.childrenNames[9]).toBe("Child 9");
    });

    it('should validate childrenCount integer bounds 0-20', () => {
      expect(sanitizeFactMemory({ childrenCount: 5 }).childrenCount).toBe(5);
      expect(sanitizeFactMemory({ childrenCount: 0 }).childrenCount).toBe(0);
      expect(sanitizeFactMemory({ childrenCount: 20 }).childrenCount).toBe(20);
      expect(sanitizeFactMemory({ childrenCount: -1 }).childrenCount).toBeNull();
      expect(sanitizeFactMemory({ childrenCount: 21 }).childrenCount).toBeNull();
      expect(sanitizeFactMemory({ childrenCount: "12" }).childrenCount).toBe(12);
      expect(sanitizeFactMemory({ childrenCount: "invalid" }).childrenCount).toBeNull();
    });

    it('should reject nested objects except approved category structure', () => {
      const factsStruct = {
        wifeAlive: true,
        facts: {
          relationship: { wifeAlive: true, spouseName: "Anjali" },
          family: { childrenCount: 2, childrenNames: ["A", "B"] },
          career: { occupation: "Doctor" },
          finance: { status: "stable" },
          health: { issues: ["mild headache"] },
          unapprovedCategory: { hack: 1 }
        }
      };

      const clean = sanitizeFactMemory(factsStruct);

      expect(clean.wifeAlive).toBe(true);
      expect(clean.facts.relationship.spouseName).toBe("Anjali");
      expect(clean.facts.family.childrenCount).toBe(2);
      expect(clean.facts.career.occupation).toBe("Doctor");
      expect(clean.facts.finance.status).toBe("stable");
      expect(clean.facts.health.issues).toContain("mild headache");
      expect(clean.facts.unapprovedCategory).toBeUndefined();
    });

    it('should block prototype pollution keys and reject functions', () => {
      const pollutedFacts = {
        wifeAlive: true,
        __proto__: { poll: true },
        constructor: { name: "Polluter" },
        prototype: { foo: "bar" },
        someFunc: () => { console.log("evil"); }
      };

      const clean = sanitizeFactMemory(pollutedFacts);

      expect(clean.wifeAlive).toBe(true);
      expect(clean.__proto__).not.toHaveProperty("poll");
      expect(clean.hasOwnProperty("constructor")).toBe(false);
      expect(clean.hasOwnProperty("prototype")).toBe(false);
      expect(clean.someFunc).toBeUndefined();
    });
  });

});
