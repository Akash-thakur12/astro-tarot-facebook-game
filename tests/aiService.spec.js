import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateAIResponse } from '../services/aiService.js';
import OpenAI from 'openai';

vi.mock('openai', () => {
  const createMock = vi.fn();
  return {
    default: class {
      constructor(config) {
        this.config = config;
        this.chat = {
          completions: {
            create: createMock
          }
        };
      }
    }
  };
});

describe('aiService - generateAIResponse', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw an error if both Grok and Bedrock credentials are missing', async () => {
    delete process.env.GROK_API_KEY;
    delete process.env.GROK_BASE_URL;
    delete process.env.BEDROCK_API_KEY;
    delete process.env.BEDROCK_BASE_URL;

    await expect(generateAIResponse('hello')).rejects.toThrow(
      'AI Service not configured'
    );
  });

  it('should successfully return response from Grok if it succeeds', async () => {
    process.env.GROK_API_KEY = 'grok-key';
    process.env.GROK_BASE_URL = 'https://grok.api';

    const mockOpenAI = new OpenAI();
    mockOpenAI.chat.completions.create.mockResolvedValueOnce({
      choices: [{ message: { content: 'Grok Response' } }]
    });

    const response = await generateAIResponse('hello');
    expect(response).toBe('Grok Response');

    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
      {
        model: 'xai.grok-4.3',
        messages: [{ role: 'user', content: 'hello' }],
        temperature: 0.5
      },
      {
        timeout: 15000
      }
    );
  });

  it('should fail over to Qwen on Bedrock if Grok fails', async () => {
    process.env.GROK_API_KEY = 'grok-key';
    process.env.GROK_BASE_URL = 'https://grok.api';
    process.env.BEDROCK_API_KEY = 'bedrock-key';
    process.env.BEDROCK_BASE_URL = 'https://bedrock.api';

    const mockOpenAI = new OpenAI();
    // Grok fails
    mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('Grok failed'));
    // Bedrock succeeds
    mockOpenAI.chat.completions.create.mockResolvedValueOnce({
      choices: [{ message: { content: 'Qwen Response' } }]
    });

    const response = await generateAIResponse('hello');
    expect(response).toBe('Qwen Response');
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);

    const calls = mockOpenAI.chat.completions.create.mock.calls;
    expect(calls[0][0].model).toBe('xai.grok-4.3');
    expect(calls[1][0].model).toBe('qwen.qwen3-32b');
  });

  it('should throw an error if both Grok and Qwen fail', async () => {
    process.env.GROK_API_KEY = 'grok-key';
    process.env.GROK_BASE_URL = 'https://grok.api';
    process.env.BEDROCK_API_KEY = 'bedrock-key';
    process.env.BEDROCK_BASE_URL = 'https://bedrock.api';

    const mockOpenAI = new OpenAI();
    mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('Grok failed'));
    mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('Qwen failed'));

    await expect(generateAIResponse('hello')).rejects.toThrow('Qwen failed');
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
  });
});
