import { db } from "@/db";
import { monthlyUsageSummary, usageAlertEvents } from "@/db/schema";
import { and, eq, gte, count, isNull, sql } from "drizzle-orm";
import {
  ALERT_RECIPIENTS,
  ALERT_RETRY_BUFFER_MINUTES,
  AlertLevel,
  MONTHLY_SPEND_CAP_USD,
  RATE_LIMIT_ALERT_WINDOW_MINUTES,
  WARNING_THRESHOLD_PERCENT,
} from "@/config/usage-limits";
import { readFileSync } from "fs";
import { join } from "path";
import Mustache from "mustache";
import { EmailDeliveryService } from "@/lib/email/services/email-delivery-service";
import type { OpenAIUsageData } from "@/lib/openai-service";
import { pricingService } from "@/lib/pricing-service";

export class MonthlySpendLimitError extends Error {
  public readonly code = "MONTHLY_SPEND_LIMIT_EXCEEDED";
  constructor(
    public readonly limitUsd: number,
    public readonly totalCost: number,
  ) {
    super("Monthly spend limit exceeded");
    this.name = "MonthlySpendLimitError";
  }
}

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

interface ThresholdResult {
  reachedWarning: boolean;
  reachedLimit: boolean;
}

export class UsageLimitService {
  private emailDelivery: EmailDeliveryService;

  constructor(emailDelivery?: EmailDeliveryService) {
    this.emailDelivery = emailDelivery || new EmailDeliveryService();
  }

  public async getCurrentSummary(
    userId: string,
    asOf: Date = new Date(),
  ): Promise<MonthlySummaryRow | null> {
    const monthStart = this.getMonthStart(asOf);

    const [row] = await db
      .select()
      .from(monthlyUsageSummary)
      .where(
        and(
          eq(monthlyUsageSummary.userId, userId),
          eq(monthlyUsageSummary.monthStart, monthStart),
        ),
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return this.toSummaryRow(row);
  }

  public async assertWithinMonthlyLimit(
    userId: string,
    asOf: Date = new Date(),
  ): Promise<void> {
    const summary = await this.getCurrentSummary(userId, asOf);

    if (!summary) {
      return; // No usage yet
    }

    if (summary.limit_enforced_at) {
      throw new MonthlySpendLimitError(
        MONTHLY_SPEND_CAP_USD,
        summary.total_cost,
      );
    }

    if (summary.total_cost >= MONTHLY_SPEND_CAP_USD) {
      throw new MonthlySpendLimitError(
        MONTHLY_SPEND_CAP_USD,
        summary.total_cost,
      );
    }
  }

  public async recordUsageEvent(
    userId: string,
    usage: OpenAIUsageData,
    options: {
      endpoint: string;
      timestamp?: Date;
      costUsd: number;
    },
  ): Promise<{
    summary: MonthlySummaryRow;
    reachedWarning: boolean;
    reachedLimit: boolean;
  }> {
    const { endpoint, timestamp, costUsd } = options;
    const callTime = timestamp || new Date();
    const monthStart = this.getMonthStart(callTime);
    const cost = Number(costUsd.toFixed(4));
    const tokens = usage.totalTokens;

    // Upsert: INSERT ... ON CONFLICT DO UPDATE (replaces the RPC)
    const [row] = await db
      .insert(monthlyUsageSummary)
      .values({
        userId,
        monthStart,
        totalCost: Math.max(cost, 0).toString(),
        totalTokens: BigInt(Math.max(tokens, 0)),
        totalCalls: 1,
      })
      .onConflictDoUpdate({
        target: [monthlyUsageSummary.userId, monthlyUsageSummary.monthStart],
        set: {
          totalCost: sql`${monthlyUsageSummary.totalCost} + ${Math.max(cost, 0)}`,
          totalTokens: sql`${monthlyUsageSummary.totalTokens} + ${Math.max(tokens, 0)}`,
          totalCalls: sql`${monthlyUsageSummary.totalCalls} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();

    const summary = this.toSummaryRow(row);
    const thresholds = this.evaluateThresholds(summary.total_cost);

    if (thresholds.reachedLimit) {
      await this.markLimitEnforced(summary);
    }

    if (thresholds.reachedWarning || thresholds.reachedLimit) {
      await this.maybeSendSpendAlert(summary, endpoint, thresholds);
    }

    return {
      summary,
      reachedWarning: thresholds.reachedWarning,
      reachedLimit: thresholds.reachedLimit,
    };
  }

  public async recordRateLimitViolation(
    userId: string,
    endpoint: string,
  ): Promise<void> {
    const summary = await this.getCurrentSummary(userId);
    const now = new Date();

    const windowStart = new Date(
      now.getTime() - RATE_LIMIT_ALERT_WINDOW_MINUTES * 60 * 1000,
    );

    const [result] = await db
      .select({ count: count() })
      .from(usageAlertEvents)
      .where(
        and(
          eq(usageAlertEvents.userId, userId),
          eq(usageAlertEvents.alertType, "rate-limit"),
          gte(usageAlertEvents.createdAt, windowStart),
        ),
      );

    if ((result?.count ?? 0) > 0) {
      return; // Already alerted recently
    }

    if (summary) {
      await db
        .update(monthlyUsageSummary)
        .set({ rateLimitEmailSentAt: now })
        .where(
          and(
            eq(monthlyUsageSummary.userId, summary.user_id),
            eq(monthlyUsageSummary.monthStart, summary.month_start),
          ),
        );
    }

    await this.dispatchAlertEmail("rate-limit", {
      userId,
      summary,
      endpoint,
      totalCost: summary?.total_cost ?? 0,
      level: "rate-limit",
    });

    await this.logAlertEvent(
      userId,
      summary ? summary.month_start : this.getMonthStart(now),
      "rate-limit",
      "rate-limit",
      { endpoint },
    );
  }

  private evaluateThresholds(totalCost: number): ThresholdResult {
    const warningThreshold =
      MONTHLY_SPEND_CAP_USD * WARNING_THRESHOLD_PERCENT;
    return {
      reachedWarning: totalCost >= warningThreshold,
      reachedLimit: totalCost >= MONTHLY_SPEND_CAP_USD,
    };
  }

  private async markLimitEnforced(summary: MonthlySummaryRow): Promise<void> {
    if (summary.limit_enforced_at) {
      return;
    }

    await db
      .update(monthlyUsageSummary)
      .set({ limitEnforcedAt: new Date() })
      .where(
        and(
          eq(monthlyUsageSummary.userId, summary.user_id),
          eq(monthlyUsageSummary.monthStart, summary.month_start),
          isNull(monthlyUsageSummary.limitEnforcedAt),
        ),
      );
  }

  private async maybeSendSpendAlert(
    summary: MonthlySummaryRow,
    endpoint: string,
    thresholds: ThresholdResult,
  ): Promise<void> {
    const now = new Date();
    const level: AlertLevel = thresholds.reachedLimit ? "limit" : "warning";

    const lastSent = thresholds.reachedLimit
      ? summary.limit_email_sent_at
      : summary.warning_email_sent_at;

    if (
      lastSent &&
      !this.isOutsideBuffer(lastSent, now, ALERT_RETRY_BUFFER_MINUTES)
    ) {
      return;
    }

    if (thresholds.reachedLimit) {
      await db
        .update(monthlyUsageSummary)
        .set({ limitEmailSentAt: now })
        .where(
          and(
            eq(monthlyUsageSummary.userId, summary.user_id),
            eq(monthlyUsageSummary.monthStart, summary.month_start),
          ),
        );
    } else {
      await db
        .update(monthlyUsageSummary)
        .set({ warningEmailSentAt: now })
        .where(
          and(
            eq(monthlyUsageSummary.userId, summary.user_id),
            eq(monthlyUsageSummary.monthStart, summary.month_start),
          ),
        );
    }

    await this.dispatchAlertEmail("spend", {
      userId: summary.user_id,
      summary,
      endpoint,
      totalCost: summary.total_cost,
      level,
    });

    await this.logAlertEvent(
      summary.user_id,
      summary.month_start,
      "spend",
      level,
      {
        endpoint,
        totalCost: summary.total_cost,
      },
    );
  }

  private async logAlertEvent(
    userId: string,
    monthStart: string,
    alertType: string,
    level: AlertLevel,
    details: Record<string, unknown>,
  ): Promise<void> {
    try {
      await db.insert(usageAlertEvents).values({
        userId,
        monthStart,
        alertType,
        alertLevel: level,
        details,
      });
    } catch (error) {
      console.error(
        "[UsageLimitService] Failed to log alert event",
        error,
      );
    }
  }

  private async dispatchAlertEmail(
    alertType: "spend" | "rate-limit",
    context: {
      userId: string;
      summary: MonthlySummaryRow | null;
      endpoint: string;
      totalCost: number;
      level: AlertLevel;
    },
  ): Promise<void> {
    const [primaryRecipient] = ALERT_RECIPIENTS;

    const monthStart =
      context.summary?.month_start ?? this.getMonthStart(new Date());
    const locale = "en";

    const levelLabel = this.getLevelLabel(context.level, locale);
    const subject = `${levelLabel}: user ${context.userId} usage alert`;

    const html = Mustache.render(getAdminAlertTemplate(), {
      brandEmoji: "🍽️",
      brandName: "Meal Maestro",
      tagline: "Your AI-powered recipe companion",
      supportEmail: "info@meal-maestro.com",
      currentYear: new Date().getFullYear().toString(),
      levelLabel,
      userId: context.userId,
      endpoint: context.endpoint,
      monthLabel: this.formatMonthLabel(monthStart),
      totalCostFormatted: pricingService.formatCost(context.totalCost ?? 0),
      limitFormatted: pricingService.formatCost(MONTHLY_SPEND_CAP_USD),
    });

    await this.emailDelivery.sendEmail(
      {
        subject,
        html,
      },
      { to: primaryRecipient },
    );
  }

  private getMonthStart(date: Date): string {
    return new Date(date.getFullYear(), date.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
  }

  private formatMonthLabel(monthStart: string): string {
    const date = new Date(monthStart);
    if (Number.isNaN(date.getTime())) {
      return monthStart;
    }

    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  private getLevelLabel(
    level: AlertLevel,
    locale: string,
  ): string {
    const labels: Record<string, Record<AlertLevel, string>> = {
      en: {
        warning: "Usage warning",
        limit: "Usage limit reached",
        "rate-limit": "Rate limit activity",
      },
      nl: {
        warning: "Waarschuwing voor gebruik",
        limit: "Gebruikslimiet bereikt",
        "rate-limit": "Rate-limit activatie",
      },
    };

    const localeKey = labels[locale] ? locale : "en";
    return labels[localeKey][level];
  }

  private isOutsideBuffer(
    lastSentIso: string,
    now: Date,
    bufferMinutes: number,
  ): boolean {
    const lastSent = new Date(lastSentIso);
    const diffMinutes = (now.getTime() - lastSent.getTime()) / 60000;
    return diffMinutes >= bufferMinutes;
  }

  private toSummaryRow(
    row: typeof monthlyUsageSummary.$inferSelect,
  ): MonthlySummaryRow {
    return {
      user_id: row.userId,
      month_start: row.monthStart,
      total_cost: Number(row.totalCost),
      total_tokens: Number(row.totalTokens),
      total_calls: row.totalCalls,
      warning_email_sent_at: row.warningEmailSentAt?.toISOString() ?? null,
      limit_email_sent_at: row.limitEmailSentAt?.toISOString() ?? null,
      rate_limit_email_sent_at:
        row.rateLimitEmailSentAt?.toISOString() ?? null,
      limit_enforced_at: row.limitEnforcedAt?.toISOString() ?? null,
    };
  }
}

export const usageLimitService = new UsageLimitService();

let adminAlertTemplateCache: string | null = null;

function getAdminAlertTemplate(): string {
  if (!adminAlertTemplateCache) {
    const templatePath = join(
      process.cwd(),
      "src/lib/email/templates/admin-usage-alert.mustache",
    );
    adminAlertTemplateCache = readFileSync(templatePath, "utf-8");
    Mustache.parse(adminAlertTemplateCache);
  }

  return adminAlertTemplateCache;
}
