import { createClient } from '@supabase/supabase-js';
import {
  ALERT_RECIPIENTS,
  ALERT_RETRY_BUFFER_MINUTES,
  AlertLevel,
  MONTHLY_SPEND_CAP_USD,
  RATE_LIMIT_ALERT_WINDOW_MINUTES,
  WARNING_THRESHOLD_PERCENT,
} from '@/config/usage-limits';
import { readFileSync } from 'fs';
import { join } from 'path';
import Mustache from 'mustache';
import { EmailDeliveryService } from '@/lib/email/services/email-delivery-service';
import type { OpenAIUsageData } from '@/lib/openai-service';
import { pricingService } from '@/lib/pricing-service';

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export class MonthlySpendLimitError extends Error {
  public readonly code = 'MONTHLY_SPEND_LIMIT_EXCEEDED';
  constructor(public readonly limitUsd: number, public readonly totalCost: number) {
    super('Monthly spend limit exceeded');
    this.name = 'MonthlySpendLimitError';
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

  public async getCurrentSummary(userId: string, asOf: Date = new Date()): Promise<MonthlySummaryRow | null> {
    const monthStart = this.getMonthStart(asOf);

    const { data, error } = await supabaseAdmin
      .from('monthly_usage_summary')
      .select('*')
      .eq('user_id', userId)
      .eq('month_start', monthStart)
      .maybeSingle();

    if (error) {
      console.error('[UsageLimitService] Failed to fetch monthly summary', error);
      return null;
    }

    return data as MonthlySummaryRow | null;
  }

  public async assertWithinMonthlyLimit(userId: string, asOf: Date = new Date()): Promise<void> {
    const summary = await this.getCurrentSummary(userId, asOf);

    if (!summary) {
      return; // No usage yet
    }

    if (summary.limit_enforced_at) {
      throw new MonthlySpendLimitError(MONTHLY_SPEND_CAP_USD, summary.total_cost);
    }

    if (summary.total_cost >= MONTHLY_SPEND_CAP_USD) {
      throw new MonthlySpendLimitError(MONTHLY_SPEND_CAP_USD, summary.total_cost);
    }
  }

  public async recordUsageEvent(
    userId: string,
    usage: OpenAIUsageData,
    options: {
      endpoint: string;
      timestamp?: Date;
      costUsd: number;
    }
  ): Promise<{
    summary: MonthlySummaryRow;
    reachedWarning: boolean;
    reachedLimit: boolean;
  }> {
    const { endpoint, timestamp, costUsd } = options;
    const callTime = timestamp || new Date();

    const { data, error } = await supabaseAdmin.rpc('increment_monthly_usage_summary', {
      p_user_id: userId,
      p_cost: Number(costUsd.toFixed(4)),
      p_tokens: usage.totalTokens,
      p_call_time: callTime.toISOString(),
      p_calls: 1,
    });

    if (error) {
      console.error('[UsageLimitService] increment_monthly_usage_summary failed', error);
      throw error;
    }

    const summary = data as MonthlySummaryRow;
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

  public async recordRateLimitViolation(userId: string, endpoint: string): Promise<void> {
    const summary = await this.getCurrentSummary(userId);
    const now = new Date();

    const windowStart = new Date(now.getTime() - RATE_LIMIT_ALERT_WINDOW_MINUTES * 60 * 1000);

    const { count, error } = await supabaseAdmin
      .from('usage_alert_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('alert_type', 'rate-limit')
      .gte('created_at', windowStart.toISOString());

    if (error) {
      console.warn('[UsageLimitService] Failed to check recent rate-limit alerts', error);
      return;
    }

    if ((count || 0) > 0) {
      return; // Already alerted recently
    }

    if (summary) {
      await supabaseAdmin
        .from('monthly_usage_summary')
        .update({ rate_limit_email_sent_at: now.toISOString() })
        .eq('user_id', summary.user_id)
        .eq('month_start', summary.month_start);
    }

    await this.dispatchAlertEmail('rate-limit', {
      userId,
      summary,
      endpoint,
      totalCost: summary?.total_cost ?? 0,
      level: 'rate-limit',
    });

    await this.logAlertEvent(userId, summary ? summary.month_start : this.getMonthStart(now), 'rate-limit', 'rate-limit', {
      endpoint,
    });
  }

  private evaluateThresholds(totalCost: number): ThresholdResult {
    const warningThreshold = MONTHLY_SPEND_CAP_USD * WARNING_THRESHOLD_PERCENT;
    return {
      reachedWarning: totalCost >= warningThreshold,
      reachedLimit: totalCost >= MONTHLY_SPEND_CAP_USD,
    };
  }

  private async markLimitEnforced(summary: MonthlySummaryRow): Promise<void> {
    if (summary.limit_enforced_at) {
      return;
    }

    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('monthly_usage_summary')
      .update({ limit_enforced_at: nowIso })
      .eq('user_id', summary.user_id)
      .eq('month_start', summary.month_start)
      .is('limit_enforced_at', null);

    if (error) {
      console.error('[UsageLimitService] Failed to mark limit enforced', error);
    }
  }

  private async maybeSendSpendAlert(
    summary: MonthlySummaryRow,
    endpoint: string,
    thresholds: ThresholdResult
  ): Promise<void> {
    const now = new Date();
    const level: AlertLevel = thresholds.reachedLimit ? 'limit' : 'warning';

    const lastSent = thresholds.reachedLimit
      ? summary.limit_email_sent_at
      : summary.warning_email_sent_at;

    if (lastSent && !this.isOutsideBuffer(lastSent, now, ALERT_RETRY_BUFFER_MINUTES)) {
      return;
    }

    if (thresholds.reachedLimit) {
      await supabaseAdmin
        .from('monthly_usage_summary')
        .update({ limit_email_sent_at: now.toISOString() })
        .eq('user_id', summary.user_id)
        .eq('month_start', summary.month_start);
    } else {
      await supabaseAdmin
        .from('monthly_usage_summary')
        .update({ warning_email_sent_at: now.toISOString() })
        .eq('user_id', summary.user_id)
        .eq('month_start', summary.month_start);
    }

    await this.dispatchAlertEmail('spend', {
      userId: summary.user_id,
      summary,
      endpoint,
      totalCost: summary.total_cost,
      level,
    });

    await this.logAlertEvent(summary.user_id, summary.month_start, 'spend', level, {
      endpoint,
      totalCost: summary.total_cost,
    });
  }

  private async logAlertEvent(
    userId: string,
    monthStart: string,
    alertType: string,
    level: AlertLevel,
    details: Record<string, unknown>
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('usage_alert_events')
      .insert({
        user_id: userId,
        month_start: monthStart,
        alert_type: alertType,
        alert_level: level,
        details,
      });

    if (error) {
      console.error('[UsageLimitService] Failed to log alert event', error);
    }
  }

  private async dispatchAlertEmail(
    alertType: 'spend' | 'rate-limit',
    context: {
      userId: string;
      summary: MonthlySummaryRow | null;
      endpoint: string;
      totalCost: number;
      level: AlertLevel;
    }
  ): Promise<void> {
    const [primaryRecipient] = ALERT_RECIPIENTS;

    const monthStart = context.summary?.month_start ?? this.getMonthStart(new Date());
    const locale = 'en';

    const levelLabel = this.getLevelLabel(context.level, locale);
    const subject = `${levelLabel}: user ${context.userId} usage alert`;

    const html = Mustache.render(getAdminAlertTemplate(), {
      brandEmoji: '🍽️',
      brandName: 'Meal Maestro',
      tagline: 'Your AI-powered recipe companion',
      supportEmail: 'info@meal-maestro.com',
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
      { to: primaryRecipient }
    );
  }

  private getMonthStart(date: Date): string {
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
  }

  private formatMonthLabel(monthStart: string): string {
    const date = new Date(monthStart);
    if (Number.isNaN(date.getTime())) {
      return monthStart;
    }

    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  private getLevelLabel(level: AlertLevel, locale: string): string {
    const labels: Record<string, Record<AlertLevel, string>> = {
      en: {
        warning: 'Usage warning',
        limit: 'Usage limit reached',
        'rate-limit': 'Rate limit activity',
      },
      nl: {
        warning: 'Waarschuwing voor gebruik',
        limit: 'Gebruikslimiet bereikt',
        'rate-limit': 'Rate-limit activatie',
      },
    };

    const localeKey = labels[locale] ? locale : 'en';
    return labels[localeKey][level];
  }

  private isOutsideBuffer(lastSentIso: string, now: Date, bufferMinutes: number): boolean {
    const lastSent = new Date(lastSentIso);
    const diffMinutes = (now.getTime() - lastSent.getTime()) / 60000;
    return diffMinutes >= bufferMinutes;
  }
}

export const usageLimitService = new UsageLimitService();

let adminAlertTemplateCache: string | null = null;

function getAdminAlertTemplate(): string {
  if (!adminAlertTemplateCache) {
    const templatePath = join(
      process.cwd(),
      'src/lib/email/templates/admin-usage-alert.mustache'
    );
    adminAlertTemplateCache = readFileSync(templatePath, 'utf-8');
    Mustache.parse(adminAlertTemplateCache);
  }

  return adminAlertTemplateCache;
}
