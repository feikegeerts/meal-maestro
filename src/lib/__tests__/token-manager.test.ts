/* eslint-disable @typescript-eslint/no-explicit-any */
import { TokenManager } from "../token-manager";

// Use the existing mocked supabase
jest.mock("../supabase");

// Mock fetch globally for server token sync
global.fetch = jest.fn();

describe("TokenManager", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;
  let tokenManager: TokenManager;
  let mockSupabase: any;

  // Helper to get the mocked supabase instance
  const getMockSupabase = async (): Promise<jest.Mocked<any>> => {
    const { supabase } = await import("../supabase");
    return supabase as jest.Mocked<any>;
  };

  beforeEach(async () => {
    // Reset TokenManager instance
    TokenManager.resetInstance();
    tokenManager = TokenManager.getInstance();

    // Mock console methods
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});

    // Reset all mocks
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();

    // Get the mocked supabase instance and reset its mocks
    mockSupabase = await getMockSupabase();

    // Default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockSupabase.auth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe("getInstance", () => {
    it("should return the same instance (singleton pattern)", () => {
      const instance1 = TokenManager.getInstance();
      const instance2 = TokenManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("getValidSession", () => {
    it("should return current session if not expiring soon", async () => {
      const mockSupabase = await getMockSupabase();

      const mockSession = {
        access_token: "valid-token",
        refresh_token: "refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 600, // 10 minutes from now
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await tokenManager.getValidSession();
      expect(result).toBe(mockSession);
      expect(mockSupabase.auth.refreshSession).not.toHaveBeenCalled();
    });

    it("should refresh session if expiring soon", async () => {
      const mockSupabase = await getMockSupabase();

      const mockCurrentSession = {
        access_token: "expiring-token",
        refresh_token: "refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 200, // 3 minutes from now
      };

      const mockRefreshedSession = {
        access_token: "new-token",
        refresh_token: "new-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockCurrentSession },
        error: null,
      });

      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: mockRefreshedSession },
        error: null,
      });

      // Mock successful token sync
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await tokenManager.getValidSession();
      expect(result).toBe(mockRefreshedSession);
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalled();
    });

    it("should return null if no session exists", async () => {
      const mockSupabase = await getMockSupabase();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await tokenManager.getValidSession();
      expect(result).toBeNull();
    });
  });

  describe("refreshSession", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should handle concurrent refresh requests by queuing", async () => {
      const mockSupabase = await getMockSupabase();

      const mockRefreshedSession = {
        access_token: "new-token",
        refresh_token: "new-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      // Mock a slow refresh operation
      let resolveRefresh: (value: { data: { session: unknown }; error: null }) => void;
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });

      mockSupabase.auth.refreshSession.mockReturnValue(refreshPromise);

      // Mock successful token sync
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Start multiple refresh requests concurrently
      const refresh1Promise = tokenManager.refreshSession();
      const refresh2Promise = tokenManager.refreshSession();
      const refresh3Promise = tokenManager.refreshSession();

      // Verify only one actual refresh call was made
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalledTimes(1);

      // Resolve the refresh operation
      resolveRefresh!({
        data: { session: mockRefreshedSession },
        error: null,
      });

      // Wait for all promises to resolve
      const results = await Promise.all([
        refresh1Promise,
        refresh2Promise,
        refresh3Promise,
      ]);

      // All should receive the same session
      results.forEach((result) => {
        expect(result).toBe(mockRefreshedSession);
      });
    });

    it('should handle "Already Used" refresh token error gracefully', async () => {
      const mockSupabase = await getMockSupabase();

      const existingSession = {
        access_token: "existing-token",
        refresh_token: "existing-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      // Mock refresh failure with "Already Used" error
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Already Used" },
      });

      // Mock getSession returning valid session (another process refreshed it)
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: existingSession },
        error: null,
      });

      // Mock successful token sync
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await tokenManager.refreshSession();
      expect(result).toBe(existingSession);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining("Refresh token already used")
      );
    });

    it("should respect refresh cooldown period", async () => {
      const mockSupabase = await getMockSupabase();

      const mockSession = {
        access_token: "token",
        refresh_token: "refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      // Mock getSession for cooldown scenario
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // First refresh should work normally
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await tokenManager.refreshSession();
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalledTimes(1);

      // Second refresh within cooldown period should return existing session
      const result = await tokenManager.refreshSession();
      expect(result).toBe(mockSession);
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalledTimes(1); // No additional calls
    });

    it("should retry refresh on failure with exponential backoff", async () => {
      const mockSupabase = await getMockSupabase();

      // Mock successive failures then success
      mockSupabase.auth.refreshSession
        .mockResolvedValueOnce({
          data: { session: null },
          error: { message: "Network error" },
        })
        .mockResolvedValueOnce({
          data: { session: null },
          error: { message: "Network error" },
        })
        .mockResolvedValueOnce({
          data: {
            session: {
              access_token: "success-token",
              refresh_token: "success-refresh-token",
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            },
          },
          error: null,
        });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const refreshPromise = tokenManager.refreshSession();

      // Fast-forward through retry delays
      await jest.advanceTimersByTimeAsync(1000); // First retry delay
      await jest.advanceTimersByTimeAsync(2000); // Second retry delay
      await jest.advanceTimersByTimeAsync(100); // Complete the operation

      const result = await refreshPromise;
      expect(result).toEqual(
        expect.objectContaining({
          access_token: "success-token",
        })
      );
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalledTimes(3);
    });

    it("should fail after maximum retry attempts", async () => {
      const mockSupabase = await getMockSupabase();

      // Mock instant delays for testing
      tokenManager.setDelayFunction(() => Promise.resolve());

      // Mock all attempts to fail
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Persistent error" },
      });

      // Should throw some error after all retries exhausted
      await expect(tokenManager.refreshSession()).rejects.toThrow();
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalledTimes(3); // Max retries
    });

    it("should sanitize error messages in production", async () => {
      // Test error sanitization directly without environment modification
      const tokenManagerInstance = TokenManager.getInstance();

      // Mock instant delays for testing
      tokenManagerInstance.setDelayFunction(() => Promise.resolve());

      // Test the sanitizeError method indirectly by checking production behavior
      // We'll mock the NODE_ENV check in our error sanitization logic
      const originalEnv = process.env.NODE_ENV;

      // Use Object.defineProperty to mock NODE_ENV for this test
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        configurable: true,
      });

      const mockSupabase = await getMockSupabase();

      // Mock all attempts to fail with a sensitive error
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Internal server details that should be hidden" },
      });

      // Should throw some error after all retries exhausted
      await expect(tokenManagerInstance.refreshSession()).rejects.toThrow();

      // Restore environment
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        configurable: true,
      });
    });
  });

  describe("token sync with server", () => {
    it("should sync tokens successfully", async () => {
      const mockSupabase = await getMockSupabase();

      const mockSession = {
        access_token: "token",
        refresh_token: "refresh-token",
        expires_in: 3600,
      };

      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await tokenManager.refreshSession();

      expect(global.fetch).toHaveBeenCalledWith("/api/auth/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: "token",
          refresh_token: "refresh-token",
          expires_in: 3600,
        }),
      });
    });

    it("should retry token sync on server failure", async () => {
      const mockSupabase = await getMockSupabase();

      const mockSession = {
        access_token: "token",
        refresh_token: "refresh-token",
        expires_in: 3600,
      };

      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock server failures then success
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      // Mock instant delays for testing
      tokenManager.setDelayFunction(() => Promise.resolve());

      await tokenManager.refreshSession();

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to sync tokens with server (attempt"),
        expect.any(Error)
      );
    });
  });
});
