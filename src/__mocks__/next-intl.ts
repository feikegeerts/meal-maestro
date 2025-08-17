// Mock for next-intl
export const useTranslations = () => {
  return (key: string, params?: Record<string, unknown>) => {
    // Return the key as-is for testing
    if (params) {
      return `${key} ${JSON.stringify(params)}`;
    }
    return key;
  };
};

export const useLocale = () => 'en';

export const useFormatter = () => ({
  dateTime: (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  },
  number: (value: number) => {
    return value.toString();
  },
});

export const NextIntlClientProvider = ({ children }: { children: React.ReactNode }) => children;

const mockExports = {
  useTranslations,
  useLocale,
  useFormatter,
  NextIntlClientProvider,
};

export default mockExports;