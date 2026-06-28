import OpenAIModule from 'openai';

// Defensive check to handle mocked environments in tests
const OpenAI = OpenAIModule.default || OpenAIModule;
const AzureOpenAIClass = OpenAIModule.AzureOpenAI || OpenAI;

let azureClient = null;
let bedrockClient = null;

function getAzureClient() {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

  if (!apiKey || !endpoint || !deployment) {
    return null;
  }

  if (!azureClient) {
    azureClient = new AzureOpenAIClass({
      apiKey,
      endpoint,
      deployment,
      apiVersion: '2024-02-15-preview',
    });
  }

  return azureClient;
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
 * Generates an AI response from Azure OpenAI (Primary) or Bedrock model fallback chain.
 * 
 * @param {string} prompt - The prompt to send to the models.
 * @returns {Promise<string>} The generated text.
 */
export async function generateAIResponse(prompt, options = {}) {
  // 1. Try Azure OpenAI first
  const azure = getAzureClient();
  if (azure) {
    try {
      console.log("Trying primary provider: Azure OpenAI...");
      const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'o4-mini';
      const bodyParams = {
        model: deploymentName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      };
      if (options.jsonMode) {
        bodyParams.response_format = { type: 'json_object' };
      }
      const response = await azure.chat.completions.create(
        bodyParams,
        {
          timeout: 5000,
        }
      );

      const content = response.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        console.log("Azure OpenAI succeeded.");
        return content.trim();
      }
      throw new Error('Azure OpenAI returned an empty response body');
    } catch (azureErr) {
      console.error("Azure OpenAI primary failed:", azureErr.message || azureErr);
    }
  }

  // 2. Fallback to Bedrock fallback chain
  const bedrock = getBedrockClient();
  if (!bedrock) {
    throw new Error('AI Service not configured: Missing both Azure OpenAI and Bedrock credentials');
  }

  const models = [
    'deepseek.v3.2',
    'google.gemma-3-4b-it',
    'qwen.qwen3-32b-v1:0'
  ];

  let lastError = null;

  for (const model of models) {
    try {
      console.log("Trying Bedrock fallback model:", model, "with options:", JSON.stringify(options));
      const bodyParams = {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      };
      if (options.jsonMode) {
        bodyParams.response_format = { type: 'json_object' };
      }
      const response = await bedrock.chat.completions.create(
        bodyParams,
        {
          timeout: 5000,
        }
      );

      const content = response.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        console.log("Bedrock model succeeded:", model);
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
