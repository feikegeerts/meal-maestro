import { renderHook, waitFor, render } from "@testing-library/react";
import { act } from "react";
import { AuthProvider, useAuth } from "../auth-context";
import { server } from "../../__mocks__/server";
import { http, HttpResponse } from "msw";

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
    // Mock console.error to suppress error messages in tests
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error
    consoleErrorSpy.mockRestore();
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
      let result:
        | import("@testing-library/react").RenderHookResult<
            ReturnType<typeof useAuth>,
            { children: React.ReactNode }
          >
        | undefined;
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
      let result:
        | import("@testing-library/react").RenderHookResult<
            ReturnType<typeof useAuth>,
            { children: React.ReactNode }
          >
        | undefined;
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
      let result:
        | import("@testing-library/react").RenderHookResult<
            ReturnType<typeof useAuth>,
            { children: React.ReactNode }
          >
        | undefined;
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
      let result:
        | import("@testing-library/react").RenderHookResult<
            ReturnType<typeof useAuth>,
            { children: React.ReactNode }
          >
        | undefined;
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

      let result:
        | import("@testing-library/react").RenderHookResult<
            ReturnType<typeof useAuth>,
            { children: React.ReactNode }
          >
        | undefined;
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

      let result:
        | import("@testing-library/react").RenderHookResult<
            ReturnType<typeof useAuth>,
            { children: React.ReactNode }
          >
        | undefined;
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

      let result:
        | import("@testing-library/react").RenderHookResult<
            ReturnType<typeof useAuth>,
            { children: React.ReactNode }
          >
        | undefined;

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

      let result:
        | import("@testing-library/react").RenderHookResult<
            ReturnType<typeof useAuth>,
            { children: React.ReactNode }
          >
        | undefined;

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

      let result:
        | import("@testing-library/react").RenderHookResult<
            ReturnType<typeof useAuth>,
            { children: React.ReactNode }
          >
        | undefined;

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
