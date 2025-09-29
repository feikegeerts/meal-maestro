jest.mock('@supabase/supabase-js', () => {
  type TableMock = {
    select: jest.Mock<TableMock, []>;
    eq: jest.Mock<TableMock, [unknown, unknown?]>;
    gte: jest.Mock<TableMock, [unknown, unknown?]>;
    not: jest.Mock<TableMock, [unknown, unknown?]>;
    order: jest.Mock<TableMock, [unknown, { ascending?: boolean }?]>;
    maybeSingle: jest.Mock<Promise<{ data: null; error: null }>, []>;
    update: jest.Mock<TableMock, [unknown?]>;
    insert: jest.Mock<Promise<{ error: null }>, [unknown?]>;
  };

  const createTableStub = (): TableMock => {
    const stub = {
      select: jest.fn(),
      eq: jest.fn(),
      gte: jest.fn(),
      not: jest.fn(),
      order: jest.fn(),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(),
      insert: jest.fn(() => Promise.resolve({ error: null })),
    } as unknown as TableMock;

    stub.select.mockReturnValue(stub);
    stub.eq.mockReturnValue(stub);
    stub.gte.mockReturnValue(stub);
    stub.not.mockReturnValue(stub);
    stub.order.mockReturnValue(stub);
    stub.update.mockReturnValue(stub);

    return stub;
  };

  const tableStub: TableMock = createTableStub();

  return {
    createClient: jest.fn(() => ({
      from: jest.fn(() => tableStub),
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  };
});

jest.mock('@/lib/email/services/email-delivery-service', () => ({
  EmailDeliveryService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn(() => Promise.resolve({ success: true })),
  })),
}));

import { ChatResponseFormatter } from '../chat-response-formatter';
import { MonthlySpendLimitError } from '../usage-limit-service';

describe('ChatResponseFormatter – monthly spend limit messaging', () => {
  const fixedDate = new Date('2025-10-15T12:00:00Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns the English reset message with next month date', async () => {
    const formatter = new ChatResponseFormatter('en');
    const error = new MonthlySpendLimitError(5, 5);

    const result = await formatter.formatErrorResponse(error);

    const now = new Date();
    const expectedDate = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    ).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });

    expect(result.status).toBe(402);
    expect(result.error).toBe(
      `You've reached this month's AI usage limit. It resets on ${expectedDate}.`
    );
  });

  it('returns the Dutch reset message with localized date', async () => {
    const formatter = new ChatResponseFormatter('nl');
    const error = new MonthlySpendLimitError(5, 5);

    const result = await formatter.formatErrorResponse(error);

    const now = new Date();
    const expectedDate = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    ).toLocaleDateString('nl-NL', {
      month: 'long',
      day: 'numeric',
    });

    expect(result.status).toBe(402);
    expect(result.error).toBe(
      `Je hebt de AI-limiet voor deze maand bereikt. De limiet wordt op ${expectedDate} automatisch vernieuwd.`
    );
  });
});
