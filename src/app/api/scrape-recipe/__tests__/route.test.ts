/** @jest-environment node */

// ---------------------------------------------------------------------------
// Mock @/db for Drizzle rate-limit operations
// ---------------------------------------------------------------------------

let rateLimitCount = 0;
let rateLimitInserts: Record<string, unknown>[] = [];

jest.mock("@/db", () => {
  const deleteFn = jest.fn().mockImplementation(() => ({
    where: jest.fn().mockResolvedValue({ rowCount: 0 }),
  }));

  const selectFn = jest.fn().mockImplementation(() => ({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([{ count: rateLimitCount }]),
    }),
  }));

  const insertFn = jest.fn().mockImplementation(() => ({
    values: jest.fn().mockImplementation((val: Record<string, unknown>) => {
      rateLimitInserts.push(val);
      return Promise.resolve({ rowCount: 1 });
    }),
  }));

  return {
    db: {
      select: selectFn,
      insert: insertFn,
      delete: deleteFn,
    },
  };
});

// Mock the auth-server module
jest.mock("@/lib/auth-server", () => ({
  requireAuth: jest.fn(),
}));

// Mock the usage tracking service
jest.mock("@/lib/usage-tracking-service", () => ({
  usageTrackingService: {
    logUsage: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { POST, GET } from "../route";
import { NextRequest } from "next/server";
import { server } from "../../../../__mocks__/server";
import { SecurityTestUtils } from "../../../../__mocks__/security-test-utils";
import { mockUser } from "../../../../__mocks__/handlers";
import { requireAuth } from "@/lib/auth-server";
import { usageTrackingService } from "@/lib/usage-tracking-service";

const mockRequireAuth = requireAuth as jest.Mock;
const mockUsageTrackingService = usageTrackingService as {
  logUsage: jest.Mock;
};

describe("/api/scrape-recipe API Security Tests", () => {
  beforeEach(() => {
    SecurityTestUtils.setupDNSMocks();
    rateLimitCount = 0;
    rateLimitInserts = [];

    mockRequireAuth.mockResolvedValue({
      user: mockUser,
    });

    mockUsageTrackingService.logUsage.mockResolvedValue({
      success: true,
      cost: 0,
      warningThresholdReached: false,
      limitReached: false,
    });
  });

  afterEach(() => {
    SecurityTestUtils.cleanup();
    server.resetHandlers();
  });

  describe("Authentication and Authorization", () => {
    test("should return 401 when not authenticated", async () => {
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
    test("should enforce user rate limits (10 requests per minute)", async () => {
      const now = Date.now();
      SecurityTestUtils.mockTime(now);

      rateLimitCount = 12;

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

      expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
      expect(response.headers.get("Retry-After")).toBeTruthy();

      SecurityTestUtils.restoreTime();
    });

    test("should allow requests under rate limit", async () => {
      rateLimitCount = 5;

      const request = new NextRequest(
        "http://localhost:3000/api/scrape-recipe",
        {
          method: "POST",
          body: JSON.stringify({ url: "https://allrecipes.com/recipe/test" }),
        }
      );

      const response = await POST(request);
      expect(response.status).not.toBe(429);

      expect(rateLimitInserts.length).toBeGreaterThanOrEqual(1);
      expect(rateLimitInserts[0]).toMatchObject({
        userId: mockUser.id,
        endpoint: "/api/scrape-recipe",
        timestamp: expect.any(BigInt),
      });
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
  });

  describe("HTTP Method Security", () => {
    test("should reject GET requests", async () => {
      const response = await GET();
      expect(response.status).toBe(405);
      const data = await response.json();
      expect(data.error).toContain("Method not allowed");
    });
  });

  describe("Usage Tracking Security", () => {
    test("should log scraping attempts for monitoring", async () => {
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

      expect(mockRequireAuth).toHaveBeenCalled();
      expect(mockUsageTrackingService.logUsage).toHaveBeenCalled();
    });

    test("should handle blocked sites with helpful error messages", async () => {
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

    test("should handle concurrent requests properly", async () => {
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

      responses.forEach((response) => {
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(600);
      });
    });
  });
});
