import OpenAI from 'openai';

let client = null;

function getClient() {
  const apiKey = process.env.BEDROCK_API_KEY;
  const baseURL = process.env.BEDROCK_BASE_URL;

  // Never use dummy_key or dummy.api. Only initialize if both env vars are present.
  if (!apiKey || !baseURL) {
    return null;
  }

  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL,
    });
  }

  return client;
}

/**
 * Generates an AI response from the Bedrock model fallback chain.
 * 
 * @param {string} prompt - The prompt to send to the models.
 * @returns {Promise<string>} The generated text.
 */
export async function generateAIResponse(prompt, options = {}) {
  const clientInstance = getClient();
  if (!clientInstance) {
    throw new Error('AI Service not configured: Missing BEDROCK_API_KEY or BEDROCK_BASE_URL');
  }

  const models = [
    'deepseek.v3.2',
    'google.gemma-3-4b-it',
    'qwen.qwen3-32b-v1:0'
  ];

  let lastError = null;

  for (const model of models) {
    try {
      console.log("Trying model:", model, "with options:", JSON.stringify(options));
      const bodyParams = {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      };
      if (options.jsonMode) {
        bodyParams.response_format = { type: 'json_object' };
      }
      const response = await clientInstance.chat.completions.create(
        bodyParams,
        {
          timeout: 5000, // 5 seconds timeout per request
        }
      );

      const content = response.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        console.log("Model succeeded:", model);
        return content.trim();
      }
      throw new Error('Model returned an empty content body');
    } catch (err) {
      console.error(`[AI Service] Model ${model} failed:`, err.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All models in the fallback chain failed');
}
