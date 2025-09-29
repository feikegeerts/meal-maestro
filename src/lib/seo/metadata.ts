import type { Metadata } from "next";
import { routing } from "@/app/i18n/routing";

const BASE_URL = "https://meal-maestro.com";
const OG_IMAGE = `${BASE_URL}/icon-512x512.png`;

interface BuildLocalizedMetadataOptions {
  locale: string;
  pageKey: string;
  t: (key: string) => string;
  segments?: string[];
}

function buildLocalizedPath(locale: string, segments: string[] = []): string {
  const suffix = segments.length > 0 ? `/${segments.join("/")}` : "";
  return `/${locale}${suffix}`;
}

function buildLanguageAlternates(segments: string[] = []): Record<string, string> {
  const suffix = segments.length > 0 ? `/${segments.join("/")}` : "/";
  const languages: Record<string, string> = {};

  for (const locale of routing.locales) {
    languages[locale] = `${BASE_URL}/${locale}${suffix === "/" ? "" : suffix}`;
  }

  languages["x-default"] = `${BASE_URL}${suffix}`;

  return languages;
}

export function buildLocalizedMetadata({
  locale,
  pageKey,
  t,
  segments = [],
}: BuildLocalizedMetadataOptions): Metadata {
  const title = t(`${pageKey}.title`);
  const description = t(`${pageKey}.description`);
  const keywords = t(`${pageKey}.keywords`);
  const ogTitle = t(`${pageKey}.ogTitle`);
  const ogDescription = t(`${pageKey}.ogDescription`);
  const siteName = t("global.siteName");

  const path = buildLocalizedPath(locale, segments);
  const canonicalUrl = `${BASE_URL}${path}`;
  const languages = buildLanguageAlternates(segments);
  const localeTag = locale === "nl" ? "nl_NL" : "en_US";

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: {
      type: "website",
      locale: localeTag,
      url: canonicalUrl,
      siteName,
      title: ogTitle,
      description: ogDescription,
      images: [
        {
          url: OG_IMAGE,
          width: 512,
          height: 512,
          alt: `${siteName} App Icon`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [OG_IMAGE],
    },
  };
}
