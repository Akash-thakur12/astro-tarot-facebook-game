import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('ERROR: GEMINI_API_KEY not found in environment.');
  process.exit(1);
}

async function diagnose() {
  console.log('--- GEMINI DIAGNOSIS ---');
  console.log(`API Key prefix: ${API_KEY.substring(0, 8)}...`);

  try {
    // 1. List Models using REST API (gives more metadata)
    console.log('\n1. Fetching models via REST...');
    const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const listData = await listResponse.json();
    
    if (listData.error) {
      console.error('REST Error:', listData.error);
    } else {
      const models = listData.models || [];
      console.log(`Found ${models.length} models.`);
      const names = models.map(m => m.name.replace('models/', ''));
      console.log('Available Models:', names.join(', '));
      
      // Look for 1.5-flash and 2.0-flash
      const f15 = models.find(m => m.name.includes('gemini-1.5-flash'));
      const f20 = models.find(m => m.name.includes('gemini-2.0-flash'));
      
      console.log('\nMetadata for 1.5-flash:', f15 ? JSON.stringify(f15) : 'NOT FOUND');
      console.log('Metadata for 2.0-flash:', f20 ? JSON.stringify(f20) : 'NOT FOUND');
    }

    // 2. Test 2.0-flash with SDK
    console.log('\n2. Testing gemini-2.0-flash via SDK...');
    const genAI = new GoogleGenerativeAI(API_KEY);
    const m20 = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    try {
      const res = await m20.generateContent('hi');
      console.log('2.0-flash Success:', res.response.text());
    } catch (e) {
      console.error('2.0-flash Error Status:', e.status || 'Unknown');
      console.error('2.0-flash Error Message:', e.message);
      if (e.response) {
        console.error('2.0-flash Response Data:', JSON.stringify(e.response));
      }
    }

    // 3. Test 1.5-flash with SDK
    console.log('\n3. Testing gemini-1.5-flash via SDK...');
    const m15 = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    try {
      const res = await m15.generateContent('hi');
      console.log('1.5-flash Success:', res.response.text());
    } catch (e) {
      console.error('1.5-flash Error Status:', e.status || 'Unknown');
      console.error('1.5-flash Error Message:', e.message);
    }

  } catch (err) {
    console.error('Global Error:', err);
  }
}

diagnose();
