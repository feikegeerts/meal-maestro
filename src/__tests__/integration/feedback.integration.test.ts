/**
 * Feedback integration tests rewritten for Drizzle + Neon Auth
 *
 * Mocks:
 * - @/db: prevents neon() call at import time; provides controllable
 *   delete / select-count / insert chains for rate limiting + feedback insertion
 * - @/lib/auth-server: controls requireAuth() responses per test
 */

// ---------------------------------------------------------------------------
// Module-level state for per-test @/db mock configuration
// ---------------------------------------------------------------------------
let rateLimitCount = 0;
let rateLimitInserts: Record<string, unknown>[] = [];
let feedbackInserts: Record<string, unknown>[] = [];
let shouldRateLimitThrow = false;
let rateLimitError: Error | null = null;

vi.mock("@/db", () => {
  // delete().where() — rate-limit cleanup (always throws when shouldRateLimitThrow)
  const deleteFn = vi.fn().mockImplementation(() => ({
    where: vi.fn().mockImplementation(() => {
      if (shouldRateLimitThrow && rateLimitError) throw rateLimitError;
      return Promise.resolve({ rowCount: 0 });
    }),
  }));

  // select({ count }).from().where() — rate-limit count
  const selectFn = vi.fn().mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => {
        if (shouldRateLimitThrow && rateLimitError) throw rateLimitError;
        return Promise.resolve([{ count: rateLimitCount }]);
      }),
    }),
  }));

  // insert().values() — rate-limit record OR feedback row
  // Only throws for rate-limit inserts (those with "endpoint" key)
  const insertFn = vi.fn().mockImplementation(() => ({
    values: vi.fn().mockImplementation((val: Record<string, unknown>) => {
      if (val && "endpoint" in val) {
        if (shouldRateLimitThrow && rateLimitError) throw rateLimitError;
        rateLimitInserts.push(val);
      } else {
        feedbackInserts.push(val);
      }
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

// ---------------------------------------------------------------------------
// Mock auth-server
// ---------------------------------------------------------------------------
vi.mock("@/lib/auth-server", () => ({
  requireAuth: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import type { Mock, MockInstance } from "vitest";
import { NextRequest } from "next/server";
import {
  POST as feedbackPost,
  GET as feedbackGet,
} from "@/app/api/feedback/route";
import { requireAuth } from "@/lib/auth-server";

const mockRequireAuth = requireAuth as Mock;

const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const buildRequest = (body: Record<string, unknown>) =>
  new NextRequest("http://localhost/api/feedback", {
    method: "POST",
    headers: new Headers({
      "Content-Type": "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "http://localhost/test",
    }),
    body: JSON.stringify(body),
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/feedback (integration)", () => {
  let consoleErrorSpy: MockInstance;
  let consoleWarnSpy: MockInstance;

  beforeEach(() => {
    rateLimitCount = 0;
    rateLimitInserts = [];
    feedbackInserts = [];
    shouldRateLimitThrow = false;
    rateLimitError = null;

    mockRequireAuth.mockResolvedValue({ user: mockUser });

    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockRequireAuth.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Authentication required",
          code: "UNAUTHORIZED",
        }),
        { status: 401 },
      ),
    );

    const request = buildRequest({
      feedbackType: "bug_report",
      subject: "Broken button",
      message: "Submit button does not work.",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Authentication required",
      code: "UNAUTHORIZED",
    });
  });

  it("allows authenticated users to submit feedback", async () => {
    const request = buildRequest({
      feedbackType: "bug_report",
      subject: "Broken button",
      message: "Submit button does not work.",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true });
    expect(feedbackInserts.length).toBe(1);
    expect(feedbackInserts[0]).toMatchObject({
      userId: mockUser.id,
      userEmail: mockUser.email,
      feedbackType: "bug_report",
      subject: "Broken button",
      message: "Submit button does not work.",
    });
  });

  it("rejects payloads missing required fields", async () => {
    const request = buildRequest({
      feedbackType: "bug_report",
      subject: "",
      message: "",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Subject is required; Message is required",
    });
  });

  it("validates the feedback type", async () => {
    const request = buildRequest({
      feedbackType: "unknown_type",
      subject: "Feature request",
      message: "Please add a timer.",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid feedback type",
    });
  });

  it("enforces subject length constraints", async () => {
    const request = buildRequest({
      feedbackType: "bug_report",
      subject: " ",
      message: "Submit button does not work.",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Subject is required",
    });
  });

  it("enforces message length constraints", async () => {
    const request = buildRequest({
      feedbackType: "bug_report",
      subject: "Broken button",
      message: "a".repeat(2001),
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Message must be 2000 characters or fewer",
    });
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    rateLimitCount = 6;

    const request = buildRequest({
      feedbackType: "bug_report",
      subject: "Broken button",
      message: "Submit button does not work.",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      success: false,
      error: expect.stringContaining("Too many feedback submissions"),
    });
  });

  it("returns 500 when the request body is invalid JSON", async () => {
    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      headers: new Headers({ "Content-Type": "application/json" }),
      body: "{invalid-json",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      error: "Internal server error while submitting feedback",
    });
  });

  it("fails open when the rate limit check throws", async () => {
    shouldRateLimitThrow = true;
    rateLimitError = new Error("database unavailable");

    const request = buildRequest({
      feedbackType: "bug_report",
      subject: "Broken button",
      message: "Submit button does not work.",
    });

    const response = await feedbackPost(request);

    // Should fail open: allow the request
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true });
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Feedback rate limit check failed, allowing request:",
      expect.any(Error),
    );
  });
});

describe("GET /api/feedback (integration)", () => {
  it("returns method not allowed", async () => {
    const response = await feedbackGet();

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({
      error: "Method not allowed. Use POST to submit feedback.",
    });
  });
});
