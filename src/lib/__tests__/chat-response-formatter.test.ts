// Mock @/db to prevent module-level DATABASE_URL initialization
jest.mock('@/db', () => ({
  db: {},
}));

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
