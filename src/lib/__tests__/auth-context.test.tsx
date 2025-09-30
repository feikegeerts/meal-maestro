import { renderHook, waitFor, render } from "@testing-library/react";
import { act } from "react";
import { AuthProvider, useAuth } from "../auth-context";
import { auth, supabase } from "../supabase";
import { server } from "../../__mocks__/server";
import { http, HttpResponse } from "msw";
import { profileService } from "../profile-service";

jest.mock("../profile-service", () => ({
  profileService: {
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
  },
}));

const mockProfileService = profileService as jest.Mocked<typeof profileService>;

const setNodeEnv = (value: string) => {
  const originalValue = process.env.NODE_ENV;

  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    configurable: true,
    writable: true,
  });

  return () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalValue,
      configurable: true,
      writable: true,
    });
  };
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("AuthContext", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    // Clear all timers
    jest.clearAllTimers();
    mockProfileService.getUserProfile.mockReset();
    mockProfileService.updateUserProfile.mockReset();
    mockProfileService.getUserProfile.mockResolvedValue(null);
    mockProfileService.updateUserProfile.mockResolvedValue(null);
    // Mock console.error to suppress error messages in tests
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error
    consoleErrorSpy.mockRestore();
    mockProfileService.getUserProfile.mockReset();
    mockProfileService.updateUserProfile.mockReset();
  });

  afterAll(async () => {
    jest.clearAllTimers();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  describe("useAuth hook", () => {
    it("should throw error when used outside AuthProvider", () => {
      expect(() => renderHook(() => useAuth())).toThrow(
        "useAuth must be used within an AuthProvider"
      );
    });

    it("should provide initial loading state", async () => {
      let result: import("@testing-library/react").RenderHookResult<ReturnType<typeof useAuth>, { children: React.ReactNode }> | undefined;
      await act(async () => {
        result = renderHook(() => useAuth(), { wrapper });
      });
      expect(result).toBeDefined();
      // The initial state is loading: false (provider sets it synchronously)
      expect(result!.result.current.loading).toBe(false);
      expect(result!.result.current.user).toBe(null);
      expect(result!.result.current.session).toEqual({
        access_token: "mock-token",
      });
      expect(result!.result.current.profile).toBe(null);
    });

    it("should handle successful authentication", async () => {
      let result: import("@testing-library/react").RenderHookResult<ReturnType<typeof useAuth>, { children: React.ReactNode }> | undefined;
      await act(async () => {
        result = renderHook(() => useAuth(), { wrapper });
      });
      expect(result).toBeDefined();
      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result!.result.current.loading).toBe(false);
      });
      // Since we have a mock user in our setup, expect authenticated state
      expect(result!.result.current.user).toBeDefined();
      // session may be not null, but profile is null in this mock
      expect(result!.result.current.session).not.toBe(null);
      expect(result!.result.current.profile).toBe(null);
    });

    it("should handle sign in with Google", async () => {
      let result: import("@testing-library/react").RenderHookResult<ReturnType<typeof useAuth>, { children: React.ReactNode }> | undefined;
      await act(async () => {
        result = renderHook(() => useAuth(), { wrapper });
      });
      expect(result).toBeDefined();
      await waitFor(() => {
        expect(result!.result.current.loading).toBe(false);
      });
      let signInResult: { error: unknown; data: unknown } | undefined;
      await act(async () => {
        signInResult = await result!.result.current.signInWithGoogle();
      });
      expect(signInResult).toBeDefined();
      expect(signInResult!.error).toBe(null);
      expect(signInResult!.data).toBeDefined();
    });

    it("should handle sign out", async () => {
      let result: import("@testing-library/react").RenderHookResult<ReturnType<typeof useAuth>, { children: React.ReactNode }> | undefined;
      await act(async () => {
        result = renderHook(() => useAuth(), { wrapper });
      });
      expect(result).toBeDefined();
      await waitFor(() => {
        expect(result!.result.current.loading).toBe(false);
      });
      let signOutResult: { error: unknown } | undefined;
      await act(async () => {
        signOutResult = await result!.result.current.signOut();
      });
      expect(signOutResult).toBeDefined();
      expect(signOutResult!.error).toBe(null);
    });

    it("should handle authentication errors", async () => {
      // Mock an error response
      server.use(
        http.get("*/auth/v1/user", () => {
          return new HttpResponse(null, { status: 401 });
        })
      );

      let result: import("@testing-library/react").RenderHookResult<ReturnType<typeof useAuth>, { children: React.ReactNode }> | undefined;
      await act(async () => {
        result = renderHook(() => useAuth(), { wrapper });
      });
      expect(result).toBeDefined();
      await waitFor(() => {
        expect(result!.result.current.loading).toBe(false);
      });
      // With the error, should be unauthenticated
      expect(result!.result.current.user).toBe(null);
    });

    it("should handle profile loading errors gracefully", async () => {
      // Mock user but profile error
      server.use(
        http.get("*/rest/v1/user_profiles*", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      let result: import("@testing-library/react").RenderHookResult<ReturnType<typeof useAuth>, { children: React.ReactNode }> | undefined;
      await act(async () => {
        result = renderHook(() => useAuth(), { wrapper });
      });
      expect(result).toBeDefined();
      await waitFor(() => {
        expect(result!.result.current.loading).toBe(false);
      });
      // Should handle profile loading error gracefully
      expect(result!.result.current.profile).toBe(null);
    });

    it("should handle TOKEN_REFRESHED events and sync tokens", async () => {
      const mockSetSession = jest.fn().mockResolvedValue({ success: true });

      // Mock the /api/auth/set-session endpoint
      server.use(
        http.post("/api/auth/set-session", async ({ request }) => {
          const data = await request.json();
          mockSetSession(data);
          return HttpResponse.json({ success: true });
        })
      );

      let result: import("@testing-library/react").RenderHookResult<ReturnType<typeof useAuth>, { children: React.ReactNode }> | undefined;

      await act(async () => {
        result = renderHook(() => useAuth(), { wrapper });
      });

      expect(result).toBeDefined();

      // Wait for initial auth to complete
      await waitFor(() => {
        expect(result!.result.current.loading).toBe(false);
      });

      // Simulate a TOKEN_REFRESHED event
      const refreshedSession = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
        user: {
          id: "test-user-id",
          email: "test@example.com",
        },
      };

      await act(async () => {
        // Trigger the auth state change listener with TOKEN_REFRESHED
        const { supabase } = await import("../supabase");
        const onAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
        const callback = onAuthStateChange.mock.calls[0][0];
        await callback("TOKEN_REFRESHED", refreshedSession);
      });

      // Wait for the token sync to complete
      await waitFor(() => {
        expect(mockSetSession).toHaveBeenCalledWith({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
        });
      });
    });

    it("should handle SIGNED_OUT events and clear server cookies", async () => {
      const mockSignOut = jest.fn().mockResolvedValue({ success: true });

      // Mock the /api/auth/sign-out endpoint
      server.use(
        http.post("/api/auth/sign-out", () => {
          mockSignOut();
          return HttpResponse.json({ success: true });
        })
      );

      let result: import("@testing-library/react").RenderHookResult<ReturnType<typeof useAuth>, { children: React.ReactNode }> | undefined;

      await act(async () => {
        result = renderHook(() => useAuth(), { wrapper });
      });

      expect(result).toBeDefined();

      // Wait for initial auth to complete
      await waitFor(() => {
        expect(result!.result.current.loading).toBe(false);
      });

      // Simulate a SIGNED_OUT event
      await act(async () => {
        const { supabase } = await import("../supabase");
        const onAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
        const callback = onAuthStateChange.mock.calls[0][0];
        await callback("SIGNED_OUT", null);
      });

      // Wait for the sign out to complete
      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it("should retry token sync on failure", async () => {
      const retryCallCounts: number[] = [];
      let retryAttempts = 0;

      // Mock the /api/auth/set-session endpoint to fail twice, then succeed
      server.use(
        http.post("/api/auth/set-session", async ({ request }) => {
          const data = (await request.json()) as { access_token?: string };

          // Only count calls for our specific test token
          if (data?.access_token === "retry-test-token") {
            retryAttempts++;
            retryCallCounts.push(retryAttempts);

            if (retryAttempts <= 2) {
              return new HttpResponse(null, { status: 500 });
            }

            return HttpResponse.json({ success: true });
          }

          // Let other calls through
          return HttpResponse.json({ success: true });
        })
      );

      let result: import("@testing-library/react").RenderHookResult<ReturnType<typeof useAuth>, { children: React.ReactNode }> | undefined;

      await act(async () => {
        result = renderHook(() => useAuth(), { wrapper });
      });

      expect(result).toBeDefined();

      // Wait for initial auth to complete
      await waitFor(() => {
        expect(result!.result.current.loading).toBe(false);
      });

      // Use fake timers for this specific test
      jest.useFakeTimers();

      // Simulate a TOKEN_REFRESHED event with our test token
      const refreshedSession = {
        access_token: "retry-test-token",
        refresh_token: "retry-test-refresh-token",
        expires_in: 3600,
        user: {
          id: "test-user-id",
          email: "test@example.com",
        },
      };

      // Start the token refresh process
      const { supabase } = await import("../supabase");
      const onAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
      const callback = onAuthStateChange.mock.calls[0][0];

      // Trigger the callback without awaiting to let it run in background
      callback("TOKEN_REFRESHED", refreshedSession);

      // Fast-forward through the retry delays
      await act(async () => {
        // First attempt should happen immediately
        await jest.advanceTimersByTimeAsync(100);

        // Advance through first retry delay (1s)
        await jest.advanceTimersByTimeAsync(1000);

        // Advance through second retry delay (2s)
        await jest.advanceTimersByTimeAsync(2000);

        // Give a bit more time for async operations
        await jest.advanceTimersByTimeAsync(100);
      });

      // Verify exactly 3 attempts were made for our test token
      expect(retryAttempts).toBe(3);
      expect(retryCallCounts).toEqual([1, 2, 3]);

      jest.useRealTimers();
    });

    it("should prevent overlapping refresh attempts via the global lock", async () => {
      const restoreEnv = setNodeEnv("production");
      jest.useFakeTimers();

      const getCurrentSessionMock = auth.getCurrentSession as jest.Mock;
      const originalGetCurrentSession = getCurrentSessionMock.getMockImplementation();

      const supabaseAuth = supabase.auth as unknown as {
        getSession: jest.Mock;
        refreshSession?: jest.Mock;
      };
      const getSessionMock = supabaseAuth.getSession;
      const originalGetSession = getSessionMock.getMockImplementation();
      const originalRefreshSession = supabaseAuth.refreshSession;

      const baseSession = {
        access_token: "initial-access",
        refresh_token: "initial-refresh",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 60,
        user: {
          id: "refresh-lock-user",
          email: "lock@test.com",
        },
      };

      getCurrentSessionMock.mockImplementation(async () => ({
        session: baseSession,
        error: null,
      }));

      getSessionMock.mockImplementation(async () => ({
        data: { session: baseSession },
        error: null,
      }));

      const refreshedSession = {
        access_token: "refresh-access",
        refresh_token: "refresh-refresh",
        expires_in: 3600,
        user: {
          id: "refresh-lock-user",
          email: "lock@test.com",
        },
      };

      let resolveRefresh!: (value: unknown) => void;
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });

      const refreshSessionMock = jest.fn().mockImplementation(() => refreshPromise);
      supabaseAuth.refreshSession = refreshSessionMock;

      const tokenSyncCalls: Array<{ access_token: string }> = [];
      server.use(
        http.post("/api/auth/set-session", async ({ request }) => {
          const payload = (await request.json()) as { access_token: string };
          tokenSyncCalls.push(payload);
          return HttpResponse.json({ success: true });
        })
      );

      let result: import("@testing-library/react").RenderHookResult<ReturnType<typeof useAuth>, { children: React.ReactNode }> | undefined;

      try {
        await act(async () => {
          result = renderHook(() => useAuth(), { wrapper });
        });

        expect(result).toBeDefined();

        await waitFor(() => {
          expect(result!.result.current.loading).toBe(false);
        });

        await act(async () => {
          await jest.advanceTimersByTimeAsync(10 * 60 * 1000);
        });

        await act(async () => {
          await jest.advanceTimersByTimeAsync(10 * 60 * 1000);
        });

        resolveRefresh({
          data: { session: refreshedSession },
          error: null,
        });

        await waitFor(() => {
          const refreshSyncs = tokenSyncCalls.filter(
            (call) => call.access_token === "refresh-access"
          );
          expect(refreshSyncs).toHaveLength(1);
        });

        expect(refreshSessionMock).toHaveBeenCalledTimes(1);
      } finally {
        jest.useRealTimers();
        restoreEnv();

        if (originalGetCurrentSession) {
          getCurrentSessionMock.mockImplementation(originalGetCurrentSession);
        } else {
          getCurrentSessionMock.mockReset();
        }

        if (originalGetSession) {
          getSessionMock.mockImplementation(originalGetSession);
        } else {
          getSessionMock.mockReset();
        }

        if (originalRefreshSession) {
          supabaseAuth.refreshSession = originalRefreshSession;
        } else {
          delete supabaseAuth.refreshSession;
        }
      }
    });

    it("should recover when Supabase returns an 'Already Used' refresh error", async () => {
      const restoreEnv = setNodeEnv("production");
      jest.useFakeTimers();

      const getCurrentSessionMock = auth.getCurrentSession as jest.Mock;
      const originalGetCurrentSession = getCurrentSessionMock.getMockImplementation();

      const supabaseAuth = supabase.auth as unknown as {
        getSession: jest.Mock;
        refreshSession?: jest.Mock;
      };
      const getSessionMock = supabaseAuth.getSession;
      const originalGetSession = getSessionMock.getMockImplementation();
      const originalRefreshSession = supabaseAuth.refreshSession;

      const aboutToExpireSession = {
        access_token: "about-to-expire",
        refresh_token: "about-to-expire-refresh",
        expires_in: 60,
        expires_at: Math.floor(Date.now() / 1000) + 30,
        user: {
          id: "already-used-user",
          email: "already@example.com",
        },
      };

      const recoveredSession = {
        access_token: "recovered-access",
        refresh_token: "recovered-refresh",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: "already-used-user",
          email: "already@example.com",
        },
      };

      getCurrentSessionMock.mockImplementation(async () => ({
        session: aboutToExpireSession,
        error: null,
      }));

      getSessionMock
        .mockImplementationOnce(async () => ({
          data: { session: aboutToExpireSession },
          error: null,
        }))
        .mockImplementationOnce(async () => ({
          data: { session: recoveredSession },
          error: null,
        }));

      const refreshSessionMock = jest.fn().mockResolvedValue({
        data: { session: null },
        error: { message: "Refresh Token Already Used", status: 400 },
      });
      supabaseAuth.refreshSession = refreshSessionMock;

      const tokenSyncCalls: Array<{ access_token: string }> = [];
      server.use(
        http.post("/api/auth/set-session", async ({ request }) => {
          const payload = (await request.json()) as { access_token: string };
          tokenSyncCalls.push(payload);
          return HttpResponse.json({ success: true });
        })
      );

      const signOutSpy = auth.signOut as jest.Mock;
      signOutSpy.mockClear();

      let result: import("@testing-library/react").RenderHookResult<ReturnType<typeof useAuth>, { children: React.ReactNode }> | undefined;

      try {
        await act(async () => {
          result = renderHook(() => useAuth(), { wrapper });
        });

        expect(result).toBeDefined();

        await waitFor(() => {
          expect(result!.result.current.loading).toBe(false);
        });

        await act(async () => {
          await jest.advanceTimersByTimeAsync(10 * 60 * 1000);
        });

        await waitFor(() => {
          const recoveredSyncs = tokenSyncCalls.filter(
            (call) => call.access_token === "recovered-access"
          );
          expect(recoveredSyncs).toHaveLength(1);
        });

        expect(refreshSessionMock).toHaveBeenCalledTimes(1);
        expect(signOutSpy).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
        restoreEnv();

        if (originalGetCurrentSession) {
          getCurrentSessionMock.mockImplementation(originalGetCurrentSession);
        } else {
          getCurrentSessionMock.mockReset();
        }

        if (originalGetSession) {
          getSessionMock.mockImplementation(originalGetSession);
        } else {
          getSessionMock.mockReset();
        }

        if (originalRefreshSession) {
          supabaseAuth.refreshSession = originalRefreshSession;
        } else {
          delete supabaseAuth.refreshSession;
        }
      }
    });

    it("should sign the user out when refresh attempts keep failing", async () => {
      const restoreEnv = setNodeEnv("production");
      jest.useFakeTimers();

      const getCurrentSessionMock = auth.getCurrentSession as jest.Mock;
      const originalGetCurrentSession = getCurrentSessionMock.getMockImplementation();

      const supabaseAuth = supabase.auth as unknown as {
        getSession: jest.Mock;
        refreshSession?: jest.Mock;
      };
      const getSessionMock = supabaseAuth.getSession;
      const originalGetSession = getSessionMock.getMockImplementation();
      const originalRefreshSession = supabaseAuth.refreshSession;

      const failingSession = {
        access_token: "failing-access",
        refresh_token: "failing-refresh",
        expires_in: 60,
        expires_at: Math.floor(Date.now() / 1000) + 30,
        user: {
          id: "failing-user",
          email: "failing@example.com",
        },
      };

      getCurrentSessionMock.mockImplementation(async () => ({
        session: failingSession,
        error: null,
      }));

      getSessionMock.mockImplementation(async () => ({
        data: { session: failingSession },
        error: null,
      }));

      const refreshSessionMock = jest.fn().mockResolvedValue({
        data: { session: null },
        error: { message: "Refresh failed", status: 401 },
      });
      supabaseAuth.refreshSession = refreshSessionMock;

      const serverSignOut = jest.fn();
      server.use(
        http.post("/api/auth/sign-out", () => {
          serverSignOut();
          return HttpResponse.json({ success: true });
        })
      );

      const signOutSpy = auth.signOut as jest.Mock;
      signOutSpy.mockClear();

      let result: import("@testing-library/react").RenderHookResult<ReturnType<typeof useAuth>, { children: React.ReactNode }> | undefined;

      try {
        await act(async () => {
          result = renderHook(() => useAuth(), { wrapper });
        });

        expect(result).toBeDefined();

        await waitFor(() => {
          expect(result!.result.current.loading).toBe(false);
        });

        await act(async () => {
          await jest.advanceTimersByTimeAsync(10 * 60 * 1000);
        });

        await waitFor(() => {
          expect(signOutSpy).toHaveBeenCalled();
          expect(serverSignOut).toHaveBeenCalled();
        });

        expect(result!.result.current.user).toBeNull();
        expect(result!.result.current.session).toBeNull();
      } finally {
        jest.useRealTimers();
        restoreEnv();

        if (originalGetCurrentSession) {
          getCurrentSessionMock.mockImplementation(originalGetCurrentSession);
        } else {
          getCurrentSessionMock.mockReset();
        }

        if (originalGetSession) {
          getSessionMock.mockImplementation(originalGetSession);
        } else {
          getSessionMock.mockReset();
        }

        if (originalRefreshSession) {
          supabaseAuth.refreshSession = originalRefreshSession;
        } else {
          delete supabaseAuth.refreshSession;
        }
      }
    });

  });

  describe("AuthProvider", () => {
    it("should provide auth context to children", async () => {
      const TestComponent = () => {
        const auth = useAuth();
        return (
          <div data-testid="auth-status">
            {auth.loading ? "loading" : "loaded"}
          </div>
        );
      };

      let result: ReturnType<typeof render>;
      await act(async () => {
        result = render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });
      // Wait for the component to update after async state
      await waitFor(() => {
        expect(result.getByTestId("auth-status")).toBeInTheDocument();
      });
    });
  });
});
