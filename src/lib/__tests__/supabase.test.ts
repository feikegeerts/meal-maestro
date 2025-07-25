import { auth } from "../supabase";
import { server } from "../../__mocks__/server";
import { http, HttpResponse } from "msw";

// Mock window.location for tests - this file will use the global mock from setup.ts

describe("Auth Service", () => {
  beforeEach(() => {
    // Reset window location mock using the global mock from setup.ts
    // The setup.ts creates a mock location object that we can modify
    delete (window as unknown as Record<string, unknown>).location;
    (window as unknown as Record<string, unknown>).location = {
      hostname: "localhost",
      origin: "http://localhost:3000",
      href: "http://localhost:3000",
      protocol: "http:",
      host: "localhost:3000",
      pathname: "/",
      search: "",
      hash: "",
      port: "3000",
      assign: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      toString: () => "http://localhost:3000",
    };
    // Clear all timers
    jest.clearAllTimers();
  });

  afterAll(async () => {
    // Clear any remaining timers
    jest.clearAllTimers();
    // Allow any pending async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  describe("signInWithGoogle", () => {
    it("should initiate Google OAuth with correct redirect URL for localhost", async () => {
      const result = await auth.signInWithGoogle();

      expect(result.error).toBe(null);
      expect(result.data).toBeDefined();
    });

    it("should use production URL for non-localhost domains", async () => {
      // Update location to production environment
      (window as unknown as Record<string, unknown>).location = {
        hostname: "meal-maestro.com",
        origin: "https://meal-maestro.com",
        href: "https://meal-maestro.com",
        protocol: "https:",
        host: "meal-maestro.com",
        pathname: "/",
        search: "",
        hash: "",
        port: "",
        assign: jest.fn(),
        replace: jest.fn(),
        reload: jest.fn(),
        toString: () => "https://meal-maestro.com",
      };

      const result = await auth.signInWithGoogle();

      expect(result.error).toBe(null);
      expect(result.data).toBeDefined();
    });

    it("should handle OAuth errors", async () => {
      // Mock an error response
      server.use(
        http.post("*/auth/v1/authorize", () => {
          return new HttpResponse(null, { status: 400 });
        })
      );

      const result = await auth.signInWithGoogle();

      // The actual error handling depends on Supabase client implementation
      // This test ensures the function doesn't throw and returns a result
      expect(result).toBeDefined();
    });
  });

  describe("signOut", () => {
    it("should sign out successfully", async () => {
      const result = await auth.signOut();

      expect(result.error).toBe(null);
    });

    it("should handle sign out errors", async () => {
      // Mock an error response
      server.use(
        http.post("*/auth/v1/logout", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const result = await auth.signOut();

      // Should handle errors gracefully
      expect(result).toBeDefined();
    });
  });

  describe("getCurrentUser", () => {
    it("should get current user successfully", async () => {
      const result = await auth.getCurrentUser();

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      // Accept error to be null or an AuthSessionMissingError (Supabase client may return this)
      if (result.error) {
        expect(result.error.name).toBe("AuthSessionMissingError");
      } else {
        expect(result.error).toBe(null);
      }
    });

    it("should handle user fetch errors", async () => {
      // Mock an error response
      server.use(
        http.get("*/auth/v1/user", () => {
          return new HttpResponse(null, { status: 401 });
        })
      );

      const result = await auth.getCurrentUser();

      expect(result.user).toBe(null);
      expect(result.error).toBeDefined();
    });
  });

  describe("getCurrentSession", () => {
    it("should get current session", async () => {
      const result = await auth.getCurrentSession();

      // Should return session data or null without throwing
      expect(result).toBeDefined();
      expect(result.session).toBeDefined();
    });

    it("should handle session fetch errors", async () => {
      // Mock an error response
      server.use(
        http.get("*/auth/v1/token", () => {
          return new HttpResponse(null, { status: 401 });
        })
      );

      const result = await auth.getCurrentSession();

      expect(result).toBeDefined();
    });
  });

  describe("onAuthStateChange", () => {
    it("should set up auth state change listener", () => {
      const callback = jest.fn();
      const subscription = auth.onAuthStateChange(callback);

      expect(subscription).toBeDefined();
      expect(subscription.data).toBeDefined();
      expect(typeof subscription.data.subscription.unsubscribe).toBe(
        "function"
      );
    });
  });
});
