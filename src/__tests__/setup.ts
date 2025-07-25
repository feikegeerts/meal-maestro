// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// Ensure Supabase client is always mocked in tests
jest.mock("../lib/supabase");
import "@testing-library/jest-dom";

// React.act compatibility is handled by react-act-polyfill.js
import { configure } from '@testing-library/react';

// Configure testing library with better CI compatibility
configure({ 
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 15000, // Increased timeout for CI
});

// Set up test environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-anon-key";

import { server } from "../__mocks__/server";

// Mock only the OAuth navigation part of Supabase to prevent window.location issues
// Let MSW handle the actual API responses for testing different scenarios

// Helper to simulate .single() and .update() with MSW-backed fetch
const single = async function () {
  // Simulate a fetch to the MSW handler for user_profiles
  const id = this._eq?.val || "test-user-id";
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_profiles?id=eq.${id}`
  );
  if (!response.ok) {
    return {
      data: null,
      error: { message: "Profile fetch failed", status: response.status },
    };
  }
  const arr = await response.json();
  if (!arr || !Array.isArray(arr) || arr.length === 0) {
    return { data: null, error: null };
  }
  return { data: arr[0], error: null };
};

const update = function () {
  // Return an object with .single() that simulates update+fetch
  return {
    single: async () => {
      // Simulate a PATCH to the MSW handler for user_profiles
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_profiles`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this._updates || {}),
        }
      );
      if (!response.ok) {
        return {
          data: null,
          error: { message: "Profile update failed", status: response.status },
        };
      }
      const arr = await response.json();
      if (!arr || !Array.isArray(arr) || arr.length === 0) {
        return { data: null, error: null };
      }
      return { data: arr[0], error: null };
    },
    _updates: this._updates,
  };
};

const from = function () {
  return {
    select: function () {
      return this;
    },
    eq: function (col, val) {
      this._eq = { col, val };
      return this;
    },
    single: single,
    update: function (updates) {
      this._updates = updates;
      return update.call(this);
    },
    insert: function () {
      return this;
    },
    _eq: null,
    _updates: null,
  };
};

const mockSupabaseClient = {
  auth: {
    signInWithOAuth: jest.fn().mockResolvedValue({
      data: { url: "https://mock-oauth-url.com" },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({
      error: null,
    }),
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: "test-user", email: "test@example.com" } },
      error: null,
    }),
    getSession: jest.fn().mockResolvedValue({
      data: { session: { access_token: "mock-token" } },
      error: null,
    }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    }),
  },
  from,
};

const auth = {
  signInWithGoogle: jest.fn().mockImplementation(async () => {
    const isLocalhost =
      global.window?.location?.hostname === "localhost" ||
      global.window?.location?.hostname === "127.0.0.1";
    const redirectTo = isLocalhost
      ? "http://localhost:3000/auth/callback"
      : `${global.window?.location?.origin}/auth/callback`;

    return mockSupabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }),
  signOut: jest
    .fn()
    .mockImplementation(() => mockSupabaseClient.auth.signOut()),
  getCurrentUser: jest.fn().mockImplementation(async () => {
    try {
      // Use MSW to handle the HTTP request, but with our mock responses
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
        {
          headers: {
            Authorization: "Bearer mock-token",
          },
        }
      );
      if (!response.ok) {
        return {
          user: null,
          error: { message: "User fetch failed", status: response.status },
        };
      }
      const user = await response.json();
      return { user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  }),
  getCurrentSession: jest.fn().mockImplementation(async () => {
    try {
      // Use MSW to handle the HTTP request
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token`,
        {
          headers: {
            Authorization: "Bearer mock-token",
          },
        }
      );
      if (!response.ok) {
        return {
          session: null,
          error: { message: "Session fetch failed", status: response.status },
        };
      }
      const sessionData = await response.json();
      return { session: sessionData, error: null };
    } catch (error) {
      return { session: null, error };
    }
  }),
  onAuthStateChange: jest
    .fn()
    .mockImplementation((callback) =>
      mockSupabaseClient.auth.onAuthStateChange(callback)
    ),
};

module.exports = {
  supabase: mockSupabaseClient,
  auth,
  __esModule: true,
  default: { supabase: mockSupabaseClient, auth },
};
// Establish API mocking before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => {
  server.resetHandlers();
  assignMock.mockClear();
  // Clear any pending timers between tests
  jest.clearAllTimers();
});

// Clean up after the tests are finished
afterAll(() => {
  server.close();
});

// Mock window.location with minimal properties to avoid JSDOM navigation errors
const assignMock = jest.fn();

// Suppress the JSDOM navigation error before attempting to mock location
const originalConsoleError = console.error;
console.error = (message: unknown, ...args: unknown[]) => {
  if (
    typeof message === "object" &&
    message &&
    "type" in message &&
    "message" in message &&
    (message as { type: string; message: string }).type === "not implemented" &&
    (message as { message: string }).message.includes("navigation")
  ) {
    return; // Suppress navigation errors
  }
  if (
    typeof message === "string" &&
    message.includes("Not implemented: navigation")
  ) {
    return; // Suppress navigation errors
  }
  originalConsoleError(message, ...args);
};

// Now safely delete and redefine location
delete (window as unknown as Record<string, unknown>).location;
(window as unknown as Record<string, unknown>).location = {
  assign: assignMock,
  hostname: "localhost",
  origin: "http://localhost:3000",
  href: "http://localhost:3000",
  protocol: "http:",
  host: "localhost:3000",
  pathname: "/",
  search: "",
  hash: "",
  port: "3000",
  replace: jest.fn(),
  reload: jest.fn(),
  toString: () => "http://localhost:3000",
};

// Restore console.error temporarily
console.error = originalConsoleError;

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock WebCrypto API for PKCE
Object.defineProperty(global, "crypto", {
  value: {
    getRandomValues: (arr: Uint8Array) =>
      arr.map(() => Math.floor(Math.random() * 256)),
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
  },
});

// Suppress JSDOM navigation errors globally
const originalError = console.error;

beforeAll(() => {
  // Mock console.error to filter out specific JSDOM navigation errors
  console.error = (...args: unknown[]) => {
    // Filter out JSDOM navigation error
    const errorMessage = args[0];
    if (
      errorMessage &&
      typeof errorMessage === "object" &&
      "type" in errorMessage &&
      "message" in errorMessage
    ) {
      if (
        (errorMessage as { type: string; message: string }).type ===
          "not implemented" &&
        (errorMessage as { message: string }).message &&
        (errorMessage as { message: string }).message.includes("navigation")
      ) {
        return; // Suppress this specific error
      }
    }

    // Filter out string-based navigation errors
    if (
      typeof errorMessage === "string" &&
      errorMessage.includes("Not implemented: navigation")
    ) {
      return;
    }

    // Suppress React dev warnings during tests
    if (typeof errorMessage === "string") {
      if (
        errorMessage.includes("Warning: ReactDOM.render is deprecated") ||
        errorMessage.includes(
          "An update to AuthProvider inside a test was not wrapped in act(...)"
        ) ||
        errorMessage.includes("WebCrypto API is not supported")
      ) {
        return;
      }
    }

    // Allow all other errors through
    originalError.call(console, ...args);
  };

  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => {
  console.error = originalError;
  server.close();
  // Clean up any remaining timers or async operations
  jest.clearAllTimers();
});
