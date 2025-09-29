import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildLocalizedMetadata } from "@/lib/seo/metadata";
import TermsOfServicePageClient from "./page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildLocalizedMetadata({
    locale,
    pageKey: "terms",
    t,
    segments: ["terms"],
  });
}

export default function TermsOfServicePage() {
  return <TermsOfServicePageClient />;
}
