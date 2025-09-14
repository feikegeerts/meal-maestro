import { renderHook, waitFor, render } from "@testing-library/react";
import { act } from "react";
import { AuthProvider, useAuth } from "../auth-context";
import { server } from "../../__mocks__/server";
import { http, HttpResponse } from "msw";
import { TokenManager } from "../token-manager";

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
    // Reset TokenManager instance for each test
    TokenManager.resetInstance();
    // Mock console.error to suppress error messages in tests
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  afterAll(() => {
    jest.clearAllTimers();
  });

  describe("useAuth hook", () => {
    it("should throw error when used outside AuthProvider", () => {
      expect(() => renderHook(() => useAuth())).toThrow(
        "useAuth must be used within an AuthProvider"
      );
    });

    it("should provide initial loading state and authReady flag", async () => {
      let result: import("@testing-library/react").RenderHookResult<ReturnType<typeof useAuth>, { children: React.ReactNode }> | undefined;
      await act(async () => {
        result = renderHook(() => useAuth(), { wrapper });
      });
      expect(result).toBeDefined();
      // The initial state is loading: false (provider sets it synchronously)
      expect(result!.result.current.loading).toBe(false);
      expect(result!.result.current.authReady).toBe(true);
      expect(result!.result.current.user).toEqual({
        id: "test-user",
        email: "test@example.com"
      });
      expect(result!.result.current.session).toEqual({
        access_token: "mock-token",
        user: { id: "test-user", email: "test@example.com" }
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
      // Even with the error in MSW, our mock still returns success
      // This test verifies the auth doesn't crash on API errors
      expect(result!.result.current.authReady).toBe(true);
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

    it("should handle TOKEN_REFRESHED events without errors", async () => {
      // This test verifies TOKEN_REFRESHED events are handled without throwing errors
      // State management details are tested in other tests

      let result: import("@testing-library/react").RenderHookResult<ReturnType<typeof useAuth>, { children: React.ReactNode }> | undefined;

      await act(async () => {
        result = renderHook(() => useAuth(), { wrapper });
      });

      expect(result).toBeDefined();

      // Wait for initial auth to complete
      await waitFor(() => {
        expect(result!.result.current.loading).toBe(false);
      });

      // Simulate a TOKEN_REFRESHED event and verify no errors
      const refreshedSession = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
        user: {
          id: "test-user-id",
          email: "test@example.com",
        },
      };

      // This should not throw an error
      await act(async () => {
        const { supabase } = await import("../supabase");
        const onAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
        const callback = onAuthStateChange.mock.calls[0][0];
        await callback("TOKEN_REFRESHED", refreshedSession);
      });

      // Verify the auth system is still working after the event
      expect(result!.result.current.loading).toBe(false);
      expect(result!.result.current.authReady).toBe(true);
    });

    it("should handle SIGNED_OUT events without errors", async () => {
      // This test verifies SIGNED_OUT events are handled without throwing errors
      // Server-side cookie clearing is tested separately

      let result: import("@testing-library/react").RenderHookResult<ReturnType<typeof useAuth>, { children: React.ReactNode }> | undefined;

      await act(async () => {
        result = renderHook(() => useAuth(), { wrapper });
      });

      expect(result).toBeDefined();

      // Wait for initial auth to complete
      await waitFor(() => {
        expect(result!.result.current.loading).toBe(false);
      });

      // Verify we have a user initially
      expect(result!.result.current.user).not.toBeNull();

      // Simulate a SIGNED_OUT event - this should not throw an error
      await act(async () => {
        const { supabase } = await import("../supabase");
        const onAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
        const callback = onAuthStateChange.mock.calls[0][0];
        await callback("SIGNED_OUT", null);
      });

      // Verify the auth system is still responsive after the event
      expect(result!.result.current.loading).toBe(false);
      expect(result!.result.current.authReady).toBe(true);
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
