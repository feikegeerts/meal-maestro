// Module-level mutable state — Pattern 2 from drizzle-test-mock-patterns.md
// vi.mock is hoisted; factory closures read these at call time (not definition time)
let mockSelectCount = 0;
let mockInserts: Record<string, unknown>[] = [];
let mockShouldThrow = false;

vi.mock("@/db", () => {
  const selectFn = vi.fn().mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: mockSelectCount }]),
    }),
  }));

  const insertFn = vi.fn().mockImplementation(() => ({
    values: vi.fn().mockImplementation((val: Record<string, unknown>) => {
      if (mockShouldThrow) throw new Error("DB insert error");
      mockInserts.push(val);
      return Promise.resolve({ rowCount: 1 });
    }),
  }));

  const deleteFn = vi.fn().mockImplementation(() => ({
    where: vi.fn().mockImplementation(() => {
      if (mockShouldThrow) throw new Error("DB delete error");
      return Promise.resolve({ rowCount: 0 });
    }),
  }));

  return { db: { select: selectFn, insert: insertFn, delete: deleteFn } };
});

import { checkAIRateLimit, AI_RATE_LIMITS } from "../ai-rate-limit";

beforeEach(() => {
  mockSelectCount = 0;
  mockInserts = [];
  mockShouldThrow = false;
  vi.clearAllMocks();
});

describe("checkAIRateLimit", () => {
  describe("chat endpoint", () => {
    it("allows a request when under the limit", async () => {
      mockSelectCount = 0;

      const result = await checkAIRateLimit("user-1", "chat");

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBe(0);
      expect(mockInserts).toHaveLength(1);
      expect(mockInserts[0]).toMatchObject({
        userId: "user-1",
        endpoint: "/api/recipes/chat",
      });
    });

    it("allows a request exactly at limit minus one", async () => {
      mockSelectCount = AI_RATE_LIMITS.chat.maxRequests - 1;

      const result = await checkAIRateLimit("user-1", "chat");

      expect(result.allowed).toBe(true);
    });

    it("blocks a request when at the limit", async () => {
      mockSelectCount = AI_RATE_LIMITS.chat.maxRequests;

      const result = await checkAIRateLimit("user-1", "chat");

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThanOrEqual(0);
      expect(result.resetTime).toBeGreaterThan(0);
      expect(mockInserts).toHaveLength(0);
    });
  });

  describe("nutrition endpoint", () => {
    it("allows a request when under the limit", async () => {
      mockSelectCount = 0;

      const result = await checkAIRateLimit("user-1", "nutrition");

      expect(result.allowed).toBe(true);
      expect(mockInserts[0]).toMatchObject({
        userId: "user-1",
        endpoint: "/api/recipes/nutrition",
      });
    });

    it("blocks when at the nutrition limit", async () => {
      mockSelectCount = AI_RATE_LIMITS.nutrition.maxRequests;

      const result = await checkAIRateLimit("user-1", "nutrition");

      expect(result.allowed).toBe(false);
    });
  });

  describe("fail-open behaviour", () => {
    it("allows the request if the DB throws", async () => {
      mockShouldThrow = true;

      const result = await checkAIRateLimit("user-1", "chat");

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBe(0);
    });
  });
});
