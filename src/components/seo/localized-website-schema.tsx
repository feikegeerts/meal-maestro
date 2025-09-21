"use client";

import { useTranslations } from "next-intl";
import { LocalizedJsonLdSchema } from "./localized-json-ld-schema";

export function LocalizedWebsiteSchema() {
  const t = useTranslations("seo");

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: t("global.siteName"),
    url: "https://meal-maestro.com",
    description: t("global.description"),
    publisher: {
      "@type": "Organization",
      name: t("global.siteName")
    },
    potentialAction: {
      "@type": "SearchAction",
      target: "https://meal-maestro.com/recipes?search={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return <LocalizedJsonLdSchema schema={websiteSchema} />;
}