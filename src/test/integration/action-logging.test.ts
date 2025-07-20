import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  logApiUsage,
  getApiUsageStats
} from '../../lib/services/actionLogger.js';
import type { Recipe } from '../../lib/types.js';

// Mock data
const mockRecipe: Recipe = {
  id: '1',
  title: 'Test Recipe',
  ingredients: ['ingredient1', 'ingredient2'],
  description: 'Test description',
  category: 'dinner',
  tags: ['tag1', 'tag2'],
  season: 'summer',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockActionLogs = [
  {
    id: '1',
    action_type: 'create' as const,
    recipe_id: '1',
    description: 'Created recipe: Test Recipe',
    details: { newData: mockRecipe },
    timestamp: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    action_type: 'search' as const,
    recipe_id: null,
    description: 'Searched recipes: "pasta" (2 results)',
    details: { searchQuery: 'pasta', resultCount: 2 },
    timestamp: '2024-01-01T00:01:00Z'
  }
];

const mockApiUsage = [
  {
    id: '1',
    endpoint: 'chat',
    tokens_used: 150,
    cost_usd: 0.001,
    timestamp: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    endpoint: 'chat',
    tokens_used: 200,
    cost_usd: 0.002,
    timestamp: '2024-01-01T00:01:00Z'
  }
];




// Shared spies for insert
const actionLogsInsertSpy = vi.fn().mockResolvedValue({ error: null });
const apiUsageInsertSpy = vi.fn().mockResolvedValue({ error: null });

// Shared spies for query methods
const actionLogsLimitSpy = vi.fn();
const actionLogsSelectSpy = vi.fn();
const actionLogsOrderSpy = vi.fn();

// Helper to simulate Supabase query chain for async/await
function createActionLogsQueryMock(data = mockActionLogs, error = null) {
  // Create a mock object with all chainable methods returning itself
  const mock: any = {};
  mock.insert = actionLogsInsertSpy;
  mock.select = actionLogsSelectSpy.mockImplementation(() => mock);
  mock.order = actionLogsOrderSpy.mockImplementation(() => mock);
  mock.limit = actionLogsLimitSpy.mockImplementation(() => ({ data, error }));
  mock.eq = vi.fn(() => mock);
  mock.gte = vi.fn(() => mock);
  mock.lte = vi.fn(() => mock);
  mock.or = vi.fn(() => mock);
  mock.overlaps = vi.fn(() => mock);
  mock.lt = vi.fn(() => mock);
  mock.delete = vi.fn(() => mock);
  
  // Make the mock thenable to support await
  mock.then = vi.fn((resolve) => {
    return Promise.resolve({ data, error }).then(resolve);
  });
  
  // Async variants for completeness
  mock.selectAsync = async () => ({ data, error });
  mock.orderAsync = async () => ({ data, error });
  mock.limitAsync = async () => ({ data, error });
  mock.eqAsync = async () => ({ data, error });
  mock.gteAsync = async () => ({ data, error });
  mock.lteAsync = async () => ({ data, error });
  mock.orAsync = async () => ({ data, error });
  mock.overlapsAsync = async () => ({ data, error });
  return mock;
}

function createApiUsageQueryMock(data = mockApiUsage, error = null) {
  const mock: any = {};
  mock.insert = apiUsageInsertSpy;
  mock.select = vi.fn(() => mock);
  mock.gte = vi.fn(() => mock);
  mock.lte = vi.fn(() => mock);
  mock.or = vi.fn(() => mock);
  mock.overlaps = vi.fn(() => mock);
  
  // Make the mock thenable to support await
  mock.then = vi.fn((resolve) => {
    return Promise.resolve({ data, error }).then(resolve);
  });
  
  // Async variants for completeness
  mock.selectAsync = async () => ({ data, error });
  mock.gteAsync = async () => ({ data, error });
  mock.lteAsync = async () => ({ data, error });
  mock.orAsync = async () => ({ data, error });
  mock.overlapsAsync = async () => ({ data, error });
  return mock;
}

const mockSupabaseClient = {
  from: vi.fn((table: string) => {
    if (table === 'action_logs') {
      return createActionLogsQueryMock();
    }
    if (table === 'api_usage') {
      return createApiUsageQueryMock();
    }
    // fallback for other tables
    const mock = {
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => Promise.resolve({ data: [], error: null }).then(resolve)),
      selectAsync: async () => ({ data: [], error: null }),
      orderAsync: async () => ({ data: [], error: null }),
      limitAsync: async () => ({ data: [], error: null })
    } as any;
    return mock;
  })
};

describe('Action Logging Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the from mock to ensure fresh mocks for each test
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'action_logs') {
        return createActionLogsQueryMock();
      }
      if (table === 'api_usage') {
        return createApiUsageQueryMock();
      }
      // fallback for other tables
      const mock = {
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => Promise.resolve({ data: [], error: null }).then(resolve)),
        selectAsync: async () => ({ data: [], error: null }),
        orderAsync: async () => ({ data: [], error: null }),
        limitAsync: async () => ({ data: [], error: null })
      } as any;
      return mock;
    });
  });

  describe('API usage logging', () => {
    it('should log API usage', async () => {
      await logApiUsage(mockSupabaseClient as any, 'chat', 150, 0.001);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('api_usage');
      
      const insertCall = mockSupabaseClient.from('api_usage').insert;
      expect(insertCall).toHaveBeenCalledWith([
        expect.objectContaining({
          endpoint: 'chat',
          tokens_used: 150,
          cost_usd: 0.001
        })
      ]);
    });

    it('should handle API usage logging errors gracefully', async () => {
      const errorClient = {
        from: vi.fn(() => ({
          insert: vi.fn().mockResolvedValue({ error: new Error('Database error') })
        }))
      };
      
      // Should not throw error
      await expect(
        logApiUsage(errorClient as any, 'chat', 150, 0.001)
      ).resolves.not.toThrow();
    });
  });

  describe('API usage statistics', () => {
    it('should get daily API usage stats', async () => {
      const stats = await getApiUsageStats(mockSupabaseClient as any, 'day');
      
      expect(stats).toEqual({
        totalTokens: 350,
        totalCost: 0.003,
        requestCount: 2,
        averageCostPerRequest: 0.0015
      });
    });

    it('should get weekly API usage stats', async () => {
      const stats = await getApiUsageStats(mockSupabaseClient as any, 'week');
      
      expect(stats).toEqual({
        totalTokens: 350,
        totalCost: 0.003,
        requestCount: 2,
        averageCostPerRequest: 0.0015
      });
    });

    it('should handle empty usage data', async () => {
      const emptyClient = {
        from: vi.fn(() => {
          const mock: any = {};
          mock.select = vi.fn(() => mock);
          mock.gte = vi.fn(() => mock);
          mock.lte = vi.fn(() => mock);
          mock.then = vi.fn((resolve) => {
            return Promise.resolve({ data: [], error: null }).then(resolve);
          });
          return mock;
        })
      };
      
      const stats = await getApiUsageStats(emptyClient as any, 'day');
      
      expect(stats).toEqual({
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        averageCostPerRequest: 0
      });
    });

    it('should handle usage stats errors', async () => {
      const errorClient = {
        from: vi.fn(() => {
          const mock: any = {};
          mock.select = vi.fn(() => mock);
          mock.gte = vi.fn(() => mock);
          mock.lte = vi.fn(() => mock);
          mock.then = vi.fn((resolve) => {
            return Promise.resolve({ data: null, error: new Error('Database error') }).then(resolve);
          });
          return mock;
        })
      };
      
      const stats = await getApiUsageStats(errorClient as any, 'day');
      
      expect(stats).toEqual({
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        averageCostPerRequest: 0
      });
    });
  });
});