import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';


// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => {
    const data = [
      {
        id: '1',
        action_type: 'create',
        recipe_id: '1',
        description: 'Created recipe: Test Recipe',
        details: { newData: { title: 'Test Recipe' } },
        timestamp: '2024-01-01T00:00:00Z'
      }
    ];
    const error = null;
    const mock: any = {};
    mock.select = vi.fn(() => mock);
    mock.order = vi.fn(() => mock);
    mock.limit = vi.fn(() => ({ data, error }));
    mock.eq = vi.fn(() => mock);
    // If you use .then() in your code, you can add:
    mock.then = vi.fn(() => Promise.resolve({ data, error }));
    return mock;
  })
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

// Mock action logger
vi.mock('$lib/services/actionLogger.js', () => ({
  getActionLogs: vi.fn().mockResolvedValue([
    {
      id: '1',
      action_type: 'create',
      recipe_id: '1',
      description: 'Created recipe: Test Recipe',
      details: { newData: { title: 'Test Recipe' } },
      timestamp: '2024-01-01T00:00:00Z'
    }
  ]),
  getRecipeActionLogs: vi.fn().mockResolvedValue([
    {
      id: '1',
      action_type: 'create',
      recipe_id: '1',
      description: 'Created recipe: Test Recipe',
      details: { newData: { title: 'Test Recipe' } },
      timestamp: '2024-01-01T00:00:00Z'
    }
  ])
}));

// Mock environment
vi.mock('$app/environment', () => ({
  dev: true
}));

// Mock dotenv
vi.mock('dotenv', () => ({
  config: vi.fn()
}));

describe('Actions API endpoint', () => {
  let mockEvent: RequestEvent<any, "/api/recipes/actions">;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEvent = {
      url: new URL('http://localhost:3000/api/recipes/actions'),
      request: new Request('http://localhost:3000/api/recipes/actions', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }),
      params: {},
      locals: {},
      platform: undefined,
      route: { id: "/api/recipes/actions" },
      setHeaders: vi.fn(),
      cookies: {} as any,
      fetch: vi.fn(),
      getClientAddress: vi.fn(),
      isDataRequest: false,
      isSubRequest: false
    } as RequestEvent<any, "/api/recipes/actions">;
  });

  describe('GET /api/recipes/actions', () => {
    it('should return action logs', async () => {
      const { GET } = await import('../../routes/api/recipes/actions/+server.js');
      
      const response = await GET(mockEvent);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('action_logs');
      expect(data).toHaveProperty('count');
      expect(Array.isArray(data.action_logs)).toBe(true);
      expect(data.action_logs).toHaveLength(1);
      expect(data.action_logs[0]).toHaveProperty('action_type', 'create');
      expect(data.count).toBe(1);
    });

    it('should handle custom limit parameter', async () => {
      const { GET } = await import('../../routes/api/recipes/actions/+server.js');
      
      mockEvent.url.searchParams.set('limit', '5');
      
      const response = await GET(mockEvent);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('action_logs');
      
      const { getActionLogs } = await import('$lib/services/actionLogger.js');
      expect(getActionLogs).toHaveBeenCalledWith(expect.anything(), 5);
    });

    it('should handle recipe_id filter', async () => {
      const { GET } = await import('../../routes/api/recipes/actions/+server.js');
      
      mockEvent.url.searchParams.set('recipe_id', '1');
      
      const response = await GET(mockEvent);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('action_logs');
      
      const { getRecipeActionLogs } = await import('$lib/services/actionLogger.js');
      expect(getRecipeActionLogs).toHaveBeenCalledWith(expect.anything(), '1');
    });

    it('should validate limit parameter bounds', async () => {
      const { GET } = await import('../../routes/api/recipes/actions/+server.js');
      
      mockEvent.url.searchParams.set('limit', '1001');
      
      const response = await GET(mockEvent);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Limit must be between 1 and 1000');
    });

    it('should handle negative limit parameter', async () => {
      const { GET } = await import('../../routes/api/recipes/actions/+server.js');
      
      mockEvent.url.searchParams.set('limit', '-5');
      
      const response = await GET(mockEvent);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Limit must be between 1 and 1000');
    });
  });
});