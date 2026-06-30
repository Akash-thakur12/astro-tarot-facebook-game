import { describe, it, expect } from 'vitest';
import { getTopicAndSubType, detectMultiIntent, extractGreeting, detectGreetingIntent } from '../api/pandit-ai.js';

describe('Pandit AI Advanced Multi-Intent Detection Tests', () => {
  describe('Helper detectGreetingIntent()', () => {
    const greetingOnlyCases = [
      'hi',
      'hello',
      'namaste',
      'jai shiv shankar',
      'har har mahadev',
      'jai mata di',
      'radhe krishna',
      'sat sri akal',
      'assalamualaikum',
      'good morning'
    ];

    greetingOnlyCases.forEach(input => {
      it(`should detect greeting-only: "${input}"`, () => {
        const res = detectGreetingIntent(input);
        expect(res.greetingDetected).toBe(true);
        expect(res.confidence).toBe(100);
        expect(res.greetingPart.toLowerCase()).toBe(input.toLowerCase());
        expect(res.remainingQuestion).toBe('');
      });
    });

    it('should extract and strip "jai shiv shankar meri shadi kab hogi"', () => {
      const res = detectGreetingIntent('jai shiv shankar meri shadi kab hogi');
      expect(res).toEqual({
        greetingDetected: true,
        confidence: 80,
        greetingPart: 'jai shiv shankar',
        remainingQuestion: 'meri shadi kab hogi'
      });
    });

    it('should extract and strip "har har mahadev meri job kab lagegi"', () => {
      const res = detectGreetingIntent('har har mahadev meri job kab lagegi');
      expect(res).toEqual({
        greetingDetected: true,
        confidence: 80,
        greetingPart: 'har har mahadev',
        remainingQuestion: 'meri job kab lagegi'
      });
    });

    it('should extract and strip "jai mata di mera business chalega kya"', () => {
      const res = detectGreetingIntent('jai mata di mera business chalega kya');
      expect(res).toEqual({
        greetingDetected: true,
        confidence: 80,
        greetingPart: 'jai mata di',
        remainingQuestion: 'mera business chalega kya'
      });
    });

    it('should extract and strip "radhe krishna pati wapas aayega kya"', () => {
      const res = detectGreetingIntent('radhe krishna pati wapas aayega kya');
      expect(res).toEqual({
        greetingDetected: true,
        confidence: 80,
        greetingPart: 'radhe krishna',
        remainingQuestion: 'pati wapas aayega kya'
      });
    });
  });

  describe('Helper extractGreeting() compatibility', () => {
    it('should extract greeting correctly for single word "hi"', () => {
      const res = extractGreeting('hi');
      expect(res).toEqual({
        greetingDetected: true,
        greeting: 'hi',
        remainingQuestion: ''
      });
    });

    it('should extract and strip greeting token for "hi meri shadi kab hogi"', () => {
      const res = extractGreeting('hi meri shadi kab hogi');
      expect(res).toEqual({
        greetingDetected: true,
        greeting: 'hi',
        remainingQuestion: 'meri shadi kab hogi'
      });
    });
  });

  describe('Helper detectMultiIntent()', () => {
    it('should classify "Pati ignore karta hai aur paise ki problem hai" correctly', () => {
      const res = detectMultiIntent('Pati ignore karta hai aur paise ki problem hai');
      expect(res.primary).toBe('marriage');
      expect(res.secondary).toContain('money');
    });

    it('should classify "Job nahi tikti aur karz badhta ja raha hai" correctly', () => {
      const res = detectMultiIntent('Job nahi tikti aur karz badhta ja raha hai');
      expect(res.primary).toBe('career');
      expect(res.secondary).toContain('money');
    });

    it('should classify "Shadi kab hogi aur foreign jane ke yog" correctly', () => {
      const res = detectMultiIntent('Shadi kab hogi aur foreign jane ke yog');
      expect(res.primary).toBe('marriage');
      expect(res.secondary).toContain('foreign');
    });

    it('should classify "Mann pareshan hai aur relationship toot raha hai" correctly', () => {
      const res = detectMultiIntent('Mann pareshan hai aur relationship toot raha hai');
      expect(res.primary).toBe('love');
      expect(res.secondary).toContain('health');
    });
  });

  describe('Integration with getTopicAndSubType()', () => {
    it('should return primary intent and trigger debugging output logs', () => {
      const res = getTopicAndSubType('Pati ignore karta hai aur paise ki problem hai');
      expect(res).toEqual({ tier: 1, topic: 'marriage' });
    });
  });
});
