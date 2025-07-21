import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

// Mock Supabase client and auth
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue({ data: [], error: null })
  })),
  auth: {
    getUser: vi.fn(),
    setSession: vi.fn(),
    refreshSession: vi.fn()
  }
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

// Mock OpenAI service
vi.mock('$lib/services/openaiService.js', () => ({
  createChatCompletion: vi.fn().mockResolvedValue({
    completion: {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'I can help you with your recipes! What would you like to do?'
          }
        }
      ]
    },
    usage: {
      tokens: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      model: 'gpt-4o-mini',
      cost_usd: 0.001
    }
  }),
  validateOpenAIConfig: vi.fn().mockReturnValue({ valid: true }),
  usageTracker: {
    getUsageStats: vi.fn().mockReturnValue({
      requests: 10,
      dailyCost: 2.50,
      maxDailyCost: 10.00
    })
  }
}));

// Mock recipe functions
vi.mock('$lib/services/recipeFunctions.js', () => ({
  recipeTools: [
    {
      type: 'function',
      function: {
        name: 'search_recipes',
        description: 'Search for recipes',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          }
        }
      }
    }
  ],
  RecipeFunctionHandler: vi.fn().mockImplementation(() => ({
    handleFunctionCall: vi.fn().mockResolvedValue({ recipes: [], total: 0 })
  })),
  formatFunctionResult: vi.fn().mockReturnValue('Function result formatted')
}));

// Mock action logger
vi.mock('$lib/services/actionLogger.js', () => ({
  logApiUsage: vi.fn()
}));

// Mock environment
vi.mock('$app/environment', () => ({
  dev: true
}));

// Mock dotenv
vi.mock('dotenv', () => ({
  config: vi.fn()
}));

describe('Chat API endpoint', () => {
  let mockEvent: RequestEvent<any, "/api/recipes/chat">;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock cookies.get to return a valid access token for authenticated tests
    const cookies = {
      get: vi.fn((name: string) => {
        if (name === 'sb-access-token') return 'test-access-token';
        if (name === 'sb-refresh-token') return 'test-refresh-token';
        return undefined;
      }),
      set: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(() => []),
      serialize: vi.fn(() => '')
    };
    // Mock supabase.auth.getUser to return a user if access token is present
    mockSupabaseClient.auth.getUser.mockImplementation(async (token: string) => {
      if (token === 'test-access-token') {
        return { data: { user: { id: 'user-123', email: 'testuser@example.com' } }, error: null };
      }
      return { data: { user: null }, error: { message: 'Invalid token' } };
    });
    mockEvent = {
      url: new URL('http://localhost:3000/api/recipes/chat'),
      request: new Request('http://localhost:3000/api/recipes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }),
      params: {},
      locals: {},
      platform: undefined,
      route: { id: "/api/recipes/chat" },
      setHeaders: vi.fn(),
      cookies,
      fetch: vi.fn(),
      getClientAddress: vi.fn(),
      isDataRequest: false,
      isSubRequest: false
    };
  });

  describe('GET /api/recipes/chat', () => {
    it('should return status and configuration', async () => {
      const { GET } = await import('../../routes/api/recipes/chat/+server.js');
      
      const response = await GET(mockEvent);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('openai_config');
      expect(data).toHaveProperty('usage_stats');
      expect(data).toHaveProperty('available_functions');
    });

    it('should handle OpenAI configuration errors', async () => {
      const { GET } = await import('../../routes/api/recipes/chat/+server.js');
      
      const { validateOpenAIConfig } = await import('$lib/services/openaiService.js');
      vi.mocked(validateOpenAIConfig).mockReturnValueOnce({ 
        valid: false, 
        error: 'Invalid API key' 
      });

      const response = await GET(mockEvent);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.openai_config).toBe('Invalid API key');
    });
  });

  describe('POST /api/recipes/chat', () => {
    it('should handle simple chat message', async () => {
      const { POST } = await import('../../routes/api/recipes/chat/+server.js');
      
      const chatData = {
        message: 'Hello, what can you help me with?'
      };

      mockEvent.request = new Request('http://localhost:3000/api/recipes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatData)
      });

      const response = await POST(mockEvent);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('response');
      expect(data).toHaveProperty('conversation_history');
      expect(data).toHaveProperty('usage');
      expect(data).toHaveProperty('system_stats');
    });

    it('should handle conversation history', async () => {
      const { POST } = await import('../../routes/api/recipes/chat/+server.js');
      
      const chatData = {
        message: 'What about desserts?',
        conversation_history: [
          { role: 'user', content: 'Hi there!' },
          { role: 'assistant', content: 'Hello! How can I help you with recipes?' }
        ]
      };

      mockEvent.request = new Request('http://localhost:3000/api/recipes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatData)
      });

      const response = await POST(mockEvent);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.conversation_history).toHaveLength(4); // 2 from history + 2 new
    });

    it('should validate message input', async () => {
      const { POST } = await import('../../routes/api/recipes/chat/+server.js');
      
      const chatData = {
        // Missing message
      };

      mockEvent.request = new Request('http://localhost:3000/api/recipes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatData)
      });


      const response = await POST(mockEvent);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Message is required and must be a string');
    });

    it('should handle OpenAI configuration errors', async () => {
      const { POST } = await import('../../routes/api/recipes/chat/+server.js');
      
      const { validateOpenAIConfig } = await import('$lib/services/openaiService.js');
      vi.mocked(validateOpenAIConfig).mockReturnValueOnce({ 
        valid: false, 
        error: 'Invalid API key' 
      });

      const chatData = {
        message: 'Hello'
      };

      mockEvent.request = new Request('http://localhost:3000/api/recipes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatData)
      });

      const response = await POST(mockEvent);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error', 'OpenAI configuration error');
      expect(data).toHaveProperty('details', 'Invalid API key');
    });

    it('should handle rate limiting errors', async () => {
      const { POST } = await import('../../routes/api/recipes/chat/+server.js');
      
      const { createChatCompletion } = await import('$lib/services/openaiService.js');
      vi.mocked(createChatCompletion).mockRejectedValueOnce(
        new Error('Rate limit exceeded')
      );

      const chatData = {
        message: 'Hello'
      };

      mockEvent.request = new Request('http://localhost:3000/api/recipes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatData)
      });

      const response = await POST(mockEvent);
      const data = await response.json();
      
      expect(response.status).toBe(429);
      expect(data).toHaveProperty('error', 'Rate limit exceeded');
    });
  });
});