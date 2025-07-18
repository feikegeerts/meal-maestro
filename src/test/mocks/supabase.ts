import { vi } from 'vitest';
import type { Recipe } from '$lib/types';

// Mock data
export const mockRecipes: Recipe[] = [
  {
    id: '1',
    title: 'Spaghetti Carbonara',
    ingredients: ['spaghetti', 'eggs', 'bacon', 'parmesan cheese', 'black pepper'],
    description: 'Classic Italian pasta dish with eggs, bacon, and cheese',
    category: 'dinner',
    tags: ['italian', 'pasta', 'quick'],
    season: 'year-round',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    title: 'Chocolate Chip Cookies',
    ingredients: ['flour', 'sugar', 'butter', 'eggs', 'chocolate chips'],
    description: 'Soft and chewy chocolate chip cookies',
    category: 'dessert',
    tags: ['cookies', 'dessert', 'baking'],
    season: 'year-round',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  }
];

// Mock Supabase client
export const createMockSupabaseClient = () => {
  let mockData = [...mockRecipes];
  let mockActionLogs: any[] = [];
  let mockApiUsage: any[] = [];

  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
  };

  const mockClient = {
    from: vi.fn((table: string) => {
      if (table === 'recipes') {
        return {
          ...mockQuery,
          single: vi.fn().mockResolvedValue({ data: mockData[0], error: null }),
          select: vi.fn().mockImplementation((fields: string) => ({
            ...mockQuery,
            then: vi.fn().mockResolvedValue({ data: mockData, error: null })
          })),
          insert: vi.fn().mockImplementation((data: any[]) => {
            const newRecipe = { ...data[0], id: Date.now().toString() };
            mockData.push(newRecipe);
            return {
              ...mockQuery,
              select: vi.fn().mockImplementation(() => ({
                single: vi.fn().mockResolvedValue({ data: newRecipe, error: null })
              }))
            };
          }),
          update: vi.fn().mockImplementation((data: any) => {
            const index = mockData.findIndex(r => r.id === data.id);
            if (index !== -1) {
              mockData[index] = { ...mockData[index], ...data };
            }
            return {
              ...mockQuery,
              select: vi.fn().mockImplementation(() => ({
                single: vi.fn().mockResolvedValue({ data: mockData[index], error: null })
              }))
            };
          }),
          delete: vi.fn().mockImplementation(() => ({
            ...mockQuery,
            then: vi.fn().mockResolvedValue({ error: null })
          }))
        };
      }
      
      if (table === 'action_logs') {
        return {
          ...mockQuery,
          insert: vi.fn().mockImplementation((data: any[]) => {
            mockActionLogs.push(...data);
            return Promise.resolve({ error: null });
          }),
          select: vi.fn().mockImplementation(() => ({
            ...mockQuery,
            then: vi.fn().mockResolvedValue({ data: mockActionLogs, error: null })
          }))
        };
      }
      
      if (table === 'api_usage') {
        return {
          ...mockQuery,
          insert: vi.fn().mockImplementation((data: any[]) => {
            mockApiUsage.push(...data);
            return Promise.resolve({ error: null });
          }),
          select: vi.fn().mockImplementation(() => ({
            ...mockQuery,
            then: vi.fn().mockResolvedValue({ data: mockApiUsage, error: null })
          }))
        };
      }
      
      return mockQuery;
    }),
    
    // Reset mock data for tests
    __reset: () => {
      mockData = [...mockRecipes];
      mockActionLogs = [];
      mockApiUsage = [];
    },
    
    // Access mock data for assertions
    __getMockData: () => ({ recipes: mockData, actionLogs: mockActionLogs, apiUsage: mockApiUsage })
  };

  return mockClient;
};

// Mock the createClient function
export const mockCreateClient = vi.fn(() => createMockSupabaseClient());