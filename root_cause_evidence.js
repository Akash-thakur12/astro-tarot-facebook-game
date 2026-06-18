
const AI_BASE_URL = process.env.AI_BASE_URL || "";
const AI_MODEL = process.env.AI_MODEL || "";
const AI_TOKEN = process.env.AI_TOKEN || "";

console.log('AI_BASE_URL.length:', AI_BASE_URL.length);
console.log('JSON.stringify(AI_BASE_URL):', JSON.stringify(AI_BASE_URL));

console.log('AI_MODEL.length:', AI_MODEL.length);
console.log('JSON.stringify(AI_MODEL):', JSON.stringify(AI_MODEL));

console.log('AI_TOKEN.length:', AI_TOKEN.length);

const maskedToken = AI_TOKEN ? AI_TOKEN.substring(0, 4) + "****" : "MISSING";
const url = `${AI_BASE_URL}/${AI_MODEL}/message/hi?token=${maskedToken}`;
console.log('Constructed URL:', url);
console.log('url.length:', url.length);

async function performTests() {
  if (!AI_BASE_URL || !AI_MODEL || !AI_TOKEN) {
    console.log('\n--- LIVE TESTS SKIPPED: Missing Environment Variables ---');
    return;
  }
  
  const testUrl1 = `${AI_BASE_URL}/${AI_MODEL}/message/hi?token=${AI_TOKEN}`;
  const testUrl2 = `https://claude-gpt-by-noneusr.onrender.com/api/ai/claude-opus-4-8/message/hi?token=${AI_TOKEN}`;
  
  try {
    const res1 = await fetch(testUrl1);
    console.log('Test 1 (Generated URL) Status:', res1.status);
  } catch (e) {
    console.log('Test 1 Error:', e.message);
  }
  
  try {
    const res2 = await fetch(testUrl2);
    console.log('Test 2 (Expected URL) Status:', res2.status);
  } catch (e) {
    console.log('Test 2 Error:', e.message);
  }
}

performTests();
