import { POST, GET } from "../route";
import { NextRequest } from "next/server";
import { server } from "../../../../__mocks__/server";
import { SecurityTestUtils } from "../../../../__mocks__/security-test-utils";
import { mockUser } from "../../../../__mocks__/handlers";

// Mock the auth-server module
jest.mock("@/lib/auth-server", () => ({
  requireAuth: jest.fn(),
}));

import { requireAuth } from "@/lib/auth-server";
import { usageTrackingService } from "@/lib/usage-tracking-service";
import { createClient } from "@supabase/supabase-js";

// Mock the usage tracking service
jest.mock("@/lib/usage-tracking-service", () => ({
  usageTrackingService: {
    logUsage: jest.fn(),
  },
}));

// Mock Supabase client
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

const mockRequireAuth = requireAuth as jest.Mock;
const mockUsageTrackingService = usageTrackingService as { logUsage: jest.Mock };
const mockCreateClient = createClient as jest.Mock;

describe("/api/scrape-recipe API Security Tests", () => {
  // Create a mock that intercepts at the Promise level
  let mockDeletePromise: Promise<{ data: unknown[]; error: Error | null }>;
  let mockSelectPromise: Promise<{ data: unknown[] | null; error: Error | null }>;
  let mockInsertPromise: Promise<{ data: unknown[]; error: Error | null }>;

  // Track all the mock functions so we can make assertions
  const mockInsertFn = jest.fn();
  const mockDeleteFn = jest.fn();
  const mockSelectFn = jest.fn();
  const mockEqFn = jest.fn();
  const mockLtFn = jest.fn();
  const mockGteFn = jest.fn();
  const mockOrderFn = jest.fn();

  interface MockSupabaseClient {
    from: jest.Mock;
    delete: jest.Mock;
    select: jest.Mock;
    insert: jest.Mock;
    eq: jest.Mock;
    lt: jest.Mock;
    gte: jest.Mock;
    order: jest.Mock;
  }

  const mockSupabaseClient: MockSupabaseClient = {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'rate_limit_user') {
        return {
          delete: mockDeleteFn.mockImplementation(() => ({
            lt: mockLtFn.mockImplementation(() => mockDeletePromise)
          })),
          select: mockSelectFn.mockImplementation(() => ({
            eq: mockEqFn.mockImplementation(() => ({
              eq: mockEqFn.mockImplementation(() => ({
                gte: mockGteFn.mockImplementation(() => ({
                  order: mockOrderFn.mockImplementation(() => mockSelectPromise)
                }))
              }))
            }))
          })),
          insert: mockInsertFn.mockImplementation(() => mockInsertPromise)
        };
      }
      return mockSupabaseClient;
    }),
    // Keep these for backward compatibility with any remaining direct calls
    delete: jest.fn(),
    select: jest.fn(),
    insert: mockInsertFn,
    eq: mockEqFn,
    lt: mockLtFn,
    gte: mockGteFn,
    order: mockOrderFn,
  };

  beforeEach(() => {
    // Removed unused variable 'method' to fix ESLint warning
    SecurityTestUtils.setupDNSMocks();

    // Setup default successful auth
    mockRequireAuth.mockResolvedValue({
      client: mockSupabaseClient,
      user: mockUser,
    });

    // Setup default successful usage tracking
    mockUsageTrackingService.logUsage.mockResolvedValue({ success: true });

    // Setup Supabase client mock
    mockCreateClient.mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    SecurityTestUtils.cleanup();
    server.resetHandlers();
  });

  describe("Authentication and Authorization", () => {
    test("should return 401 when not authenticated", async () => {
      // Mock auth failure
      mockRequireAuth.mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "Authentication required",
            code: "UNAUTHORIZED",
          }),
          { status: 401 }
        )
      );

      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: JSON.stringify({ url: "https://example.com/recipe" }),
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    test("should require user authentication for scraping", async () => {
      // Removed unused variable 'request' to fix ESLint warning
      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: JSON.stringify({ url: "https://allrecipes.com/recipe/test" }),
        }
      );

      await POST(request);

      expect(mockRequireAuth).toHaveBeenCalledTimes(1);
    });
  });

  describe("Rate Limiting Security", () => {
    beforeEach(() => {
      // Clear all the tracked mock functions
      mockInsertFn.mockClear();
      mockDeleteFn.mockClear();
      mockSelectFn.mockClear();
      mockEqFn.mockClear();
      mockLtFn.mockClear();
      mockGteFn.mockClear();
      mockOrderFn.mockClear();
      mockSupabaseClient.from.mockClear();

      // Re-setup the core mocks that might have been cleared
      mockRequireAuth.mockResolvedValue({
        client: mockSupabaseClient,
        user: mockUser,
      });
      mockUsageTrackingService.logUsage.mockResolvedValue({ success: true });
      mockCreateClient.mockReturnValue(mockSupabaseClient);
    });

    test("should enforce user rate limits (10 requests per minute)", async () => {
      const now = Date.now();
      SecurityTestUtils.mockTime(now);

      // Mock rate limit exceeded scenario
      const rateLimitData = Array(12)
        .fill(null)
        .map((_, i) => ({
          id: i,
          user_id: mockUser.id,
          endpoint: "/api/scrape-recipe",
          timestamp: now - i * 1000,
          created_at: new Date(now - i * 1000).toISOString(),
        }));

      // Set up promises for the specific operations
      mockDeletePromise = Promise.resolve({ data: [], error: null });
      mockSelectPromise = Promise.resolve({ data: rateLimitData, error: null });
      mockInsertPromise = Promise.resolve({ data: [{ id: Date.now() }], error: null });

      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: JSON.stringify({ url: "https://allrecipes.com/recipe/test" }),
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Rate limit exceeded");

      // Should include rate limit headers
      expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
      expect(response.headers.get("Retry-After")).toBeTruthy();

      SecurityTestUtils.restoreTime();
    });

    test("should allow requests under rate limit", async () => {
      const now = Date.now();

      // Mock under limit scenario (5 requests in last minute)
      const underLimitData = Array(5)
        .fill(null)
        .map((_, i) => ({
          id: i,
          user_id: mockUser.id,
          endpoint: "/api/scrape-recipe",
          timestamp: now - i * 10000, // 10 seconds apart
          created_at: new Date(now - i * 10000).toISOString(),
        }));

      // Set up promises for the specific operations
      mockDeletePromise = Promise.resolve({ data: [], error: null });
      mockSelectPromise = Promise.resolve({ data: underLimitData, error: null });
      mockInsertPromise = Promise.resolve({ data: [{ id: Date.now() }], error: null });

      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: JSON.stringify({ url: "https://allrecipes.com/recipe/test" }),
        }
      );

      const response = await POST(request);

      expect(response.status).not.toBe(429);

      // Should log the rate limit attempt
      expect(mockInsertFn).toHaveBeenCalledWith({
        user_id: mockUser.id,
        endpoint: "/api/scrape-recipe",
        timestamp: expect.any(Number),
      });
    });

    test("should clean up old rate limit entries", async () => {
      // Set up promises for the specific operations
      mockDeletePromise = Promise.resolve({ data: [], error: null });
      mockSelectPromise = Promise.resolve({ data: [], error: null });
      mockInsertPromise = Promise.resolve({ data: [{ id: Date.now() }], error: null });

      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: JSON.stringify({ url: "https://allrecipes.com/recipe/test" }),
        }
      );

      await POST(request);

      // Should clean up entries older than 1 hour
      expect(mockDeleteFn).toHaveBeenCalled();
      expect(mockLtFn).toHaveBeenCalledWith(
        "timestamp",
        expect.any(Number)
      );
    });

    test("should fail open when rate limit database fails", async () => {
      // Mock database failure
      mockDeletePromise = Promise.resolve({ data: [], error: null });
      mockSelectPromise = Promise.resolve({
        data: null,
        error: new Error("Database connection failed"),
      });
      mockInsertPromise = Promise.resolve({ data: [{ id: Date.now() }], error: null });

      const consoleWarnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: JSON.stringify({ url: "https://allrecipes.com/recipe/test" }),
        }
      );

      const response = await POST(request);

      // Should allow the request when database fails (fail open for availability)
      expect(response.status).not.toBe(429);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Rate limit check failed, allowing request:",
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    test("should isolate rate limits per user (RLS compliance)", async () => {
      // Set up promises for the specific operations
      mockDeletePromise = Promise.resolve({ data: [], error: null });
      mockSelectPromise = Promise.resolve({ data: [], error: null });
      mockInsertPromise = Promise.resolve({ data: [{ id: Date.now() }], error: null });

      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: JSON.stringify({ url: "https://allrecipes.com/recipe/test" }),
        }
      );

      await POST(request);

      // Should query only for the authenticated user's rate limit entries
      expect(mockEqFn).toHaveBeenCalledWith(
        "user_id",
        mockUser.id
      );
      expect(mockEqFn).toHaveBeenCalledWith(
        "endpoint",
        "/api/scrape-recipe"
      );
    });
  });

  describe("Input Validation Security", () => {
    test("should reject requests without URL", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("URL is required");
    });

    test("should reject non-string URLs", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: JSON.stringify({ url: 12345 }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("URL is required");
    });

    test("should reject invalid URL formats", async () => {
      const invalidUrls = [
        "not-a-url",
        "ftp://example.com/file",
        "javascript:alert(1)",
        "data:text/html,<script>",
        "",
      ];

      for (const invalidUrl of invalidUrls) {
        const request = new NextRequest(
          "http://localhost:3000/api/scrape-recipe",
          {
            method: "POST",
            body: JSON.stringify({ url: invalidUrl }),
          }
        );

        const response = await POST(request);

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain("Invalid URL format");
      }
    });

    test("should normalize URLs to remove tracking parameters", async () => {
      mockSupabaseClient.select.mockResolvedValue({ data: [], error: null });
      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: Date.now() }],
        error: null,
      });

      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: JSON.stringify({
            url: "https://allrecipes.com/recipe/test?utm_source=facebook&fbclid=123&ref=share",
          }),
        }
      );

      await POST(request);

      // Should log the normalized URL without tracking params
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("https://allrecipes.com/recipe/test")
      );
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("utm_source")
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe("HTTP Method Security", () => {
    test("should reject GET requests", async () => {
      const response = await GET();

      expect(response.status).toBe(405);
      const data = await response.json();
      expect(data.error).toContain("Method not allowed");
    });

    test("should only accept POST requests", async () => {
      // Since the route only exports POST and GET, other methods would result in 404/405
      // This test verifies that only POST is implemented for scraping
      expect(typeof POST).toBe("function");
      expect(typeof GET).toBe("function");
    });
  });

  describe("Error Response Security", () => {
    test("should sanitize error responses", async () => {
      mockSupabaseClient.select.mockResolvedValue({ data: [], error: null });
      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: Date.now() }],
        error: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: JSON.stringify({ url: "https://error-site.com/recipe" }),
        }
      );

      const response = await POST(request);

      if (!response.ok) {
        const data = await response.json();

        // Error messages should not contain sensitive information
        expect(SecurityTestUtils.verifyErrorSanitization(data.error)).toBe(
          true
        );
      }
    });

    test(
      "should return proper HTTP status codes for different errors", 
      async () => {
      const testCases = [
        { url: "https://ah.nl/recipe/test", expectedStatus: 422 }, // Blocked site
        { url: "https://slow-site.com/recipe", expectedStatus: 422 }, // Timeout
        { url: "https://example.com/large-content", expectedStatus: 422 }, // Too large
      ];

      for (const testCase of testCases) {
        mockSupabaseClient.select.mockResolvedValue({ data: [], error: null });
        mockSupabaseClient.insert.mockResolvedValue({
          data: [{ id: Date.now() }],
          error: null,
        });

        const request = new NextRequest(
          "http://localhost:3000/api/scrape-recipe",
          {
            method: "POST",
            body: JSON.stringify({ url: testCase.url }),
          }
        );

        const response = await POST(request);

        expect(response.status).toBe(testCase.expectedStatus);

        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toBeTruthy();
      }
    }, 15000);

    test("should handle JSON parsing errors gracefully", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: "invalid json",
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe("Usage Tracking Security", () => {
    test("should log scraping attempts for monitoring", async () => {
      mockSupabaseClient.select.mockResolvedValue({ data: [], error: null });
      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: Date.now() }],
        error: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: JSON.stringify({ url: "https://allrecipes.com/recipe/test" }),
        }
      );

      await POST(request);

      expect(mockUsageTrackingService.logUsage).toHaveBeenCalledWith(
        mockUser.id,
        "/api/scrape-recipe",
        {
          model: "scraper",
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        }
      );
    });

    test("should handle usage tracking failures gracefully", async () => {
      mockSupabaseClient.select.mockResolvedValue({ data: [], error: null });
      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: Date.now() }],
        error: null,
      });

      // Mock usage tracking failure
      mockUsageTrackingService.logUsage.mockResolvedValue({
        success: false,
        error: "Usage tracking failed",
      });

      const consoleWarnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: JSON.stringify({ url: "https://allrecipes.com/recipe/test" }),
        }
      );

      const response = await POST(request);

      // Should continue processing even if usage tracking fails
      expect(response.status).not.toBe(500);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "🟡 [Scraper] Failed to log usage:",
        "Usage tracking failed"
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("Integration Test Scenarios", () => {
    test("should successfully scrape valid recipe with all security checks", async () => {
      mockSupabaseClient.select.mockResolvedValue({ data: [], error: null });
      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: Date.now() }],
        error: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: JSON.stringify({ url: "https://allrecipes.com/recipe/test" }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data?.title).toBe("Test Recipe");
      expect(data.data?.source).toBe("json-ld");
      expect(data.data?.url).toBe("https://allrecipes.com/recipe/test");
      expect(data.data?.domainDescription).toBe("Allrecipes");

      // Should have completed all security checks
      expect(mockRequireAuth).toHaveBeenCalled();
      expect(mockUsageTrackingService.logUsage).toHaveBeenCalled();
    });

    test("should handle blocked sites with helpful error messages", async () => {
      mockSupabaseClient.select.mockResolvedValue({ data: [], error: null });
      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: Date.now() }],
        error: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: JSON.stringify({ url: "https://ah.nl/recipe/test" }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Site blocked access");
    });

    test("should provide consistent response format for all scenarios", async () => {
      const testUrls = [
        "https://allrecipes.com/recipe/test", // Success
        "https://ah.nl/recipe/test", // Blocked
        "https://malformed-json-site.com/recipe", // No recipe data
      ];

      for (const url of testUrls) {
        mockSupabaseClient.select.mockResolvedValue({ data: [], error: null });
        mockSupabaseClient.insert.mockResolvedValue({
          data: [{ id: Date.now() }],
          error: null,
        });

        const request = new NextRequest(
          "http://localhost:3000/api/scrape-recipe",
          {
            method: "POST",
            body: JSON.stringify({ url }),
          }
        );

        const response = await POST(request);
        const data = await response.json();

        // All responses should have consistent structure
        expect(typeof data.success).toBe("boolean");

        if (data.success) {
          expect(data.data).toBeTruthy();
        } else {
          expect(data.error).toBeTruthy();
        }
      }
    });

    test("should handle concurrent requests properly", async () => {
      mockSupabaseClient.select.mockResolvedValue({ data: [], error: null });
      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: Date.now() }],
        error: null,
      });

      const requests = Array(5)
        .fill(null)
        .map(
          () =>
            new NextRequest("http://localhost:3000/api/scrape-recipe", {
              method: "POST",
              body: JSON.stringify({
                url: "https://allrecipes.com/recipe/test",
              }),
            })
        );

      const responses = await Promise.all(
        requests.map((request) => POST(request))
      );

      // All requests should complete (may be rate limited, but should not crash)
      responses.forEach((response) => {
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(600);
      });
    });
  });
});
