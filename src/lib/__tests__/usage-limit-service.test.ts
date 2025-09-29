import * as SupabaseModule from '@supabase/supabase-js';
import * as EmailModule from '@/lib/email/services/email-delivery-service';
import type { OpenAIUsageData } from '../openai-service';
import { UsageLimitService } from '../usage-limit-service';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

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

interface UsageAlertEventPayload {
  user_id: string;
  month_start: string;
  alert_type: string;
  alert_level: string;
  details: Record<string, unknown>;
}

interface UpdateChain {
  eq: jest.Mock<UpdateChain, [string, unknown]>;
  is: jest.Mock<{ error: null }, [string, null]>;
}

interface MonthlySummaryQueryBuilder {
  select: jest.Mock<MonthlySummaryQueryBuilder, [string, Record<string, unknown>?]>;
  eq: jest.Mock<MonthlySummaryQueryBuilder, [string, unknown]>;
  maybeSingle: jest.Mock<Promise<{ data: MonthlySummaryRow | null; error: null }>, []>;
  update: jest.Mock<UpdateChain, [Record<string, unknown>]>;
}

interface UsageAlertQueryBuilder {
  select: jest.Mock<UsageAlertQueryBuilder, [string, Record<string, unknown>?]>;
  eq: jest.Mock<UsageAlertQueryBuilder, [string, unknown]>;
  gte: jest.Mock<Promise<{ count: number; error: null }>, [string, string]>;
  insert: jest.Mock<Promise<{ error: null }>, [UsageAlertEventPayload]>;
}

type RpcMockType = jest.Mock<Promise<{ data: MonthlySummaryRow; error: null }>, [string, Record<string, unknown>]>;
type FromMockType = jest.Mock<MonthlySummaryQueryBuilder | UsageAlertQueryBuilder, [string]>;
type SendEmailMockType = jest.Mock<Promise<void>, [unknown, { to: string }]>;

jest.mock('@supabase/supabase-js', () => {
  const rpcMock: RpcMockType = jest.fn();
  const fromMock: FromMockType = jest.fn();
  return {
    createClient: jest.fn(() => ({
      rpc: rpcMock,
      from: fromMock,
    })),
    __rpcMock: rpcMock,
    __fromMock: fromMock,
  };
});

jest.mock('@/lib/email/services/email-delivery-service', () => {
  const sendEmailMock: SendEmailMockType = jest.fn().mockResolvedValue(undefined);
  return {
    EmailDeliveryService: jest.fn(() => ({
      sendEmail: sendEmailMock,
    })),
    __sendEmailMock: sendEmailMock,
  };
});

const { __rpcMock: rpcMock, __fromMock: fromMock } = SupabaseModule as unknown as {
  __rpcMock: RpcMockType;
  __fromMock: FromMockType;
};

const { __sendEmailMock: sendEmailMock } = EmailModule as unknown as {
  __sendEmailMock: SendEmailMockType;
};

const createUpdateChain = (): UpdateChain => {
  const chain: UpdateChain = {
    eq: jest.fn(),
    is: jest.fn(),
  };
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue({ error: null });
  return chain;
};

describe('UsageLimitService alerts', () => {
  let usageService: UsageLimitService;
  let monthlyUpdates: Array<{ values: Record<string, unknown> }>;
  let usageAlertInserts: UsageAlertEventPayload[];
  let monthlySummaryData: MonthlySummaryRow | null;
  let usageAlertSelectCount: number;

  const createMonthlySummaryBuilder = (): MonthlySummaryQueryBuilder => {
    const builder: MonthlySummaryQueryBuilder = {
      select: jest.fn(),
      eq: jest.fn(),
      maybeSingle: jest.fn(),
      update: jest.fn(),
    };

    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.maybeSingle.mockImplementation(async () => ({
      data: monthlySummaryData,
      error: null,
    }));
    builder.update.mockImplementation((values: Record<string, unknown>) => {
      monthlyUpdates.push({ values });
      return createUpdateChain();
    });

    return builder;
  };

  const createUsageAlertBuilder = (): UsageAlertQueryBuilder => {
    const builder: UsageAlertQueryBuilder = {
      select: jest.fn(),
      eq: jest.fn(),
      gte: jest.fn(),
      insert: jest.fn(),
    };

    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.gte.mockImplementation(async () => ({ count: usageAlertSelectCount, error: null }));
    builder.insert.mockImplementation(async (payload: UsageAlertEventPayload) => {
      usageAlertInserts.push(payload);
      return { error: null };
    });

    return builder;
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-06-15T12:00:00Z'));
    rpcMock.mockReset();
    fromMock.mockReset();
    sendEmailMock.mockClear();

    monthlyUpdates = [];
    usageAlertInserts = [];
    monthlySummaryData = null;
    usageAlertSelectCount = 0;

    usageService = new UsageLimitService();

    fromMock.mockImplementation((table: string) => {
      if (table === 'monthly_usage_summary') {
        return createMonthlySummaryBuilder();
      }
      if (table === 'usage_alert_events') {
        return createUsageAlertBuilder();
      }
      throw new Error(`Unexpected table: ${table}`);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('enforces limit and dispatches spend alerts when threshold reached', async () => {
    const summary: MonthlySummaryRow = {
      user_id: 'user-1',
      month_start: '2024-06-01',
      total_cost: 0.3,
      total_tokens: 123,
      total_calls: 4,
      warning_email_sent_at: null,
      limit_email_sent_at: null,
      rate_limit_email_sent_at: null,
      limit_enforced_at: null,
    };

    rpcMock.mockResolvedValue({ data: summary, error: null });

    const usageData: OpenAIUsageData = {
      model: 'gpt-4.1-mini',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 123,
    };

    const result = await usageService.recordUsageEvent('user-1', usageData, {
      endpoint: 'recipes.chat',
      costUsd: 0.3,
      timestamp: new Date('2024-06-15T12:00:00Z'),
    });

    expect(result).toEqual({ summary, reachedWarning: true, reachedLimit: true });

    expect(rpcMock).toHaveBeenCalledWith(
      'increment_monthly_usage_summary',
      expect.objectContaining({
        p_user_id: 'user-1',
        p_cost: 0.3,
      })
    );

    expect(monthlyUpdates).toHaveLength(2);
    expect(monthlyUpdates[0].values).toHaveProperty('limit_enforced_at', expect.any(String));
    expect(monthlyUpdates[1].values).toHaveProperty('limit_email_sent_at', expect.any(String));

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0]?.[0]).toMatchObject({
      subject: expect.stringContaining('Usage limit reached'),
    });

    expect(usageAlertInserts).toEqual([
      expect.objectContaining({
        alert_type: 'spend',
        alert_level: 'limit',
        user_id: 'user-1',
        details: expect.objectContaining({ endpoint: 'recipes.chat', totalCost: 0.3 }),
      }),
    ]);
  });

  it('sends warning alert without enforcing limit when approaching threshold', async () => {
    const summary: MonthlySummaryRow = {
      user_id: 'user-2',
      month_start: '2024-06-01',
      total_cost: 0.2,
      total_tokens: 50,
      total_calls: 2,
      warning_email_sent_at: null,
      limit_email_sent_at: null,
      rate_limit_email_sent_at: null,
      limit_enforced_at: null,
    };

    rpcMock.mockResolvedValue({ data: summary, error: null });

    const usageData: OpenAIUsageData = {
      model: 'gpt-4.1-mini',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 50,
    };

    const result = await usageService.recordUsageEvent('user-2', usageData, {
      endpoint: 'recipes.chat',
      costUsd: 0.05,
    });

    expect(result).toEqual({ summary, reachedWarning: true, reachedLimit: false });

    expect(monthlyUpdates).toHaveLength(1);
    expect(monthlyUpdates[0].values).toHaveProperty('warning_email_sent_at', expect.any(String));
    expect(monthlyUpdates[0].values).not.toHaveProperty('limit_email_sent_at');

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0]?.[0]).toMatchObject({
      subject: expect.stringContaining('Usage warning'),
    });

    expect(usageAlertInserts[0]).toMatchObject({
      alert_type: 'spend',
      alert_level: 'warning',
      user_id: 'user-2',
    });
  });

  it('records rate limit alerts when no recent notifications exist', async () => {
    monthlySummaryData = {
      user_id: 'user-3',
      month_start: '2024-06-01',
      total_cost: 0.05,
      total_tokens: 10,
      total_calls: 1,
      warning_email_sent_at: null,
      limit_email_sent_at: null,
      rate_limit_email_sent_at: null,
      limit_enforced_at: null,
    };
    usageAlertSelectCount = 0;

    await usageService.recordRateLimitViolation('user-3', 'recipes.chat');

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0]?.[0]).toMatchObject({
      subject: expect.stringContaining('Rate limit activity'),
    });

    expect(monthlyUpdates).toHaveLength(1);
    expect(monthlyUpdates[0].values).toHaveProperty('rate_limit_email_sent_at', expect.any(String));

    expect(usageAlertInserts).toHaveLength(1);
    expect(usageAlertInserts[0]).toMatchObject({
      alert_type: 'rate-limit',
      alert_level: 'rate-limit',
      user_id: 'user-3',
      details: { endpoint: 'recipes.chat' },
    });
  });
});
