// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import "@testing-library/jest-dom";

import { configure } from "@testing-library/react";

// Configure testing library with better CI compatibility
configure({
  testIdAttribute: "data-testid",
  asyncUtilTimeout: 15000, // Increased timeout for CI
});

import { server } from "../__mocks__/server";

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => {
  server.resetHandlers();
  assignMock.mockClear();
  // Clear any pending timers between tests
  jest.clearAllTimers();
});

const assignMock = jest.fn();

// Only apply browser-specific mocks when window exists (jsdom). Node env tests skip.
if (typeof window !== "undefined") {
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

  // Mock WebCrypto API for PKCE and Neon Auth
  Object.defineProperty(global, "crypto", {
    value: {
      getRandomValues: (arr: Uint8Array) =>
        arr.map(() => Math.floor(Math.random() * 256)),
      randomUUID: () => "00000000-0000-4000-8000-000000000000",
      subtle: {
        digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
      },
    },
  });

  // Mock Web APIs needed for fetch and WebStreams
  if (typeof global.MessagePort === "undefined") {
    global.MessagePort = class MessagePort {
      onmessage: ((event: MessageEvent) => void) | null = null;
      postMessage() {}
      start() {}
      close() {}
    };
  }

  if (typeof global.MessageChannel === "undefined") {
    global.MessageChannel = class MessageChannel {
      port1: MessagePort;
      port2: MessagePort;
      constructor() {
        this.port1 = new MessagePort();
        this.port2 = new MessagePort();
      }
    };
  }

  // Mock ReadableStream for streaming response tests
  if (typeof global.ReadableStream === "undefined") {
    global.ReadableStream = class ReadableStream {
      constructor() {}
      getReader() {
        return {
          read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
          releaseLock: jest.fn(),
        };
      }
    };
  }

  // Mock TextEncoder/TextDecoder if they don't exist
  if (typeof global.TextEncoder === "undefined") {
    global.TextEncoder = class TextEncoder {
      encode(input: string) {
        return new Uint8Array(input.split("").map((char) => char.charCodeAt(0)));
      }
    };
  }

  if (typeof global.TextDecoder === "undefined") {
    global.TextDecoder = class TextDecoder {
      decode(input?: Uint8Array) {
        if (!input) return "";
        return String.fromCharCode(...Array.from(input));
      }
    };
  }
}

// Suppress JSDOM navigation errors globally
const originalError = console.error;
const originalLog = console.log;
const originalWarn = console.warn;

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

    // Suppress React dev warnings and test-specific errors
    if (typeof errorMessage === "string") {
      if (
        errorMessage.includes("Warning: ReactDOM.render is deprecated") ||
        errorMessage.includes(
          "An update to AuthProvider inside a test was not wrapped in act(...)"
        ) ||
        errorMessage.includes("WebCrypto API is not supported") ||
        errorMessage.includes("🔴 [Recipe Scraper] API error:") ||
        errorMessage.includes("[MSW] Error: intercepted a request without a matching request handler")
      ) {
        return;
      }
    }
    
    // Suppress MSW unhandled request errors from expected test scenarios
    if (errorMessage && typeof errorMessage === "object" && "message" in errorMessage) {
      const msg = (errorMessage as { message?: string }).message;
      if (msg && msg.includes("intercepted a request without a matching request handler")) {
        return;
      }
    }

    // Allow all other errors through
    originalError.call(console, ...args);
  };

  // Mock console.log to suppress application logging during tests
  console.log = (...args: unknown[]) => {
    const message = args[0];
    if (typeof message === "string") {
      // Suppress Recipe Scraper logs
      if (message.includes("🔍 [Recipe Scraper]") ||
          message.includes("✅ [Recipe Scraper]") ||
          message.includes("🟡 [Recipe Scraper]") ||
          message.includes("🔴 [Recipe Scraper]")) {
        return;
      }
      // Allow other logs through if needed for debugging
      // originalLog.call(console, ...args);
    }
    // Suppress all console.log during tests for cleaner output
  };

  // Mock console.warn to suppress application warnings during tests
  console.warn = (...args: unknown[]) => {
    const message = args[0];
    if (typeof message === "string") {
      // Suppress specific warnings we expect in tests
      if (message.includes("Rate limit check failed") ||
          message.includes("🟡 [Recipe Scraper]")) {
        return;
      }
      // Allow other warnings through if needed for debugging
      // originalWarn.call(console, ...args);
    }
    // Suppress all console.warn during tests for cleaner output
  };

  // Ensure MSW handlers are active; msw-setup.js starts the server
  // before the test framework runs.
});

afterAll(() => {
  console.error = originalError;
  console.log = originalLog;
  console.warn = originalWarn;
  server.close();
  // Clean up any remaining timers or async operations
  jest.clearAllTimers();
});
