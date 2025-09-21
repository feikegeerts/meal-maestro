"use client";

import { LocalizedSEOHead } from "./localized-seo-head";

interface PageSEOProps {
  pageKey: string;
  locale?: string;
}

export function PageSEO({ pageKey }: PageSEOProps) {
  return <LocalizedSEOHead pageKey={pageKey} />;
}

// Example usage for other pages:
export function HomepageSEO() {
  return <PageSEO pageKey="homepage" />;
}

export function LoginSEO() {
  return <PageSEO pageKey="login" />;
}

export function TermsSEO() {
  return <PageSEO pageKey="terms" />;
}

export function PrivacySEO() {
  return <PageSEO pageKey="privacy" />;
}