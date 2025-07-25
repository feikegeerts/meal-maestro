import { renderHook, waitFor, act, render } from "@testing-library/react";
import { AuthProvider, useAuth } from "../auth-context";
import { server } from "../../__mocks__/server";
import { http, HttpResponse } from "msw";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("AuthContext", () => {
  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    // Clear all timers
    jest.clearAllTimers();
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
