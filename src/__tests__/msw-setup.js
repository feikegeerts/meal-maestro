// src/__tests__/msw-setup.js
// This file is loaded in setupFiles to ensure MSW intercepts fetch before any code runs.
import { server } from "../__mocks__/server";

// Start MSW before anything else (setupFiles runs before test framework, so no beforeAll/afterAll)
server.listen({ onUnhandledRequest: "error" });

// Reset handlers after each test to prevent handler leakage between tests
afterEach(() => server.resetHandlers());

// Ensure server is closed when process exits (for safety)
process.on("exit", () => {
  server.close();
});
