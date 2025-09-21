"use client";

import { useTranslations } from "next-intl";

interface LocalizedJsonLdSchemaProps {
  schema: Record<string, unknown>;
}

export function LocalizedJsonLdSchema({ schema }: LocalizedJsonLdSchemaProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Hook to get localized schemas
export function useLocalizedSchemas() {
  const t = useTranslations("seo");

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: t("global.siteName"),
    url: "https://meal-maestro.com",
    logo: "https://meal-maestro.com/icon-512x512.png",
    description: t("schema.organization.description"),
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "hello@meal-maestro.com"
    }
  };

  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: t("global.siteName"),
    description: t("schema.softwareApplication.description"),
    url: "https://meal-maestro.com",
    operatingSystem: "Web Browser, iOS, Android",
    applicationCategory: "LifestyleApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock"
    },
    creator: {
      "@type": "Organization",
      name: t("global.siteName")
    },
    genre: ["Recipe Management", "Cooking", "Meal Planning", "AI Assistant"],
    keywords: t("global.keywords"),
    screenshot: "https://meal-maestro.com/icon-512x512.png",
    featureList: t.raw("schema.softwareApplication.featureList")
  };

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

  return {
    organizationSchema,
    softwareApplicationSchema,
    websiteSchema
  };
}