import OpenAI from 'openai';
import fs from 'fs';

if (fs.existsSync('.env.production.local')) {
  const content = fs.readFileSync('.env.production.local', 'utf8');
  content.split(/\r?\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length > 1) {
      const key = parts[0].trim();
      let val = parts.slice(1).join('=').trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
}

const BEDROCK_API_KEY = process.env.BEDROCK_API_KEY;
const BEDROCK_BASE_URL = process.env.BEDROCK_BASE_URL;

if (!BEDROCK_API_KEY || !BEDROCK_BASE_URL) {
  console.error('ERROR: BEDROCK_API_KEY or BEDROCK_BASE_URL not found in environment.');
  process.exit(1);
}

async function diagnose() {
  console.log('--- BEDROCK DIAGNOSIS ---');
  console.log(`API Key prefix: ${BEDROCK_API_KEY.substring(0, 8)}...`);
  console.log(`Base URL: ${BEDROCK_BASE_URL}`);

  const openaiClient = new OpenAI({
    apiKey: BEDROCK_API_KEY,
    baseURL: BEDROCK_BASE_URL,
  });

  const models = [
    "deepseek.v3.2",
    "google.gemma-3-4b-it",
    "mistral.voxtral-mini-3b-2507",
    "mistral.ministral-3-3b-instruct",
    "qwen.qwen3-32b-v1:0"
  ];

  for (const modelName of models) {
    console.log(`\nTesting model: ${modelName}...`);
    try {
      const response = await openaiClient.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'user', content: 'hi' }
        ],
        temperature: 0.7
      }, {
        timeout: 10000 // 10s timeout for test
      });

      console.log(`Success! Response:`, response.choices?.[0]?.message?.content);
    } catch (e) {
      console.error(`Failed: ${modelName}`);
      console.error(e);
    }
  }
}

diagnose();
