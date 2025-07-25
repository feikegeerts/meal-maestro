import "@testing-library/jest-dom";

// Set up test environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-anon-key";

import { server } from "../__mocks__/server";

// Mock only the OAuth navigation part of Supabase to prevent window.location issues
// Let MSW handle the actual API responses for testing different scenarios

jest.mock("../lib/supabase", () => {
  // Import the real module first to get the actual implementation
  const actualSupabase = jest.requireActual("../lib/supabase");

  // Create a mock Supabase client that uses MSW for HTTP calls
  const mockSupabaseClient = {
    from: jest.fn().mockImplementation((table: string) => {
      let currentUserId = "test-user-id";
      let updateData = {};

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation((column: string, value: string) => {
          if (column === "id") {
            currentUserId = value;
          }
          return mockQuery;
        }),
        single: jest.fn().mockImplementation(async () => {
          // This will trigger MSW handlers with proper headers
          const response = await fetch(
            `https://test.supabase.co/rest/v1/${table}?id=eq.${currentUserId}&select=*`,
            {
              headers: {
                Accept: "application/vnd.pgrst.object+json",
                Prefer: "return=representation",
                apikey: "test-anon-key",
                Authorization: "Bearer test-anon-key",
              },
            }
          );

          if (!response.ok) {
            return {
              data: null,
              error: { message: "Error", details: response.statusText },
            };
          }

          const data = await response.json();
          return { data, error: null };
        }),
        update: jest
          .fn()
          .mockImplementation((updates: Record<string, unknown>) => {
            updateData = updates;
            return {
              eq: jest
                .fn()
                .mockImplementation((column: string, value: string) => {
                  if (column === "id") {
                    currentUserId = value;
                  }
                  return {
                    select: jest.fn().mockReturnThis(),
                    single: jest.fn().mockImplementation(async () => {
                      // This will trigger MSW handlers for PATCH requests
                      const response = await fetch(
                        `https://test.supabase.co/rest/v1/${table}?id=eq.${currentUserId}`,
                        {
                          method: "PATCH",
                          headers: {
                            Accept: "application/vnd.pgrst.object+json",
                            Prefer: "return=representation",
                            "Content-Type": "application/json",
                            apikey: "test-anon-key",
                            Authorization: "Bearer test-anon-key",
                          },
                          body: JSON.stringify(updateData),
                        }
                      );

                      if (!response.ok) {
                        return {
                          data: null,
                          error: {
                            message: "Error",
                            details: response.statusText,
                          },
                        };
                      }

                      const data = await response.json();
                      return { data, error: null };
                    }),
                  };
                }),
            };
          }),
      };
      return mockQuery;
    }),
    auth: {
      ...actualSupabase.auth,
      signInWithGoogle: jest.fn().mockImplementation(() => {
        // Mock without triggering navigation
        return Promise.resolve({
          data: { url: "https://mock-oauth-url.com" },
          error: null,
        });
      }),
      signOut: jest.fn().mockImplementation(() => {
        return Promise.resolve({ error: null });
      }),
      getUser: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          data: { user: null },
          error: null,
        });
      }),
      getSession: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          data: { session: null },
          error: null,
        });
      }),
      onAuthStateChange: jest.fn().mockImplementation(() => {
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        };
      }),
    },
  };

  return {
    ...actualSupabase,
    supabase: mockSupabaseClient,
    default: mockSupabaseClient,
  };
});

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => {
  server.resetHandlers();
  assignMock.mockClear();
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
});

afterAll(() => {
  console.error = originalError;
});
