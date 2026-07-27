"use client";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://meal-maestro.com";
const OG_IMAGE = `${BASE_URL}/icon-512x512.png`;

interface JsonLdSchemaProps {
  schema: Record<string, unknown>;
}

export function JsonLdSchema({ schema }: JsonLdSchemaProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Predefined schemas
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Meal Maestro",
  url: BASE_URL,
  logo: OG_IMAGE,
  description: "AI-powered recipe management app that helps you organize, discover, and manage your recipes with natural language processing.",
  sameAs: [
    "https://twitter.com/mealmaestro"
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "hello@meal-maestro.com"
  }
};

export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Meal Maestro",
  description: "AI-powered recipe management app that helps you organize, discover, and manage your recipes with natural language processing. Privacy-focused with no ads or subscriptions.",
  url: BASE_URL,
  operatingSystem: "Web Browser, iOS, Android",
  applicationCategory: "LifestyleApplication",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    ratingCount: "1"
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock"
  },
  creator: {
    "@type": "Organization",
    name: "Meal Maestro"
  },
  genre: ["Recipe Management", "Cooking", "Meal Planning", "AI Assistant"],
  keywords: "recipe management, AI recipe organizer, digital cookbook, meal planning, cooking app",
  screenshot: OG_IMAGE,
  featureList: [
    "AI-powered recipe processing",
    "Natural language recipe management",
    "Recipe organization and search",
    "Ingredient management",
    "Privacy-focused design",
    "No ads or subscriptions"
  ]
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Meal Maestro",
  url: BASE_URL,
  description: "AI-powered recipe management app",
  publisher: {
    "@type": "Organization",
    name: "Meal Maestro"
  },
  potentialAction: {
    "@type": "SearchAction",
    target: `${BASE_URL}/recipes?search={search_term_string}`,
    "query-input": "required name=search_term_string"
  }
};