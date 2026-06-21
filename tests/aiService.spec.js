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

  it('should throw an error if BEDROCK_API_KEY and BEDROCK_BASE_URL are missing', async () => {
    delete process.env.BEDROCK_API_KEY;
    delete process.env.BEDROCK_BASE_URL;

    await expect(generateAIResponse('hello')).rejects.toThrow(
      'AI Service not configured'
    );
  });

  it('should successfully return response from the first model if it succeeds', async () => {
    process.env.BEDROCK_API_KEY = 'test-key';
    process.env.BEDROCK_BASE_URL = 'https://test.api';

    // Mock completion create to succeed on first attempt
    const mockOpenAI = new OpenAI();
    mockOpenAI.chat.completions.create.mockResolvedValueOnce({
      choices: [{ message: { content: 'Deepseek Response' } }]
    });

    const response = await generateAIResponse('hello');
    expect(response).toBe('Deepseek Response');

    // Should call completions.create with deepseek.v3.2, temp 0.7, timeout 15000
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
      {
        model: 'deepseek.v3.2',
        messages: [{ role: 'user', content: 'hello' }],
        temperature: 0.7
      },
      {
        timeout: 15000
      }
    );
  });

  it('should retry a model up to 2 times before failing over to the next model', async () => {
    process.env.BEDROCK_API_KEY = 'test-key';
    process.env.BEDROCK_BASE_URL = 'https://test.api';

    const mockOpenAI = new OpenAI();
    // 1st model (deepseek): 2 failures
    mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('Deepseek attempt 1 failed'));
    mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('Deepseek attempt 2 failed'));
    // 2nd model (gemma): 1 failure, 1 success
    mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('Gemma attempt 1 failed'));
    mockOpenAI.chat.completions.create.mockResolvedValueOnce({
      choices: [{ message: { content: 'Gemma Response' } }]
    });

    const response = await generateAIResponse('hello');
    expect(response).toBe('Gemma Response');
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(4);

    const calls = mockOpenAI.chat.completions.create.mock.calls;
    expect(calls[0][0].model).toBe('deepseek.v3.2');
    expect(calls[1][0].model).toBe('deepseek.v3.2');
    expect(calls[2][0].model).toBe('google.gemma-3-4b-it');
    expect(calls[3][0].model).toBe('google.gemma-3-4b-it');
  });

  it('should throw an error if all models in the chain fail', async () => {
    process.env.BEDROCK_API_KEY = 'test-key';
    process.env.BEDROCK_BASE_URL = 'https://test.api';

    const mockOpenAI = new OpenAI();
    // 5 models * 2 attempts = 10 failures
    for (let i = 0; i < 10; i++) {
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error(`Failure #${i + 1}`));
    }

    await expect(generateAIResponse('hello')).rejects.toThrow('Failure #10');
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(10);
  });
});
