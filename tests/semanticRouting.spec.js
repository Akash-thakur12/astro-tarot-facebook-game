import { describe, it, expect } from 'vitest';
import { getTopicAndSubType, detectSemanticIntent, detectMultiSemanticIntent } from '../api/pandit-ai.js';

describe('Pandit AI Semantic Intent Detection Tests', () => {
  describe('Helper detectSemanticIntent()', () => {
    it('should classify "Mai life me kya karun?" to career', () => {
      const res = detectSemanticIntent('Mai life me kya karun?');
      expect(res).toBeDefined();
      expect(res.topic).toBe('career');
      expect(res.tier).toBe(1);
    });

    it('should classify "Pati mujhe ignore karta hai" to marriage', () => {
      const res = detectSemanticIntent('Pati mujhe ignore karta hai');
      expect(res).toBeDefined();
      expect(res.topic).toBe('marriage');
      expect(res.tier).toBe(1);
    });

    it('should classify "Sab kuch ruk sa gaya hai" to future', () => {
      const res = detectSemanticIntent('Sab kuch ruk sa gaya hai');
      expect(res).toBeDefined();
      expect(res.topic).toBe('future');
      expect(res.tier).toBe(2);
    });

    it('should classify "Mera rishta tootne wala lagta hai" to marriage', () => {
      const res = detectSemanticIntent('Mera rishta tootne wala lagta hai');
      expect(res).toBeDefined();
      expect(res.topic).toBe('marriage');
      expect(res.tier).toBe(1);
    });

    it('should classify "Paise aate hain par tikte nahi" to money', () => {
      const res = detectSemanticIntent('Paise aate hain par tikte nahi');
      expect(res).toBeDefined();
      expect(res.topic).toBe('money');
      expect(res.tier).toBe(2);
    });

    it('should classify "Mann bahut pareshan rehta hai" to health', () => {
      const res = detectSemanticIntent('Mann bahut pareshan rehta hai');
      expect(res).toBeDefined();
      expect(res.topic).toBe('health');
      expect(res.tier).toBe(2);
    });
  });

  describe('Helper detectMultiSemanticIntent()', () => {
    it('should identify marriage as primary and money as secondary for multi-intent query', () => {
      const res = detectMultiSemanticIntent('Pati ignore karta hai aur paise ki bhi problem hai');
      expect(res.primary).toBeDefined();
      expect(res.primary.topic).toBe('marriage');
      expect(res.secondary).toBeDefined();
      expect(res.secondary.topic).toBe('money');
      expect(res.scores.marriage).toBeGreaterThanOrEqual(20);
      expect(res.scores.money).toBeGreaterThanOrEqual(15);
    });

    it('should return null for secondary if only one clear intent exists', () => {
      const res = detectMultiSemanticIntent('shadi kab hogi');
      expect(res.primary).toBeDefined();
      expect(res.primary.topic).toBe('marriage');
      expect(res.secondary).toBeNull();
    });
  });

  describe('Integration with getTopicAndSubType()', () => {
    it('should correctly classify semantic queries with debugging log outputs', () => {
      const res = getTopicAndSubType('Pati mujhe ignore karta hai');
      expect(res).toEqual({ tier: 1, topic: 'marriage' });
    });

    it('should correctly classify non-astrology query first before semantic intent', () => {
      const res = getTopicAndSubType('how to write javascript quicksort code?');
      expect(res).toEqual({ tier: 4, topic: 'non-astrology' });
    });
  });
});
