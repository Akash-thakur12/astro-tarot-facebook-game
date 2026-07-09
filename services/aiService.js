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

function withTimeout(promise, ms, timeoutErrorMsg) {
  let id;
  const timeoutPromise = new Promise((_, reject) => {
    id = setTimeout(() => reject(new Error(timeoutErrorMsg)), ms);
  });
  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(() => {
    clearTimeout(id);
  });
}

/**
 * Generates an AI response from Grok (Primary) or Qwen fallback chain.
 * 
 * @param {string} prompt - The prompt to send to the models.
 * @returns {Promise<string>} The generated text.
 */
export async function generateAIResponse(prompt, options = {}) {
  const totalStartTime = Date.now();
  const grok = getGrokClient();
  const bedrock = getBedrockClient();

  if (!grok && !bedrock) {
    const totalTime = Date.now() - totalStartTime;
    console.log(`TOTAL_AI_TIME: ${totalTime}ms`);
    throw new Error('AI Service not configured: Missing both Grok and Bedrock credentials');
  }

  let result = null;

  // 1. Try Grok first
  if (grok) {
    try {
      console.log("GROK_START");
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

      const grokStartTime = Date.now();
      const response = await withTimeout(
        grok.chat.completions.create(bodyParams, { timeout: 15000 }),
        15000,
        'GROK_TIMEOUT_SIGNAL'
      );
      
      const latency = Date.now() - grokStartTime;
      console.log(`Response latency for xai.grok-4.3: ${latency}ms`);

      const content = response.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        console.log("Grok model succeeded: xai.grok-4.3");
        result = content.trim();
      } else {
        throw new Error('Grok returned an empty content body');
      }
    } catch (err) {
      if (err.message === 'GROK_TIMEOUT_SIGNAL' || err.name === 'APITimeoutError' || err.message.toLowerCase().includes('timeout')) {
        console.log("GROK_TIMEOUT");
      }
      console.error("Provider failure for model xai.grok-4.3:", err.message || err);
    }
  }

  if (result) {
    const totalTime = Date.now() - totalStartTime;
    console.log(`TOTAL_AI_TIME: ${totalTime}ms`);
    return result;
  }

  // 2. Fallback to Qwen on AWS Bedrock
  if (!bedrock) {
    const totalTime = Date.now() - totalStartTime;
    console.log(`TOTAL_AI_TIME: ${totalTime}ms`);
    throw new Error('AI Service not configured: Missing Bedrock credentials for fallback');
  }

  try {
    console.log("FALLBACK_START");
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

    const elapsedSoFar = Date.now() - totalStartTime;
    const remainingBudget = Math.max(1000, 25000 - elapsedSoFar);
    const bedrockTimeout = Math.min(10000, remainingBudget);

    const bedrockStartTime = Date.now();
    const response = await withTimeout(
      bedrock.chat.completions.create(bodyParams, { timeout: bedrockTimeout }),
      bedrockTimeout,
      'BEDROCK_TIMEOUT_SIGNAL'
    );
    
    const latency = Date.now() - bedrockStartTime;
    console.log(`Response latency for qwen.qwen3-32b: ${latency}ms`);

    const content = response.choices?.[0]?.message?.content;
    if (content && content.trim()) {
      console.log("Bedrock model succeeded: qwen.qwen3-32b");
      result = content.trim();
    } else {
      throw new Error('Model returned an empty content body');
    }
  } catch (err) {
    console.error("Provider failure for model qwen.qwen3-32b:", err.message || err);
    const totalTime = Date.now() - totalStartTime;
    console.log(`TOTAL_AI_TIME: ${totalTime}ms`);
    throw err;
  }

  const totalTime = Date.now() - totalStartTime;
  console.log(`TOTAL_AI_TIME: ${totalTime}ms`);
  return result;
}

export async function* generateAIResponseStream(prompt, options = {}) {
  const grok = getGrokClient();
  const bedrock = getBedrockClient();

  if (!grok && !bedrock) {
    throw new Error('AI Service not configured: Missing both Grok and Bedrock credentials');
  }

  let streamStarted = false;

  // 1. Try Grok
  if (grok) {
    try {
      console.log("GROK_START");
      const grokStartTime = Date.now();
      const responseStream = await withTimeout(
        grok.chat.completions.create({
          model: 'xai.grok-4.3',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
          stream: true
        }),
        15000,
        'GROK_TIMEOUT_SIGNAL'
      );

      const iterator = responseStream[Symbol.asyncIterator]();
      const firstResult = await withTimeout(
        iterator.next(),
        15000,
        'GROK_TIMEOUT_SIGNAL'
      );

      if (firstResult.done) {
        throw new Error('Grok stream completed without returning any tokens');
      }

      console.log(`FIRST_TOKEN_TIME: ${Date.now() - grokStartTime}ms`);
      streamStarted = true;

      const firstText = firstResult.value.choices[0]?.delta?.content || "";
      if (firstText) {
        yield firstText;
      }

      while (true) {
        const nextResult = await iterator.next();
        if (nextResult.done) break;
        const text = nextResult.value.choices[0]?.delta?.content || "";
        if (text) {
          yield text;
        }
      }
      return;
    } catch (err) {
      if (err.message === 'GROK_TIMEOUT_SIGNAL') {
        console.log("GROK_TIMEOUT");
      }
      console.error("Grok stream error or timeout:", err.message || err);
      if (streamStarted) {
        throw err;
      }
    }
  }

  // 2. Bedrock Fallback
  if (!bedrock) {
    throw new Error('Fallback failed: Bedrock client not configured');
  }

  try {
    console.log("FALLBACK_START");
    const bedrockStartTime = Date.now();
    const responseStream = await bedrock.chat.completions.create({
      model: 'qwen.qwen3-32b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      stream: true
    });

    const iterator = responseStream[Symbol.asyncIterator]();
    const firstResult = await iterator.next();
    if (firstResult.done) {
      throw new Error('Bedrock stream completed without returning any tokens');
    }

    console.log(`FIRST_TOKEN_TIME: ${Date.now() - bedrockStartTime}ms`);
    const firstText = firstResult.value.choices[0]?.delta?.content || "";
    if (firstText) {
      yield firstText;
    }

    while (true) {
      const nextResult = await iterator.next();
      if (nextResult.done) break;
      const text = nextResult.value.choices[0]?.delta?.content || "";
      if (text) {
        yield text;
      }
    }
  } catch (err) {
    console.error("Bedrock stream error:", err.message || err);
    throw err;
  }
}
