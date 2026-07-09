import { describe, it, expect } from 'vitest';
import { safeParseMemoryState, mergeRecommendationMemory } from '../lib/memoryStateParser.js';

describe('Career & Business Intelligence Engine Tests', () => {
  describe('Memory state parsing and merging with rejectedPaths', () => {
    it('should parse raw memory state containing rejectedPaths correctly', () => {
      const rawText = JSON.stringify({
        advisedCareer: 'Software Engineer',
        advisedBusiness: 'AI SaaS',
        rejectedPaths: [
          { path: 'consulting', cooldown: 9 },
          { path: 'freelancing', cooldown: 5 }
        ]
      });

      const result = safeParseMemoryState(rawText);
      expect(result.success).toBe(true);
      expect(result.memoryState.recommendationMemory.advisedCareer).toBe('Software Engineer');
      expect(result.memoryState.recommendationMemory.advisedBusiness).toBe('AI SaaS');
      expect(result.memoryState.recommendationMemory.rejectedPaths).toEqual([
        { path: 'consulting', cooldown: 9 },
        { path: 'freelancing', cooldown: 5 }
      ]);
    });

    it('should merge recommendation memories containing rejectedPaths correctly', () => {
      const existingMemory = {
        advisedCareer: 'Software Engineer',
        advisedBusiness: 'AI SaaS',
        discouragedPaths: ['freelancing'],
        importantFacts: [],
        rejectedPaths: [
          { path: 'consulting', cooldown: 9 }
        ]
      };

      const newMemory = {
        advisedCareer: 'AI Engineer',
        discouragedPaths: ['teacher'],
        rejectedPaths: [
          { path: 'sales', cooldown: 10 }
        ]
      };

      const merged = mergeRecommendationMemory(existingMemory, newMemory);
      expect(merged.advisedCareer).toBe('AI Engineer');
      expect(merged.advisedBusiness).toBe('AI SaaS');
      expect(merged.discouragedPaths).toEqual(['freelancing', 'teacher']);
      expect(merged.rejectedPaths).toEqual([
        { path: 'sales', cooldown: 10 }
      ]);
    });
  });

  describe('User Rejection Regex Detection Mocks', () => {
    const isRejectionMatch = (text) => {
      const txt = text.toLowerCase().trim();
      const isConsultingRejection = /\bconsulting\s+(nahi|nahin|nahe|ni|nah|nhi|नहीं|नही)(?!\w)/i.test(txt) || /कंसल्टिंग\s+(नहीं|नही)(?!\w)/i.test(txt);
      const isInterestRejection = /\binterest\s+(nahi|nahin|nahe|ni|nah|nhi|नहीं|नही)(?!\w)/i.test(txt) || 
                                   /\bdilchaspi\s+(nahi|nhi|नहीं|नही)(?!\w)/i.test(txt) ||
                                   /\bdilchaspee\s+(nahi|nhi|नहीं|नही)(?!\w)/i.test(txt) ||
                                   /\bruchi\s+(nahi|nhi|नहीं|नही)(?!\w)/i.test(txt) ||
                                   /इंटरेस्ट\s+(नहीं|नही)(?!\w)/i.test(txt) ||
                                   /दिलचस्पी\s+(नहीं|नही)(?!\w)/i.test(txt) ||
                                   /रुचि\s+(नहीं|नही)(?!\w)/i.test(txt);
      const isPasandRejection = /\bpasand\s+(nahi|nahin|nahe|ni|nah|nhi|नहीं|नही)(?!\w)/i.test(txt) || /पसंद\s+(नहीं|नही)(?!\w)/i.test(txt);
      return { isConsultingRejection, isInterestRejection, isPasandRejection };
    };

    it('should detect consulting rejections across scripts and dialects', () => {
      expect(isRejectionMatch("consulting nahi").isConsultingRejection).toBe(true);
      expect(isRejectionMatch("consulting nhi").isConsultingRejection).toBe(true);
      expect(isRejectionMatch("consulting nahi chahiye").isConsultingRejection).toBe(true);
      expect(isRejectionMatch("consulting नहीं").isConsultingRejection).toBe(true);
      expect(isRejectionMatch("कंसल्टिंग नही").isConsultingRejection).toBe(true);
      expect(isRejectionMatch("consulting option pasand nahi").isConsultingRejection).toBe(false); // isPasandRejection should catch this
    });

    it('should detect interest rejections across scripts and dialects', () => {
      expect(isRejectionMatch("interest nahi").isInterestRejection).toBe(true);
      expect(isRejectionMatch("interest nahi hai").isInterestRejection).toBe(true);
      expect(isRejectionMatch("dilchaspi nahi hai").isInterestRejection).toBe(true);
      expect(isRejectionMatch("इंटरेस्ट नहीं").isInterestRejection).toBe(true);
      expect(isRejectionMatch("दिलचस्पी नही").isInterestRejection).toBe(true);
      expect(isRejectionMatch("ruchi nahi").isInterestRejection).toBe(true);
      expect(isRejectionMatch("रुचि नहीं").isInterestRejection).toBe(true);
    });

    it('should detect pasand rejections across scripts and dialects', () => {
      expect(isRejectionMatch("pasand nahi").isPasandRejection).toBe(true);
      expect(isRejectionMatch("pasand nhi").isPasandRejection).toBe(true);
      expect(isRejectionMatch("पसंद नहीं").isPasandRejection).toBe(true);
      expect(isRejectionMatch("पसंद नही").isPasandRejection).toBe(true);
    });
  });
});
