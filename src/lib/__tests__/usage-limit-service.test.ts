import type { Mock } from 'vitest';
import * as emailDeliveryMod from '@/lib/email/services/email-delivery-service';
import type { OpenAIUsageData } from "../openai-service";

// ---------------------------------------------------------------------------
// Mock types
// ---------------------------------------------------------------------------

interface MonthlySummaryRow {
  user_id: string;
  month_start: string;
  total_cost: number;
  total_tokens: number;
  total_calls: number;
  warning_email_sent_at: string | null;
  limit_email_sent_at: string | null;
  rate_limit_email_sent_at: string | null;
  limit_enforced_at: string | null;
}

// Drizzle row shapes (camelCase, matching schema)
interface DrizzleSummaryRow {
  userId: string;
  monthStart: string;
  totalCost: string;
  totalTokens: bigint;
  totalCalls: number;
  warningEmailSentAt: Date | null;
  limitEmailSentAt: Date | null;
  rateLimitEmailSentAt: Date | null;
  limitEnforcedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

function toDrizzleRow(summary: MonthlySummaryRow): DrizzleSummaryRow {
  return {
    userId: summary.user_id,
    monthStart: summary.month_start,
    totalCost: summary.total_cost.toString(),
    totalTokens: BigInt(summary.total_tokens),
    totalCalls: summary.total_calls,
    warningEmailSentAt: summary.warning_email_sent_at
      ? new Date(summary.warning_email_sent_at)
      : null,
    limitEmailSentAt: summary.limit_email_sent_at
      ? new Date(summary.limit_email_sent_at)
      : null,
    rateLimitEmailSentAt: summary.rate_limit_email_sent_at
      ? new Date(summary.rate_limit_email_sent_at)
      : null,
    limitEnforcedAt: summary.limit_enforced_at
      ? new Date(summary.limit_enforced_at)
      : null,
    createdAt: null,
    updatedAt: null,
  };
}

// ---------------------------------------------------------------------------
// Mutable state for per-test configuration
// ---------------------------------------------------------------------------

let insertedAlertEvents: Record<string, unknown>[] = [];
let updateSets: Record<string, unknown>[] = [];
let selectSummaryResult: DrizzleSummaryRow | null = null;
let selectAlertCountResult = 0;
let insertUpsertResult: DrizzleSummaryRow | null = null;

// ---------------------------------------------------------------------------
// Mock @/db
// ---------------------------------------------------------------------------

vi.mock("@/db", () => {
  const selectFn = vi.fn().mockImplementation((fields?: Record<string, unknown>) => {
    if (fields && "count" in fields) {
      // count() query for alert events
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: selectAlertCountResult }]),
        }),
      };
    }
    // Full select (getCurrentSummary)
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(async () => {
            return selectSummaryResult ? [selectSummaryResult] : [];
          }),
        }),
      }),
    };
  });

  const insertFn = vi.fn().mockImplementation(() => ({
    values: vi.fn().mockImplementation((val: Record<string, unknown>) => {
      if ("monthStart" in val && "totalCost" in val) {
        // Upsert for monthly_usage_summary
        return {
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockImplementation(async () => {
              return insertUpsertResult ? [insertUpsertResult] : [];
            }),
          }),
        };
      }
      // Alert event insert
      insertedAlertEvents.push(val);
      return Promise.resolve({ rowCount: 1 });
    }),
  }));

  const updateFn = vi.fn().mockImplementation(() => ({
    set: vi.fn().mockImplementation((setValues: Record<string, unknown>) => {
      updateSets.push(setValues);
      return {
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      };
    }),
  }));

  return {
    db: {
      select: selectFn,
      insert: insertFn,
      update: updateFn,
    },
  };
});

// ---------------------------------------------------------------------------
// Mock email delivery
// ---------------------------------------------------------------------------

vi.mock("@/lib/email/services/email-delivery-service", () => {
  const mock = vi.fn().mockResolvedValue(undefined);
  return {
    EmailDeliveryService: vi.fn(() => ({
      sendEmail: mock,
    })),
    __sendEmailMock: mock,
  };
});

// Access the send email mock for assertions
function getSendEmailMock(): Mock {
  return (emailDeliveryMod as unknown as { __sendEmailMock: Mock }).__sendEmailMock;
}

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { UsageLimitService } from "../usage-limit-service";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UsageLimitService alerts", () => {
  let usageService: UsageLimitService;

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date("2024-06-15T12:00:00Z"));
    getSendEmailMock().mockClear();
    insertedAlertEvents = [];
    updateSets = [];
    selectSummaryResult = null;
    selectAlertCountResult = 0;
    insertUpsertResult = null;

    usageService = new UsageLimitService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enforces limit and dispatches spend alerts when threshold reached", async () => {
    const summary: MonthlySummaryRow = {
      user_id: "user-1",
      month_start: "2024-06-01",
      total_cost: 0.3,
      total_tokens: 123,
      total_calls: 4,
      warning_email_sent_at: null,
      limit_email_sent_at: null,
      rate_limit_email_sent_at: null,
      limit_enforced_at: null,
    };

    insertUpsertResult = toDrizzleRow(summary);

    const usageData: OpenAIUsageData = {
      model: "gpt-4.1-mini",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 123,
    };

    const result = await usageService.recordUsageEvent("user-1", usageData, {
      endpoint: "recipes.chat",
      costUsd: 0.3,
      timestamp: new Date("2024-06-15T12:00:00Z"),
    });

    expect(result).toEqual({
      summary,
      reachedWarning: true,
      reachedLimit: true,
    });

    // Should have update calls for limitEnforcedAt and limitEmailSentAt
    expect(updateSets.length).toBeGreaterThanOrEqual(2);
    expect(updateSets[0]).toHaveProperty("limitEnforcedAt", expect.any(Date));
    expect(updateSets[1]).toHaveProperty("limitEmailSentAt", expect.any(Date));

    // Should send limit email
    expect(getSendEmailMock()).toHaveBeenCalledTimes(1);
    expect(getSendEmailMock().mock.calls[0]?.[0]).toMatchObject({
      subject: expect.stringContaining("Usage limit reached"),
    });

    // Should log alert event
    expect(insertedAlertEvents).toEqual([
      expect.objectContaining({
        alertType: "spend",
        alertLevel: "limit",
        userId: "user-1",
        details: expect.objectContaining({
          endpoint: "recipes.chat",
          totalCost: 0.3,
        }),
      }),
    ]);
  });

  it("sends warning alert without enforcing limit when approaching threshold", async () => {
    const summary: MonthlySummaryRow = {
      user_id: "user-2",
      month_start: "2024-06-01",
      total_cost: 0.2,
      total_tokens: 50,
      total_calls: 2,
      warning_email_sent_at: null,
      limit_email_sent_at: null,
      rate_limit_email_sent_at: null,
      limit_enforced_at: null,
    };

    insertUpsertResult = toDrizzleRow(summary);

    const usageData: OpenAIUsageData = {
      model: "gpt-4.1-mini",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 50,
    };

    const result = await usageService.recordUsageEvent("user-2", usageData, {
      endpoint: "recipes.chat",
      costUsd: 0.05,
    });

    expect(result).toEqual({
      summary,
      reachedWarning: true,
      reachedLimit: false,
    });

    // Should only have warning update (no limitEnforcedAt)
    expect(updateSets).toHaveLength(1);
    expect(updateSets[0]).toHaveProperty(
      "warningEmailSentAt",
      expect.any(Date)
    );
    expect(updateSets[0]).not.toHaveProperty("limitEmailSentAt");

    expect(getSendEmailMock()).toHaveBeenCalledTimes(1);
    expect(getSendEmailMock().mock.calls[0]?.[0]).toMatchObject({
      subject: expect.stringContaining("Usage warning"),
    });

    expect(insertedAlertEvents[0]).toMatchObject({
      alertType: "spend",
      alertLevel: "warning",
      userId: "user-2",
    });
  });

  it("records rate limit alerts when no recent notifications exist", async () => {
    selectSummaryResult = toDrizzleRow({
      user_id: "user-3",
      month_start: "2024-06-01",
      total_cost: 0.05,
      total_tokens: 10,
      total_calls: 1,
      warning_email_sent_at: null,
      limit_email_sent_at: null,
      rate_limit_email_sent_at: null,
      limit_enforced_at: null,
    });

    selectAlertCountResult = 0;

    await usageService.recordRateLimitViolation("user-3", "recipes.chat");

    expect(getSendEmailMock()).toHaveBeenCalledTimes(1);
    expect(getSendEmailMock().mock.calls[0]?.[0]).toMatchObject({
      subject: expect.stringContaining("Rate limit activity"),
    });

    // Should update rateLimitEmailSentAt
    expect(updateSets).toHaveLength(1);
    expect(updateSets[0]).toHaveProperty(
      "rateLimitEmailSentAt",
      expect.any(Date)
    );

    expect(insertedAlertEvents).toHaveLength(1);
    expect(insertedAlertEvents[0]).toMatchObject({
      alertType: "rate-limit",
      alertLevel: "rate-limit",
      userId: "user-3",
      details: { endpoint: "recipes.chat" },
    });
  });
});
