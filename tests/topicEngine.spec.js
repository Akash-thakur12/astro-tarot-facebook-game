import { describe, it, expect } from 'vitest';
import {
  generateTopicState,
  updateTopicProgress,
  detectTopic,
  isVagueMessage,
  isNonAstrologyQuestion,
  isFollowUpMessage,
  getTopicAndSubType,
  resolveMultiIntent,
  getTopicProgress
} from '../lib/topicEngine.js';

describe('Topic Engine Core Specification Tests', () => {

  // Scenario 1: Initial Query Layer 1 Selection
  it('Scenario 1: should select target layer 1 for an initial query with no history', () => {
    const topicState = generateTopicState(
      'job kab lagegi',
      null, // lastActiveTopic
      { career: 1 }, // topicProgress
      false, // isFollowUp
      null, // lastUserMsgContent
      [], // savedMysteries
      {} // revealedLayers
    );
    expect(topicState.activeTopic).toBe('career');
    expect(topicState.targetLayer).toBe(1);
    expect(topicState.shouldAdvance).toBe(false);
  });

  // Scenario 2: Follow-up Advancing to Layer 2
  it('Scenario 2: should advance target layer to 2 for follow-up query', () => {
    const topicState = generateTopicState(
      'hnn btao',
      'career', // lastActiveTopic
      { career: 1 },
      true, // isFollowUp
      'job kab lagegi', // lastUserMsgContent
      [],
      {}
    );
    expect(topicState.activeTopic).toBe('career');
    expect(topicState.targetLayer).toBe(2);
    expect(topicState.shouldAdvance).toBe(true);
  });

  // Scenario 3: Same Question Same Topic Continuation
  it('Scenario 3: should advance target layer for same question continuation', () => {
    const topicState = generateTopicState(
      'job kab milegi',
      'career',
      { career: 1 },
      false,
      'job kab lagegi', // highly similar question (>70% similarity)
      [],
      {}
    );
    expect(topicState.activeTopic).toBe('career');
    expect(topicState.targetLayer).toBe(2);
    expect(topicState.shouldAdvance).toBe(true);
  });

  // Scenario 4: Semantic Topic Switch resets layer to 1
  it('Scenario 4: should reset layer to 1 when user semantically switches topic', () => {
    const topicState = generateTopicState(
      'shadi kab hogi',
      'career', // switched from career
      { career: 2, marriage: 1 },
      false,
      'job kab lagegi',
      [],
      {}
    );
    expect(topicState.activeTopic).toBe('marriage');
    expect(topicState.targetLayer).toBe(1);
    expect(topicState.shouldAdvance).toBe(false);
  });

  // Scenario 5: Layer Lock Check
  it('Scenario 5: should lock target layer at 5 when max layer is reached', () => {
    const topicState = generateTopicState(
      'hnn btao',
      'career',
      { career: 5 },
      true,
      'job kab lagegi',
      [],
      {}
    );
    expect(topicState.activeTopic).toBe('career');
    expect(topicState.targetLayer).toBe(5);
    expect(topicState.shouldAdvance).toBe(true);
  });

  // Scenario 6: Multi-Intent Routing (Non-overlapping)
  it('Scenario 6: should classify primary and secondary topics for multi-intent query', () => {
    const multi = resolveMultiIntent('career kaisa rahega aur health issues bhi hain');
    expect(multi.activeTopic).toBe('health'); // health has strong pattern score +20, career is keyword (+5)
    expect(multi.secondaryTopic).toBe('career');
  });

  // Scenario 7: Multi-Intent Routing (Overlapping with Protected Intents)
  it('Scenario 7: should ensure protected intents do not overflow', () => {
    const classification = getTopicAndSubType('shadi job love bacha videsh health dhan');
    // shadi (marriage), job (career), love (love), bacha (children) are protected
    // videsh (foreign), health (health), dhan (money)
    expect(classification.secondary).toContain('love');
    expect(classification.secondary).toContain('career');
    expect(classification.secondary).toContain('children');
    expect(classification.overflow).toContain('foreign');
    expect(classification.overflow).toContain('health');
    expect(classification.overflow).not.toContain('marriage');
    expect(classification.overflow).not.toContain('love');
  });

  // Scenario 8: Vague Message Detection
  it('Scenario 8: should correctly identify vague messages', () => {
    expect(isVagueMessage('meri bat suno')).toBe(true);
    expect(isVagueMessage('help me')).toBe(true);
    expect(isVagueMessage('government job')).toBe(false);
  });

  // Scenario 9: Non-Astrology Question Detection
  it('Scenario 9: should identify programming/tech questions as non-astrology', () => {
    const classification = getTopicAndSubType('how to write a binary search tree in javascript');
    expect(classification.topic).toBe('non-astrology');
    expect(classification.tier).toBe(4);
  });

  // Scenario 10: Profile Acknowledgement/Direct Recall Detection
  it('Scenario 10: should identify profile acknowledgement and memory recall queries', () => {
    const ackClassification = getTopicAndSubType('apko pata hai meri shadi ho chuki hai na');
    expect(ackClassification.topic).toBe('profile_acknowledgement');
    expect(ackClassification.tier).toBe(5);

    const recallClassification = getTopicAndSubType('kya aapko yaad hai jo maine bataya');
    expect(recallClassification.topic).toBe('memory_recall');
    expect(recallClassification.tier).toBe(6);
  });

  // Additional check: getTopicProgress
  it('should fallback to default topic progress if database contains nothing', () => {
    const progress = getTopicProgress(null);
    expect(progress.marriage).toBe(1);
    expect(progress.daily).toBe(1);
  });

  // Additional check: updateTopicProgress
  it('should update topic progress and layers correctly', () => {
    const state = { activeTopic: 'career', targetLayer: 2, shouldAdvance: true };
    const progress = { career: 1 };
    const revealed = {};
    const result = updateTopicProgress('user123', state, progress, revealed);
    expect(result.topicProgress.career).toBe(2);
    expect(result.revealedLayers.career).toContain(2);
  });
});
