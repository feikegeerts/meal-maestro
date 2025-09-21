import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a locale is present
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  // Load main messages, legal content messages, and SEO messages
  const [mainMessages, termsMessages, privacyMessages, seoMessages] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../../messages/terms-${locale}.json`),
    import(`../../messages/privacy-${locale}.json`),
    import(`../../messages/seo-${locale}.json`)
  ]);

  return {
    locale,
    messages: {
      ...mainMessages.default,
      terms: termsMessages.default,
      privacy: privacyMessages.default,
      seo: seoMessages.default
    }
  };
});