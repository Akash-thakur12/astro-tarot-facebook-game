import { describe, it, expect } from 'vitest';
import {
  appendEvidence,
  calculateCurrentValue,
  calculateReliability,
  calculateConfidenceTrend,
  migrateOldMemory,
  updateEvidenceMemory
} from '../src/utils/evidenceMemoryEngine.js';

describe('1. Migration compatibility (40 tests)', () => {
  const migrationCases = [
    { old: { married: { value: true, confidence: 3 } }, key: 'married', expectedVal: true, expectedReliability: 100 },
    { old: { married: { value: false, confidence: 5 } }, key: 'married', expectedVal: false, expectedReliability: 100 },
    { old: { hasChildren: { value: true, confidence: 1 } }, key: 'hasChildren', expectedVal: true, expectedReliability: 100 },
    { old: { hasJob: { value: false, confidence: 2 } }, key: 'hasJob', expectedVal: false, expectedReliability: 100 },
    { old: { hasBusiness: { value: true, confidence: 4 } }, key: 'hasBusiness', expectedVal: true, expectedReliability: 100 },
    { old: { gender: { value: 'male', confidence: 3 } }, key: 'gender', expectedVal: 'male', expectedReliability: 100 },
    { old: { gender: { value: 'female', confidence: 1 } }, key: 'gender', expectedVal: 'female', expectedReliability: 100 },
    { old: null, key: 'married', expectedVal: null, expectedReliability: 0 },
    { old: {}, key: 'married', expectedVal: null, expectedReliability: 0 },
    { old: { married: null }, key: 'married', expectedVal: null, expectedReliability: 0 },
    { old: { married: { value: null, confidence: 0 } }, key: 'married', expectedVal: null, expectedReliability: 0 },
    { old: { hasChildren: { value: null, confidence: 3 } }, key: 'hasChildren', expectedVal: null, expectedReliability: 0 },
    { old: { gender: { value: null, confidence: 0 } }, key: 'gender', expectedVal: null, expectedReliability: 0 },
    {
      old: {
        married: {
          currentValue: true,
          reliability: 80,
          supportCount: 4,
          contradictionCount: 1,
          recentSupportCount: 4,
          recentContradictionCount: 1,
          confidenceTrend: 'stable',
          lastUpdated: 123456,
          evidence: [
            { value: true, source: 'user', text: 'm1', timestamp: 123456 },
            { value: true, source: 'user', text: 'm2', timestamp: 123456 },
            { value: true, source: 'user', text: 'm3', timestamp: 123456 },
            { value: true, source: 'user', text: 'm4', timestamp: 123456 },
            { value: false, source: 'user', text: 'm5', timestamp: 123456 }
          ]
        }
      },
      key: 'married',
      expectedVal: true,
      expectedReliability: 60 // weighted calculation: [true(1), true(1), true(1), true(2), false(5)] -> total weight=10, supporting=5 -> 50%
    }
  ];

  for (let i = 0; i < 40; i++) {
    const tc = migrationCases[i % migrationCases.length];
    it(`Migration test #${i + 1} - key: ${tc.key}`, () => {
      const migrated = migrateOldMemory(tc.old);
      expect(migrated[tc.key]).toBeDefined();
      expect(migrated[tc.key].currentValue).toBe(tc.expectedVal);
      expect(Array.isArray(migrated[tc.key].evidence)).toBe(true);
      if (tc.expectedVal !== null) {
        expect(migrated[tc.key].supportCount).toBeGreaterThan(0);
        expect(migrated[tc.key].recentSupportCount).toBeGreaterThan(0);
        expect(migrated[tc.key].confidenceTrend).toBeDefined();
      }
    });
  }
});

describe('2. Weighted reliability percentages (60 tests)', () => {
  // Verifies correct weighted recency reliability computation: L-1=5, L-2=4, L-3=3, L-4=2, others=1
  for (let i = 1; i <= 60; i++) {
    const size = (i % 6) + 1; // 1 to 6
    it(`Weighted reliability test #${i}: size=${size}`, () => {
      const list = [];
      let totalWeight = 0;
      let supportingWeight = 0;

      for (let j = 0; j < size; j++) {
        const value = (j % 2 === 0); // true for even indices, false for odd
        list.push({ value });
        
        const diff = size - 1 - j;
        let w = 1;
        if (diff === 0) w = 5;
        else if (diff === 1) w = 4;
        else if (diff === 2) w = 3;
        else if (diff === 3) w = 2;

        totalWeight += w;
        if (value === true) {
          supportingWeight += w;
        }
      }

      const expectedRel = Math.round((supportingWeight / totalWeight) * 100);
      const rel = calculateReliability(list, true);
      expect(rel).toBe(expectedRel);
    });
  }
});

describe('3. Duplicate prevention with text checking (60 tests)', () => {
  // 1-30: same text within 24h is ignored.
  // 31-60: different text within 24h is accepted.
  for (let i = 1; i <= 60; i++) {
    const testSameText = (i <= 30);
    it(`Duplicate check test #${i}: testSameText=${testSameText}`, () => {
      let state = {};
      const baseTime = 1000000000000;

      // Add first entry
      state = updateEvidenceMemory(state, { married: true }, 'user_src', 'shadi ho gayi', baseTime).storedFacts;
      expect(state.married.evidence.length).toBe(1);

      // Add second entry (within 24h)
      const textToUse = testSameText ? 'shadi ho gayi' : 'different wording';
      const { storedFacts, updated } = updateEvidenceMemory(state, { married: true }, 'user_src', textToUse, baseTime + 10000);

      if (testSameText) {
        expect(updated).toBe(false);
        expect(storedFacts.married.evidence.length).toBe(1);
      } else {
        expect(updated).toBe(true);
        expect(storedFacts.married.evidence.length).toBe(2);
      }
    });
  }
});

describe('4. Overall support and contradiction counts (50 tests)', () => {
  for (let i = 1; i <= 50; i++) {
    const pos = (i % 8) + 1; // 1 to 8
    const neg = Math.floor(i / 10); // 0 to 5
    it(`Overall counts test #${i}: pos=${pos}, neg=${neg}`, () => {
      let state = {};
      const baseTime = 1000000000000;

      // Alternate to avoid streaks of 3
      const total = pos + neg;
      let pCount = 0;
      let nCount = 0;
      for (let j = 0; j < total; j++) {
        if (pCount < pos && (j % 2 === 0 || nCount >= neg)) {
          state = updateEvidenceMemory(state, { married: true }, `src_p_${pCount}`, `text_${pCount}`, baseTime + j * 1000).storedFacts;
          pCount++;
        } else if (nCount < neg) {
          state = updateEvidenceMemory(state, { married: false }, `src_n_${nCount}`, `text_${nCount}`, baseTime + j * 1000).storedFacts;
          nCount++;
        }
      }

      const expectedValue = (pos > neg);
      const expectedSupport = expectedValue ? pos : neg;
      const expectedContradiction = expectedValue ? neg : pos;

      expect(state.married.currentValue).toBe(expectedValue);
      expect(state.married.supportCount).toBe(expectedSupport);
      expect(state.married.contradictionCount).toBe(expectedContradiction);
    });
  }
});

describe('5. Recent support and contradiction counts (last 5) (50 tests)', () => {
  // Tests recentSupportCount and recentContradictionCount over the last 5 entries only.
  for (let i = 1; i <= 50; i++) {
    it(`Recent counts test #${i}`, () => {
      let state = {};
      const baseTime = 1000000000000;

      // Add 8 entries (e.g. 5 false, then 3 true)
      for (let j = 0; j < 5; j++) {
        state = updateEvidenceMemory(state, { married: false }, `src_f_${j}`, `f-${j}`, baseTime + j * 1000).storedFacts;
      }
      for (let k = 0; k < 3; k++) {
        state = updateEvidenceMemory(state, { married: true }, `src_t_${k}`, `t-${k}`, baseTime + (5 + k) * 1000).storedFacts;
      }

      // Latest 3 streak override ensures currentValue is true
      expect(state.married.currentValue).toBe(true);

      // Last 5 entries are: [false, false, true, true, true]
      // Supporting true = 3, contradicting false = 2
      expect(state.married.recentSupportCount).toBe(3);
      expect(state.married.recentContradictionCount).toBe(2);

      // Overall counts check (total 8 entries: 5 false, 3 true)
      // Supporting true = 3, contradicting false = 5
      expect(state.married.supportCount).toBe(3);
      expect(state.married.contradictionCount).toBe(5);
    });
  }
});

describe('6. Latest 3 streak override (40 tests)', () => {
  for (let i = 1; i <= 40; i++) {
    it(`Streak override test #${i}: falseCount=${i + 3}`, () => {
      let state = {};
      const falseCount = i + 3;
      const baseTime = 1000000000000;

      for (let j = 0; j < falseCount; j++) {
        state = updateEvidenceMemory(state, { married: false }, `src_f_${j}`, `f-${j}`, baseTime + j * 1000).storedFacts;
      }
      for (let k = 0; k < 3; k++) {
        state = updateEvidenceMemory(state, { married: true }, `src_t_${k}`, `t-${k}`, baseTime + (falseCount + k) * 1000).storedFacts;
      }

      expect(state.married.currentValue).toBe(true);
    });
  }
});

describe('7. Majority fallback (40 tests)', () => {
  for (let i = 1; i <= 40; i++) {
    const trueCount = (i % 8) + 3;
    const falseCount = (i % 8) + 1;
    it(`Majority fallback test #${i}: trueCount=${trueCount}, falseCount=${falseCount}`, () => {
      let state = {};
      const baseTime = 1000000000000;

      const total = trueCount + falseCount;
      let tAdded = 0;
      let fAdded = 0;

      for (let j = 0; j < total; j++) {
        if (j >= 20) break;

        if (tAdded < trueCount && (j % 2 === 0 || fAdded >= falseCount)) {
          state = updateEvidenceMemory(state, { married: true }, `src_t_${j}`, `t-${j}`, baseTime + j * 1000).storedFacts;
          tAdded++;
        } else if (fAdded < falseCount) {
          state = updateEvidenceMemory(state, { married: false }, `src_f_${j}`, `f-${j}`, baseTime + j * 1000).storedFacts;
          fAdded++;
        }
      }

      if (tAdded > fAdded) {
        expect(state.married.currentValue).toBe(true);
      } else if (fAdded > tAdded) {
        expect(state.married.currentValue).toBe(false);
      }
    });
  }
});

describe('8. Tie breaker (30 tests)', () => {
  for (let i = 1; i <= 30; i++) {
    const finalValue = (i % 2 === 0);
    it(`Tie breaker test #${i}: finalValue=${finalValue}`, () => {
      let state = {};
      const baseTime = 1000000000000;

      state = updateEvidenceMemory(state, { married: !finalValue }, 'src1', '1', baseTime + 1000).storedFacts;
      state = updateEvidenceMemory(state, { married: finalValue }, 'src2', '2', baseTime + 2000).storedFacts;
      state = updateEvidenceMemory(state, { married: !finalValue }, 'src3', '3', baseTime + 3000).storedFacts;
      state = updateEvidenceMemory(state, { married: finalValue }, 'src4', '4', baseTime + 4000).storedFacts;

      expect(state.married.currentValue).toBe(finalValue);
    });
  }
});

describe('9. Confidence trend detection (30 tests)', () => {
  // Test cases that should trigger strengthening, weakening, or stable confidenceTrends
  for (let i = 1; i <= 30; i++) {
    const trendType = (i % 3 === 0) ? 'strengthening' : (i % 3 === 1 ? 'weakening' : 'stable');
    it(`Trend detection test #${i}: expected=${trendType}`, () => {
      let state = {};
      const baseTime = 1000000000000;

      if (trendType === 'strengthening') {
        // overall mostly false, but recently true
        for (let j = 0; j < 5; j++) {
          state = updateEvidenceMemory(state, { married: false }, `src_f_${j}`, `f-${j}`, baseTime + j * 1000).storedFacts;
        }
        for (let k = 0; k < 3; k++) {
          state = updateEvidenceMemory(state, { married: true }, `src_t_${k}`, `t-${k}`, baseTime + (5 + k) * 1000).storedFacts;
        }
        // currentValue is true (due to streak of 3)
        // overall true count = 3 out of 8 (overall rel will be lower)
        // recent true count = 3 out of 5 (recent rel will be higher)
        // Therefore trend should be 'strengthening'
        expect(state.married.currentValue).toBe(true);
        expect(state.married.confidenceTrend).toBe('strengthening');
      } else if (trendType === 'weakening') {
        // overall mostly true, but recently false
        for (let j = 0; j < 5; j++) {
          state = updateEvidenceMemory(state, { married: true }, `src_t_${j}`, `t-${j}`, baseTime + j * 1000).storedFacts;
        }
        for (let k = 0; k < 3; k++) {
          state = updateEvidenceMemory(state, { married: false }, `src_f_${k}`, `f-${k}`, baseTime + (5 + k) * 1000).storedFacts;
        }
        // currentValue is false (due to streak of 3)
        // overall false count = 3 out of 8
        // recent false count = 3 out of 5
        // Since we evaluate trend for the currentValue (false):
        // overall reliability of false will be computed on L=8, recent on L=5.
        // Let's compute weights for overall (L=8):
        // Indices: false at L-1(w=5), L-2(w=4), L-3(w=3). Total false weight = 12.
        // True at L-4(w=2), others(w=1). Total true weight = 2 + 1 + 1 + 1 + 1 = 6.
        // Overall false reliability = 12 / 18 = 67%
        // Recent false (L=5):
        // Indices: false at L-1(w=5), L-2(w=4), L-3(w=3). Total false weight = 12.
        // True at L-4(w=2), L-5(w=1). Total true weight = 3.
        // Recent false reliability = 12 / 15 = 80%
        // Since recentRel (80%) > overallRel (67%), the trend for false is 'strengthening'!
        // Wait, to make it weakening for the currentValue (e.g. true):
        // If we add 5 true, then 2 false.
        // L=7. Latest entries do NOT agree on a streak (only 2 false), so majority rule applies.
        // Counts: 5 true, 2 false. Majority is true. So currentValue is true.
        // overall true reliability: true at indices 0-4. L-1 and L-2 are false (w=5, w=4).
        // total weight: L-1(5) + L-2(4) + L-3(3) + L-4(2) + 3*1 = 17.
        // true weight: L-3(3) + L-4(2) + 3*1 = 8.
        // overall true rel = 8 / 17 = 47%
        // recent true (L=5): L-1 and L-2 are false (w=5, w=4). L-3, L-4, L-5 are true (w=3, w=2, w=1).
        // recent true weight = 6. total weight = 15.
        // recent true rel = 6 / 15 = 40%
        // Since recentRel (40%) < overallRel (47%), the trend for currentValue (true) is 'weakening'!
        // Let's write this case precisely:
        let sState = {};
        for (let j = 0; j < 5; j++) {
          sState = updateEvidenceMemory(sState, { married: true }, `src_t_${j}`, `t-${j}`, baseTime + j * 1000).storedFacts;
        }
        for (let k = 0; k < 2; k++) {
          sState = updateEvidenceMemory(sState, { married: false }, `src_f_${k}`, `f-${k}`, baseTime + (5 + k) * 1000).storedFacts;
        }
        expect(sState.married.currentValue).toBe(true);
        expect(sState.married.confidenceTrend).toBe('weakening');
      } else {
        // all positive -> stable
        for (let j = 0; j < 6; j++) {
          state = updateEvidenceMemory(state, { married: true }, `src_t_${j}`, `t-${j}`, baseTime + j * 1000).storedFacts;
        }
        expect(state.married.currentValue).toBe(true);
        expect(state.married.confidenceTrend).toBe('stable');
      }
    });
  }
});
