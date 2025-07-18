import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  logRecipeCreated, 
  logRecipeUpdated, 
  logRecipeDeleted, 
  logRecipeSearch,
  logApiUsage,
  getActionLogs,
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

// Helper to simulate Supabase query chain for async/await
function createActionLogsQueryMock(data = mockActionLogs, error = null) {
  const mock = {
    insert: actionLogsInsertSpy,
    then: vi.fn().mockResolvedValue({ data, error }),
    selectAsync: async () => ({ data, error }),
    orderAsync: async () => ({ data, error }),
    limitAsync: async () => ({ data, error }),
    eqAsync: async () => ({ data, error }),
    gteAsync: async () => ({ data, error }),
    lteAsync: async () => ({ data, error }),
    select: undefined,
    order: undefined,
    limit: undefined,
    eq: undefined,
    gte: undefined,
    lte: undefined
  } as any;
  mock.select = vi.fn(() => mock);
  mock.order = vi.fn(() => mock);
  mock.limit = vi.fn(() => mock);
  mock.eq = vi.fn(() => mock);
  mock.gte = vi.fn(() => mock);
  mock.lte = vi.fn(() => mock);
  return mock;
}

function createApiUsageQueryMock(data = mockApiUsage, error = null) {
  const mock = {
    insert: apiUsageInsertSpy,
    then: vi.fn().mockResolvedValue({ data, error }),
    selectAsync: async () => ({ data, error }),
    gteAsync: async () => ({ data, error }),
    lteAsync: async () => ({ data, error }),
    select: undefined,
    gte: undefined,
    lte: undefined
  } as any;
  mock.select = vi.fn(() => mock);
  mock.gte = vi.fn(() => mock);
  mock.lte = vi.fn(() => mock);
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
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
      selectAsync: async () => ({ data: [], error: null }),
      orderAsync: async () => ({ data: [], error: null }),
      limitAsync: async () => ({ data: [], error: null }),
      select: undefined,
      order: undefined,
      limit: undefined
    } as any;
    mock.select = vi.fn(() => mock);
    mock.order = vi.fn(() => mock);
    mock.limit = vi.fn(() => mock);
    return mock;
  })
};

describe('Action Logging Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Recipe action logging', () => {
    it('should log recipe creation', async () => {
      await logRecipeCreated(mockSupabaseClient as any, mockRecipe);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('action_logs');
      
      const insertCall = mockSupabaseClient.from('action_logs').insert;
      expect(insertCall).toHaveBeenCalledWith([
        expect.objectContaining({
          action_type: 'create',
          recipe_id: '1',
          description: 'Created recipe: Test Recipe',
          details: { newData: mockRecipe }
        })
      ]);
    });

    it('should log recipe update', async () => {
      const originalData = { ...mockRecipe };
      const newData = { ...mockRecipe, title: 'Updated Recipe' };
      
      await logRecipeUpdated(mockSupabaseClient as any, '1', originalData, newData);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('action_logs');
      
      const insertCall = mockSupabaseClient.from('action_logs').insert;
      expect(insertCall).toHaveBeenCalledWith([
        expect.objectContaining({
          action_type: 'update',
          recipe_id: '1',
          description: expect.stringContaining('Updated recipe'),
          details: expect.objectContaining({
            originalData,
            newData,
            changedFields: expect.any(Array)
          })
        })
      ]);
    });

    it('should log recipe deletion', async () => {
      await logRecipeDeleted(mockSupabaseClient as any, mockRecipe);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('action_logs');
      
      const insertCall = mockSupabaseClient.from('action_logs').insert;
      expect(insertCall).toHaveBeenCalledWith([
        expect.objectContaining({
          action_type: 'delete',
          recipe_id: '1',
          description: 'Deleted recipe: Test Recipe',
          details: { originalData: mockRecipe }
        })
      ]);
    });

    it('should log recipe search', async () => {
      const searchQuery = 'pasta';
      const filters = { category: 'dinner' };
      const resultCount = 2;
      
      await logRecipeSearch(mockSupabaseClient as any, searchQuery, filters, resultCount);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('action_logs');
      
      const insertCall = mockSupabaseClient.from('action_logs').insert;
      expect(insertCall).toHaveBeenCalledWith([
        expect.objectContaining({
          action_type: 'search',
          recipe_id: null,
          description: 'Searched recipes: "pasta" (2 results)',
          details: {
            searchQuery,
            filters,
            resultCount
          }
        })
      ]);
    });

    it('should handle logging errors gracefully', async () => {
      const errorClient = {
        from: vi.fn(() => ({
          insert: vi.fn().mockResolvedValue({ error: new Error('Database error') })
        }))
      };
      
      // Should not throw error
      await expect(
        logRecipeCreated(errorClient as any, mockRecipe)
      ).resolves.not.toThrow();
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

  describe('Action log retrieval', () => {
    it('should get action logs', async () => {
      const logs = await getActionLogs(mockSupabaseClient as any, 50);
      
      expect(logs).toEqual(mockActionLogs);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('action_logs');
    });

    it('should handle custom limit', async () => {
      const logs = await getActionLogs(mockSupabaseClient as any, 10);
      
      expect(logs).toEqual(mockActionLogs);
      
      const limitCall = mockSupabaseClient.from('action_logs').limit;
      expect(limitCall).toHaveBeenCalledWith(10);
    });

    it('should handle retrieval errors', async () => {
      const errorClient = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          then: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
        }))
      };
      
      const logs = await getActionLogs(errorClient as any, 50);
      expect(logs).toEqual([]);
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
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          then: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
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
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          then: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
        }))
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

  describe('Action log completeness', () => {
    it('should ensure all required fields are logged', async () => {
      await logRecipeCreated(mockSupabaseClient as any, mockRecipe);
      
      const insertCall = mockSupabaseClient.from('action_logs').insert;
      const logData = insertCall.mock.calls[0][0][0];
      
      expect(logData).toHaveProperty('action_type');
      expect(logData).toHaveProperty('recipe_id');
      expect(logData).toHaveProperty('description');
      expect(logData).toHaveProperty('details');
    });

    it('should capture all changed fields in updates', async () => {
      const originalData = { ...mockRecipe };
      const newData = { 
        ...mockRecipe, 
        title: 'Updated Recipe',
        ingredients: ['new ingredient'],
        tags: ['new tag']
      };
      
      await logRecipeUpdated(mockSupabaseClient as any, '1', originalData, newData);
      
      const insertCall = mockSupabaseClient.from('action_logs').insert;
      const logData = insertCall.mock.calls[0][0][0];
      
      expect(logData.details.changedFields).toContain('title');
      expect(logData.details.changedFields).toContain('ingredients');
      expect(logData.details.changedFields).toContain('tags');
    });

    it('should preserve all original data in delete logs', async () => {
      await logRecipeDeleted(mockSupabaseClient as any, mockRecipe);
      
      const insertCall = mockSupabaseClient.from('action_logs').insert;
      const logData = insertCall.mock.calls[0][0][0];
      
      expect(logData.details.originalData).toEqual(mockRecipe);
    });
  });
});