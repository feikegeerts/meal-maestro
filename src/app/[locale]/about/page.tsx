import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AboutPageClient from "./page-client";
import { buildLocalizedMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildLocalizedMetadata({
    locale,
    pageKey: "about",
    t,
    segments: ["about"],
  });
}

export default function AboutPage() {
  return <AboutPageClient />;
}
