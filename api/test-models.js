import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize with a placeholder key for local testing. We will require the user to run this or we'll run it with the env var if available locally.
// However, I don't have the user's GEMINI_API_KEY. I need to ask them to run it, or write a serverless function they can hit.

// To make it easy, I will create a temporary Vercel serverless function so the user can just hit `/api/test-models` in their browser.

export default async function handler(req, res) {
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured.' });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();

    if (!data.models) {
       return res.status(500).json({ error: 'Failed to fetch models', raw: data });
    }

    const availableModels = data.models.map(m => m.name);
    
    // Attempt a quick test with newer models
    let testResult = "Not tested";
    let selectedModel = "None"; 

    const genAI = new GoogleGenerativeAI(API_KEY);
    
    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash"
    ];
    
    for (const modelName of candidateModels) {
      if (availableModels.includes(`models/${modelName}`)) {
         try {
           const model = genAI.getGenerativeModel({ model: modelName });
           const result = await model.generateContent("Hello");
           testResult = `Success with ${modelName}: ${result.response.text()}`;
           selectedModel = modelName;
           break;
         } catch (e) {
           console.log(`Failed test with ${modelName}:`, e.message);
         }
      }
    }

    return res.status(200).json({
      availableModels,
      selectedModel,
      testResult
    });

  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
