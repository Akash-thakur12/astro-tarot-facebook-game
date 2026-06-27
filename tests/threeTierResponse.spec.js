import { describe, it, expect } from 'vitest';
import { getTopicAndSubType, calculateTier1Data, convertScore, convertDateWindow } from '../api/pandit-ai.js';

describe('3-Tier Response Strategy Tests', () => {

  describe('Topic and Tier Classifier', () => {
    it('should classify Career queries into Tier 1', () => {
      const q1 = getTopicAndSubType('Naukri kab lagegi?');
      expect(q1).toEqual({ tier: 1, topic: 'career' });

      const q2 = getTopicAndSubType('I want a job promotion');
      expect(q2).toEqual({ tier: 1, topic: 'career' });

      const q3 = getTopicAndSubType('Mere business me loss kyu ho raha hai?');
      expect(q3).toEqual({ tier: 1, topic: 'career' });
    });

    it('should classify Marriage queries into Tier 1', () => {
      const q1 = getTopicAndSubType('Meri shadi kab hogi?');
      expect(q1).toEqual({ tier: 1, topic: 'marriage' });

      const q2 = getTopicAndSubType('Rishta kab aayega?');
      expect(q2).toEqual({ tier: 1, topic: 'marriage' });
    });

    it('should classify Love queries into Tier 2', () => {
      const q1 = getTopicAndSubType('Will my ex come back?');
      expect(q1).toEqual({ tier: 2, topic: 'love' });

      const q2 = getTopicAndSubType('Mere partner mujhse pyaar karte hain?');
      expect(q2).toEqual({ tier: 2, topic: 'love' });
    });

    it('should classify Money queries into Tier 2', () => {
      const q1 = getTopicAndSubType('Mujhe paisa kab milega?');
      expect(q1).toEqual({ tier: 2, topic: 'money' });

      const q2 = getTopicAndSubType('Karz se mukti kaise milegi?');
      expect(q2).toEqual({ tier: 2, topic: 'money' });
    });

    it('should classify Nazar queries into Tier 3', () => {
      const q1 = getTopicAndSubType('Nazar dosh kaise khatam karein?');
      expect(q1).toEqual({ tier: 3, topic: 'nazar' });

      const q2 = getTopicAndSubType('Mujhe bhoot lagta hai');
      expect(q2).toEqual({ tier: 3, topic: 'nazar' });
    });

    it('should classify Spiritual queries into Tier 3', () => {
      const q1 = getTopicAndSubType('Kon sa mantra padhein?');
      expect(q1).toEqual({ tier: 3, topic: 'spiritual' });

      const q2 = getTopicAndSubType('Gemstone kon sa pehnein?');
      expect(q2).toEqual({ tier: 3, topic: 'spiritual' });
    });
  });

  describe('Calculation and Conversion helpers', () => {
    it('should convert score correctly', () => {
      expect(convertScore(95)).toBe("Bahut mazboot yog");
      expect(convertScore(80)).toBe("Kaafi achhe yog");
      expect(convertScore(74)).toBe("Madhyam se achhe yog");
      expect(convertScore(60)).toBe("Madhyam se achhe yog");
      expect(convertScore(55)).toBe("Mehnat aur sanyam ki avashyakta");
    });

    it('should convert dates correctly', () => {
      expect(convertDateWindow('2026-11')).toBe('November 2026 ke beech');
      expect(convertDateWindow('2027-02')).toBe('February 2027 ke beech');
    });

    it('should calculate Tier 1 Data correctly from astroData', () => {
      const mockAstro = {
        lagna: 'Kanya',
        mahadasha: 'Jupiter',
        antardasha: 'Mars',
        antardashaEnd: '12/2026',
        houses: { Sun: 10, Jupiter: 4, Venus: 9 }
      };

      const careerData = calculateTier1Data('career', mockAstro);
      expect(careerData).toBeDefined();
      expect(careerData.score).toBeGreaterThan(0);
      expect(careerData.date).toBe('2026-12');
    });
  });
});
