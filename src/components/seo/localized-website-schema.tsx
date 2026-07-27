"use client";

import { useTranslations } from "next-intl";
import { LocalizedJsonLdSchema } from "./localized-json-ld-schema";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://meal-maestro.com";

export function LocalizedWebsiteSchema() {
  const t = useTranslations("seo");

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: t("global.siteName"),
    url: BASE_URL,
    description: t("global.description"),
    publisher: {
      "@type": "Organization",
      name: t("global.siteName")
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}/recipes?search={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return <LocalizedJsonLdSchema schema={websiteSchema} />;
}