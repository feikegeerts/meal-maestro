import { getAuthenticatedUser, createAuthenticatedClient, requireAuth } from '../auth-server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

const mockCookies = cookies as jest.Mock;
const mockCreateClient = createClient as jest.Mock;

describe('auth-server', () => {
  let mockCookieStore: {
    get: jest.Mock;
    set: jest.Mock;
    delete: jest.Mock;
  };
  let mockSupabase: {
    auth: {
      getUser: jest.Mock;
      refreshSession: jest.Mock;
      setSession: jest.Mock;
    };
  };
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn()
    };
    
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        refreshSession: jest.fn(),
        setSession: jest.fn()
      }
    };
    
    mockCookies.mockResolvedValue(mockCookieStore);
    mockCreateClient.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('getAuthenticatedUser', () => {
    it('should return null when no access token is found', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await getAuthenticatedUser();

      expect(result).toBeNull();
      expect(mockCookieStore.get).toHaveBeenCalledWith('sb-access-token');
    });

    it('should return user when access token is valid', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      
      mockCookieStore.get.mockImplementation((key: string) => {
        if (key === 'sb-access-token') return { value: 'valid-token' };
        return undefined;
      });
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const result = await getAuthenticatedUser();

      expect(result).toEqual(mockUser);
      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('valid-token');
    });

    it('should attempt refresh when access token is invalid', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockRefreshSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        user: mockUser
      };
      
      mockCookieStore.get.mockImplementation((key: string) => {
        if (key === 'sb-access-token') return { value: 'expired-token' };
        if (key === 'sb-refresh-token') return { value: 'refresh-token' };
        return undefined;
      });
      
      // First call fails (expired token)
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' }
      });
      
      // Refresh succeeds
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: mockRefreshSession },
        error: null
      });

      const result = await getAuthenticatedUser();

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email
      });
      
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: 'refresh-token'
      });
      
      // Should update cookies
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'sb-access-token',
        'new-access-token',
        expect.objectContaining({
          path: '/',
          maxAge: 3600,
          httpOnly: true,
          sameSite: 'lax'
        })
      );
      
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'sb-refresh-token',
        'new-refresh-token',
        expect.objectContaining({
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
          httpOnly: true,
          sameSite: 'lax'
        })
      );
    });

    it('should clear cookies when refresh fails', async () => {
      mockCookieStore.get.mockImplementation((key: string) => {
        if (key === 'sb-access-token') return { value: 'expired-token' };
        if (key === 'sb-refresh-token') return { value: 'invalid-refresh-token' };
        return undefined;
      });
      
      // First call fails (expired token)
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' }
      });
      
      // Refresh fails
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Refresh Token Not Found', status: 400 }
      });

      const result = await getAuthenticatedUser();

      expect(result).toBeNull();
      
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: 'invalid-refresh-token'
      });
      
      // Should clear cookies
      expect(mockCookieStore.delete).toHaveBeenCalledWith('sb-access-token');
      expect(mockCookieStore.delete).toHaveBeenCalledWith('sb-refresh-token');
    });

    it('should handle refresh session without new refresh token', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockRefreshSession = {
        access_token: 'new-access-token',
        refresh_token: null, // No new refresh token
        expires_in: 3600,
        user: mockUser
      };
      
      mockCookieStore.get.mockImplementation((key: string) => {
        if (key === 'sb-access-token') return { value: 'expired-token' };
        if (key === 'sb-refresh-token') return { value: 'refresh-token' };
        return undefined;
      });
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' }
      });
      
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: mockRefreshSession },
        error: null
      });

      const result = await getAuthenticatedUser();

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email
      });
      
      // Should update access token
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'sb-access-token',
        'new-access-token',
        expect.objectContaining({
          path: '/',
          maxAge: 3600,
          httpOnly: true,
          sameSite: 'lax'
        })
      );
      
      // Should not update refresh token
      expect(mockCookieStore.set).not.toHaveBeenCalledWith(
        'sb-refresh-token',
        expect.anything(),
        expect.anything()
      );
    });

    it('should handle refresh session throwing exception', async () => {
      mockCookieStore.get.mockImplementation((key: string) => {
        if (key === 'sb-access-token') return { value: 'expired-token' };
        if (key === 'sb-refresh-token') return { value: 'refresh-token' };
        return undefined;
      });
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' }
      });
      
      // Refresh throws exception
      mockSupabase.auth.refreshSession.mockRejectedValue(new Error('Network error'));

      const result = await getAuthenticatedUser();

      expect(result).toBeNull();
      
      // Should clear cookies
      expect(mockCookieStore.delete).toHaveBeenCalledWith('sb-access-token');
      expect(mockCookieStore.delete).toHaveBeenCalledWith('sb-refresh-token');
    });

    it('should return null when no refresh token is available', async () => {
      mockCookieStore.get.mockImplementation((key: string) => {
        if (key === 'sb-access-token') return { value: 'expired-token' };
        if (key === 'sb-refresh-token') return undefined;
        return undefined;
      });
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' }
      });

      const result = await getAuthenticatedUser();

      expect(result).toBeNull();
      expect(mockSupabase.auth.refreshSession).not.toHaveBeenCalled();
    });
  });

  describe('createAuthenticatedClient', () => {
    it('should return null when user is not authenticated', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await createAuthenticatedClient();

      expect(result).toBeNull();
    });

    it('should return client and user when authenticated', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      
      mockCookieStore.get.mockImplementation((key: string) => {
        if (key === 'sb-access-token') return { value: 'valid-token' };
        if (key === 'sb-refresh-token') return { value: 'refresh-token' };
        return undefined;
      });
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const result = await createAuthenticatedClient();

      expect(result).toEqual({
        client: mockSupabase,
        user: mockUser
      });
      
      expect(mockSupabase.auth.setSession).toHaveBeenCalledWith({
        access_token: 'valid-token',
        refresh_token: 'refresh-token'
      });
    });

    it('should handle missing refresh token', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      
      mockCookieStore.get.mockImplementation((key: string) => {
        if (key === 'sb-access-token') return { value: 'valid-token' };
        if (key === 'sb-refresh-token') return undefined;
        return undefined;
      });
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const result = await createAuthenticatedClient();

      expect(result).toEqual({
        client: mockSupabase,
        user: mockUser
      });
      
      expect(mockSupabase.auth.setSession).toHaveBeenCalledWith({
        access_token: 'valid-token',
        refresh_token: ''
      });
    });
  });

  describe('requireAuth', () => {
    it('should return 401 response when not authenticated', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await requireAuth();

      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(401);
      
      const body = await (result as Response).json();
      expect(body).toEqual({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    });

    it('should return auth result when authenticated', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      
      mockCookieStore.get.mockImplementation((key: string) => {
        if (key === 'sb-access-token') return { value: 'valid-token' };
        return undefined;
      });
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const result = await requireAuth();

      expect(result).toEqual({
        client: mockSupabase,
        user: mockUser
      });
    });
  });
});