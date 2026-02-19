import type { MockedFunction } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  getDateLocaleFormat,
  formatDate,
  formatDateWithFallback,
  useLocalizedDateFormatter,
} from '../date-utils';
import { useLocale } from 'next-intl';

vi.mock('next-intl', () => ({
  useLocale: vi.fn(),
}));

describe('date-utils', () => {
  const mockedUseLocale = useLocale as MockedFunction<typeof useLocale>;

  beforeEach(() => {
    mockedUseLocale.mockReset();
  });

  describe('getDateLocaleFormat', () => {
    it('returns Dutch formatting with two-digit month and day', () => {
      const formatOptions = getDateLocaleFormat('nl');
      expect(formatOptions).toEqual({ year: 'numeric', month: '2-digit', day: '2-digit' });
    });

    it('defaults to numeric month/day for English', () => {
      const formatOptions = getDateLocaleFormat('en');
      expect(formatOptions).toEqual({ year: 'numeric', month: 'numeric', day: 'numeric' });
    });
  });

  describe('formatDate', () => {
    const isoDate = new Date(Date.UTC(2024, 1, 15)).toISOString();

    it('formats according to locale rules', () => {
      const expectedEn = new Date(isoDate).toLocaleDateString('en-US', getDateLocaleFormat('en'));
      const expectedNl = new Date(isoDate).toLocaleDateString('nl-NL', getDateLocaleFormat('nl'));

      expect(formatDate(isoDate, 'en')).toBe(expectedEn);
      expect(formatDate(isoDate, 'nl')).toBe(expectedNl);
    });

    it('returns "Invalid Date" when parsing fails', () => {
      expect(formatDate('not-a-date', 'en')).toBe('Invalid Date');
    });

    it('returns empty string when no date provided', () => {
      expect(formatDate(undefined, 'en')).toBe('');
    });
  });

  describe('formatDateWithFallback', () => {
    const isoDate = new Date(Date.UTC(2024, 5, 30)).toISOString();

    it('returns formatted date when available', () => {
      const expected = new Date(isoDate).toLocaleDateString('en-US', getDateLocaleFormat('en'));
      expect(formatDateWithFallback(isoDate, 'en', 'Fallback')).toBe(expected);
    });

    it('returns fallback text when date missing', () => {
      expect(formatDateWithFallback(undefined, 'en', 'Fallback')).toBe('Fallback');
    });
  });

  describe('useLocalizedDateFormatter', () => {
    const isoDate = new Date(Date.UTC(2023, 10, 5)).toISOString();

    it('uses locale from next-intl and exposes helpers', () => {
      mockedUseLocale.mockReturnValue('nl');

      const { result } = renderHook(() => useLocalizedDateFormatter());
      const expected = new Date(isoDate).toLocaleDateString('nl-NL', getDateLocaleFormat('nl'));

      expect(result.current.locale).toBe('nl');
      expect(result.current.formatDate(isoDate)).toBe(expected);
      expect(result.current.formatDateWithFallback(undefined, 'No date')).toBe('No date');
    });
  });
});
