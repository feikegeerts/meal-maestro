import { useLocale } from 'next-intl';

export type SupportedLocale = 'nl' | 'en';

export const getDateLocaleFormat = (locale: SupportedLocale): Intl.DateTimeFormatOptions => {
  switch (locale) {
    case 'nl':
      return {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      };
    case 'en':
      return {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      };
    default:
      return {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      };
  }
};

export const formatDate = (dateString: string | undefined, locale: SupportedLocale): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const formatOptions = getDateLocaleFormat(locale);
    
    return date.toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US', formatOptions);
  } catch {
    return 'Invalid date';
  }
};

export const formatDateWithFallback = (
  dateString: string | undefined, 
  locale: SupportedLocale, 
  fallbackText: string = 'Never'
): string => {
  if (!dateString) return fallbackText;
  return formatDate(dateString, locale);
};

export const useLocalizedDateFormatter = () => {
  const locale = useLocale() as SupportedLocale;
  
  return {
    formatDate: (dateString: string | undefined) => formatDate(dateString, locale),
    formatDateWithFallback: (dateString: string | undefined, fallbackText?: string) => 
      formatDateWithFallback(dateString, locale, fallbackText),
    locale,
  };
};