import { vi } from 'vitest';
import type { OpenAI } from 'openai';

// Mock OpenAI responses
export const mockChatCompletionResponse = {
  id: 'chatcmpl-test',
  object: 'chat.completion',
  created: Date.now(),
  model: 'gpt-4.1-nano',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant' as const,
        content: 'I can help you with your recipes! What would you like to do?',
      },
      finish_reason: 'stop' as const,
    },
  ],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150,
  },
};

export const mockFunctionCallResponse = {
  id: 'chatcmpl-test-function',
  object: 'chat.completion',
  created: Date.now(),
  model: 'gpt-4.1-nano',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant' as const,
        content: null,
        tool_calls: [
          {
            id: 'call_test123',
            type: 'function' as const,
            function: {
              name: 'search_recipes',
              arguments: JSON.stringify({ query: 'pasta' }),
            },
          },
        ],
      },
      finish_reason: 'tool_calls' as const,
    },
  ],
  usage: {
    prompt_tokens: 200,
    completion_tokens: 30,
    total_tokens: 230,
  },
};

export const mockFinalResponse = {
  id: 'chatcmpl-test-final',
  object: 'chat.completion',
  created: Date.now(),
  model: 'gpt-4.1-nano',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant' as const,
        content: 'I found some pasta recipes for you!',
      },
      finish_reason: 'stop' as const,
    },
  ],
  usage: {
    prompt_tokens: 150,
    completion_tokens: 25,
    total_tokens: 175,
  },
};

// Mock OpenAI client
export const createMockOpenAI = () => {
  const mockClient = {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue(mockChatCompletionResponse),
      },
    },
    
    // Utility methods for tests
    __setNextResponse: (response: any) => {
      mockClient.chat.completions.create.mockResolvedValueOnce(response);
    },
    
    __setResponses: (responses: any[]) => {
      responses.forEach((response) => {
        mockClient.chat.completions.create.mockResolvedValueOnce(response);
      });
    },
    
    __reset: () => {
      mockClient.chat.completions.create.mockClear();
      mockClient.chat.completions.create.mockResolvedValue(mockChatCompletionResponse);
    },
  };
  
  return mockClient;
};

// Mock the OpenAI constructor
export const mockOpenAIConstructor = vi.fn(() => createMockOpenAI());