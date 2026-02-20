import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ResetPasswordPageClient from "./page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "resetPassword" });

  return {
    title: t("title"),
  };
}

export default function ResetPasswordPage() {
  return <ResetPasswordPageClient />;
}
