import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildLocalizedMetadata } from "@/lib/seo/metadata";
import HomeClient from "./page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildLocalizedMetadata({
    locale,
    pageKey: "homepage",
    t,
  });
}

export default function HomePage() {
  return <HomeClient />;
}
