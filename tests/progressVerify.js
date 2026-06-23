import handler from '../api/pandit-ai.js';
import { humanize } from '../src/utils/humanizer.js';

// Mock request and response
const mockReq = (question, uid = 'test_user_streak_1') => ({
  method: 'POST',
  headers: {
    authorization: 'Bearer mock_token_for_validation'
  },
  body: {
    mode: 'chat',
    userData: {
      uid,
      dobDay: 31,
      dobMonth: 8,
      dobYear: 1999,
      tobHour: 12,
      tobMinute: 50,
      tobPeriod: 'PM',
      pob: 'Hamirpur Himachal Pradesh',
      question
    },
    history: []
  }
});

const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.jsonData = data;
    return res;
  };
  return res;
};

async function test() {
  console.log("=== RUNNING REQ VERIFICATION TESTS ===");
  
  // Set Bedrock key to empty to trigger offline fallback for testing
  process.env.BEDROCK_API_KEY = ""; 
  process.env.BEDROCK_BASE_URL = "";

  // Test non-astro question
  console.log("\n--- TEST Case 1: Non-Astrology Question ('Mera lucky number kya hai?') ---");
  const req1 = mockReq("Mera lucky number kya hai?");
  const res1 = mockRes();
  try {
    await handler(req1, res1);
    console.log("Status Code:", res1.statusCode);
    console.log("Response text:\n", res1.jsonData?.text);
  } catch (err) {
    console.error("Handler error:", err);
  }

  // Test astro question
  console.log("\n--- TEST Case 2: Astrology Question ('Job kb lgegi') ---");
  const req2 = mockReq("Job kb lgegi");
  const res2 = mockRes();
  try {
    await handler(req2, res2);
    console.log("Status Code:", res2.statusCode);
    console.log("Response text:\n", res2.jsonData?.text);
  } catch (err) {
    console.error("Handler error:", err);
  }

  // Test consecutive day login (double check progress database)
  console.log("\n--- TEST Case 3: Calling API 2nd time to verify Score & Streak ---");
  const req3 = mockReq("Job kb lgegi");
  const res3 = mockRes();
  try {
    await handler(req3, res3);
    console.log("Status Code:", res3.statusCode);
    console.log("Response text:\n", res3.jsonData?.text);
  } catch (err) {
    console.error("Handler error:", err);
  }
}

test().catch(console.error);
