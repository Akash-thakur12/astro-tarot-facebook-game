import { generateTopicState, updateTopicProgress } from '../api/services/topicEngine.js';

const tests = [
  { name: "1. Marriage query", text: "meri shadi kab hogi?", lastTopic: null, progress: {}, followUp: false, lastMsg: "", revealed: {} },
  { name: "2. Career query", text: "job kab lagegi?", lastTopic: "marriage", progress: {marriage: 2}, followUp: false, lastMsg: "meri shadi kab hogi?", revealed: {marriage: [1,2]} },
  { name: "3. Marriage + Career query", text: "meri shadi aur career dono", lastTopic: null, progress: {}, followUp: false, lastMsg: "", revealed: {} },
  { name: "4. Follow-up kab", text: "kab?", lastTopic: "career", progress: {career: 1}, followUp: true, lastMsg: "job kab lagegi", revealed: {career: [1]} },
  { name: "5. Follow-up aur", text: "aur batao", lastTopic: "love", progress: {love: 2}, followUp: true, lastMsg: "meri love life", revealed: {love: [1,2]} },
  { name: "6. Follow-up fir", text: "fir kya hoga", lastTopic: "money", progress: {money: 3}, followUp: true, lastMsg: "paisa aayega?", revealed: {money: [1,2,3]} },
  { name: "7. Layer progression", text: "aur detail batao", lastTopic: "marriage", progress: {marriage: 1}, followUp: true, lastMsg: "shadi kab hogi", revealed: {marriage: [1]} },
  { name: "8. Layer lock", text: "aur detail batao", lastTopic: "marriage", progress: {marriage: 1}, followUp: true, lastMsg: "shadi kab hogi", revealed: {marriage: [1, 2]} },
  { name: "9. Topic switch", text: "ab health batao", lastTopic: "career", progress: {career: 2}, followUp: false, lastMsg: "job lag gayi", revealed: {career: [1,2]} },
];

for (const t of tests) {
  console.log(`\n--- Test: ${t.name} ---`);
  console.log(`Input: "${t.text}" (Last: ${t.lastTopic})`);
  const state = generateTopicState(t.text, t.lastTopic, t.progress, t.followUp, t.lastMsg, [], t.revealed);
  console.log(`State: ${JSON.stringify(state, null, 2)}`);
  const updated = updateTopicProgress('test_uid', state, t.progress, t.revealed);
  console.log(`Updated Progress: ${JSON.stringify(updated.topicProgress)}`);
  console.log(`Revealed Layers: ${JSON.stringify(updated.revealedLayers)}`);
}
