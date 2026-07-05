import OpenAI from 'openai';

let grokClient = null;
let bedrockClient = null;

function getGrokClient() {
  const apiKey = process.env.GROK_API_KEY;
  const baseURL = process.env.GROK_BASE_URL;

  if (!apiKey || !baseURL) {
    return null;
  }

  if (!grokClient) {
    grokClient = new OpenAI({
      apiKey,
      baseURL,
    });
  }

  return grokClient;
}

function getBedrockClient() {
  const apiKey = process.env.BEDROCK_API_KEY;
  const baseURL = process.env.BEDROCK_BASE_URL;

  if (!apiKey || !baseURL) {
    return null;
  }

  if (!bedrockClient) {
    bedrockClient = new OpenAI({
      apiKey,
      baseURL,
    });
  }

  return bedrockClient;
}

/**
 * Generates an AI response from Grok (Primary) or Qwen fallback chain.
 * 
 * @param {string} prompt - The prompt to send to the models.
 * @returns {Promise<string>} The generated text.
 */
export async function generateAIResponse(prompt, options = {}) {
  const grok = getGrokClient();
  const bedrock = getBedrockClient();

  if (!grok && !bedrock) {
    throw new Error('AI Service not configured: Missing both Grok and Bedrock credentials');
  }

  // 1. Try Grok first
  if (grok) {
    try {
      console.log("Selected model: xai.grok-4.3");
      console.log("Trying Grok model: xai.grok-4.3 with options:", JSON.stringify(options));
      const bodyParams = {
        model: 'xai.grok-4.3',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      };
      if (options.jsonMode) {
        bodyParams.response_format = { type: 'json_object' };
      }

      const startTime = Date.now();
      const response = await grok.chat.completions.create(
        bodyParams,
        {
          timeout: 5000,
        }
      );
      const latency = Date.now() - startTime;
      console.log(`Response latency for xai.grok-4.3: ${latency}ms`);

      const content = response.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        console.log("Grok model succeeded: xai.grok-4.3");
        return content.trim();
      }
      throw new Error('Grok returned an empty content body');
    } catch (err) {
      console.error("Provider failure for model xai.grok-4.3:", err.message || err);
    }
  }

  // 2. Fallback to Qwen on AWS Bedrock
  if (!bedrock) {
    throw new Error('AI Service not configured: Missing Bedrock credentials for fallback');
  }

  try {
    console.log("Selected model: qwen.qwen3-32b");
    console.log("Fallback activation: trying model qwen.qwen3-32b");
    console.log("Trying Bedrock model: qwen.qwen3-32b with options:", JSON.stringify(options));
    const bodyParams = {
      model: 'qwen.qwen3-32b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    };
    if (options.jsonMode) {
      bodyParams.response_format = { type: 'json_object' };
    }

    const startTime = Date.now();
    const response = await bedrock.chat.completions.create(
      bodyParams,
      {
        timeout: 5000,
      }
    );
    const latency = Date.now() - startTime;
    console.log(`Response latency for qwen.qwen3-32b: ${latency}ms`);

    const content = response.choices?.[0]?.message?.content;
    if (content && content.trim()) {
      console.log("Bedrock model succeeded: qwen.qwen3-32b");
      return content.trim();
    }
    throw new Error('Model returned an empty content body');
  } catch (err) {
    console.error("Provider failure for model qwen.qwen3-32b:", err.message || err);
    throw err;
  }
}


