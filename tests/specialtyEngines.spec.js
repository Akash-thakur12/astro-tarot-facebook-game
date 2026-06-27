import { describe, it, expect } from 'vitest';
import {
  calculateLoveEngine,
  calculateMoneyEngine,
  calculateDailyTransitEngine,
  calculateHealthEngine,
  calculateForeignTravelEngine,
  calculateChildrenEngine,
  getDreamMeaning,
  getSpiritualGuidance
} from '../src/utils/specialtyEngines.js';

describe('Specialty Engines (Phases 6 - 13) Tests', () => {

  const mockAstroData = {
    lagna: 'Mesh',
    mahadasha: 'Jupiter',
    antardasha: 'Venus',
    antardashaEnd: '11/2026',
    houses: {
      Venus: 7,
      Moon: 5,
      Jupiter: 11,
      Rahu: 9,
      Saturn: 12,
      Mars: 8,
      Sun: 10
    }
  };

  it('should calculate Love Engine parameters', () => {
    const res = calculateLoveEngine(mockAstroData);
    expect(res).toBeDefined();
    expect(res.loveScore).toBeGreaterThanOrEqual(10);
    expect(res.loveScore).toBeLessThanOrEqual(98);
    expect(res.relationshipStrength).toBeDefined();
    expect(res.reunionPotential).toBeDefined();
    expect(res.soulmatePotential).toBeDefined();
    expect(res.loveWindows).toContain("November 2026 ke beech");
  });

  it('should calculate Money Engine parameters', () => {
    const res = calculateMoneyEngine(mockAstroData);
    expect(res).toBeDefined();
    expect(res.wealthScore).toBeGreaterThanOrEqual(10);
    expect(res.wealthScore).toBeLessThanOrEqual(99);
    expect(res.incomePotential).toBeDefined();
    expect(res.savingsPotential).toBeDefined();
    expect(res.wealthWindows).toContain("November 2026 ke beech");
  });

  it('should calculate Daily Transit Engine parameters', () => {
    const res = calculateDailyTransitEngine(mockAstroData, "Saturday");
    expect(res).toBeDefined();
    expect(res.todayScore).toBeGreaterThanOrEqual(0);
    expect(res.todayScore).toBeLessThanOrEqual(100);
    expect(res.mood).toBeDefined();
    expect(res.work).toBeDefined();
    expect(res.relationships).toBeDefined();
    expect(res.caution).toBeDefined();
  });

  it('should calculate Health Engine parameters conservatively', () => {
    const res = calculateHealthEngine(mockAstroData);
    expect(res).toBeDefined();
    expect(res.vitalityScore).toBeGreaterThanOrEqual(50);
    expect(res.vitalityScore).toBeLessThanOrEqual(90);
    expect(res.stressLevel).toBeDefined();
    expect(res.recoveryPotential).toBeDefined();
    expect(res.healthGuidance).toBeDefined();
  });

  it('should calculate Foreign Travel Engine parameters', () => {
    const res = calculateForeignTravelEngine(mockAstroData);
    expect(res).toBeDefined();
    expect(res.foreignTravelPotential).toBeDefined();
    expect(res.settlementPotential).toBeDefined();
    expect(res.travelWindows).toContain("November 2026 ke beech");
  });

  it('should calculate Children Engine parameters', () => {
    const res = calculateChildrenEngine(mockAstroData);
    expect(res).toBeDefined();
    expect(res.childrenPotential).toBeDefined();
    expect(res.familyGrowth).toBeDefined();
    expect(res.childWindows).toContain("November 2026 ke beech");
  });

  it('should interpret dream meanings', () => {
    const snake = getDreamMeaning("saanp");
    expect(snake.symbol).toBe("saanp (snake)");
    expect(snake.meaning).toBe("Badlav aur roopantaran (Transformation)");

    const temple = getDreamMeaning("mandir");
    expect(temple.symbol).toBe("mandir (temple)");
    expect(temple.meaning).toBe("Aadhyatmikta aur shanti (Spirituality)");

    const defaultDream = getDreamMeaning("unknown dream");
    expect(defaultDream.meaning).toBe("Avachetan man ke vichar");
  });

  it('should provide spiritual guidance without predictions', () => {
    const nazar = getSpiritualGuidance("Nazar lag gayi hai", "Mesh");
    expect(nazar.remedyType).toBe("nazar");
    expect(nazar.mantra).toBe("Om Hanumate Namah ka jaap karein.");

    const bhoot = getSpiritualGuidance("Bhoot pret ka saya", "Mesh");
    expect(bhoot.remedyType).toBe("bhoot");
    expect(bhoot.pooja).toBe("Lord Shiva ki pooja karein.");

    const isht = getSpiritualGuidance("Isht dev kaun hain?", "Mithun");
    expect(isht.ishtDev).toBe("Ganesh ji");
  });
});
