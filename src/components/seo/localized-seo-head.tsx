"use client";

import Head from "next/head";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

interface LocalizedSEOHeadProps {
  pageKey: string; // e.g., "about", "homepage", "login"
}

export function LocalizedSEOHead({ pageKey }: LocalizedSEOHeadProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("seo");

  const baseUrl = "https://meal-maestro.com";
  // For localized pages, the canonical should include the locale
  const canonicalUrl = `${baseUrl}${pathname}`;

  // Get localized content
  const title = t(`${pageKey}.title`);
  const description = t(`${pageKey}.description`);
  const keywords = t(`${pageKey}.keywords`);
  const ogTitle = t(`${pageKey}.ogTitle`);
  const ogDescription = t(`${pageKey}.ogDescription`);

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content="Meal Maestro" />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={canonicalUrl} />

      {/* Hreflang tags */}
      <link rel="alternate" hrefLang="en" href={`${baseUrl}/en${pathname.replace(/^\/[^\/]+/, '') || '/'}`} />
      <link rel="alternate" hrefLang="nl" href={`${baseUrl}/nl${pathname.replace(/^\/[^\/]+/, '') || '/'}`} />
      <link rel="alternate" hrefLang="x-default" href={`${baseUrl}${pathname.replace(/^\/[^\/]+/, '') || '/'}`} />

      {/* OpenGraph tags */}
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={t("global.siteName")} />
      <meta property="og:image" content="https://meal-maestro.com/icon-512x512.png" />
      <meta property="og:image:width" content="512" />
      <meta property="og:image:height" content="512" />
      <meta property="og:image:alt" content={`${t("global.siteName")} App Icon`} />
      <meta property="og:locale" content={locale === "nl" ? "nl_NL" : "en_US"} />

    </Head>
  );
}