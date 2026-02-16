import "./globals.css";
import "./print.css";
import { AuthProvider } from "@/lib/auth-context";
import { RecipeProvider } from "@/contexts/recipe-context";
import { MainNav } from "@/components/navigation/main-nav";
import { Footer } from "@/components/footer";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import homepageEn from "@/messages/homepage.en.json";
import homepageNl from "@/messages/homepage.nl.json";
import seoEn from "@/messages/seo-en.json";
import seoNl from "@/messages/seo-nl.json";
import { notFound } from "next/navigation";
import { routing } from "../i18n/routing";
import { setRequestLocale } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import { PWAInstallBanner } from "@/components/pwa/install-banner";
import { MigrationToast } from "@/components/notifications/migration-toast";
import { LocalizedWebsiteSchema } from "@/components/seo/localized-website-schema";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client
  // side is the easiest way to get started
  const baseMessages = await getMessages();

  // Merge in homepage namespace from dedicated files (single source of truth)
  // Define a minimal extension type for our added namespaces without using 'any'
  type NamespaceObject = Record<string, unknown>;
  type ExtendedMessages = typeof baseMessages & {
    homepage: NamespaceObject;
    seo: NamespaceObject;
  };

  const homepageMap: Record<string, NamespaceObject> = {
    en: homepageEn as NamespaceObject,
    nl: homepageNl as NamespaceObject,
  };
  const seoMap: Record<string, NamespaceObject> = {
    en: seoEn as NamespaceObject,
    nl: seoNl as NamespaceObject,
  };

  const messages: ExtendedMessages = {
    ...(baseMessages as typeof baseMessages),
    homepage:
      homepageMap[locale] ??
      ((baseMessages as Record<string, unknown>).homepage as NamespaceObject) ??
      {},
    seo:
      seoMap[locale] ??
      ((baseMessages as Record<string, unknown>).seo as NamespaceObject) ??
      {},
  };

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="meal-maestro-theme"
      disableTransitionOnChange
    >
      <NextIntlClientProvider messages={messages}>
        <AuthProvider>
          <RecipeProvider>
            <div className="min-h-screen flex flex-col">
              <MainNav />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <Toaster richColors position="top-right" theme="system" />
            <PWAInstallBanner />
            <MigrationToast />
            <LocalizedWebsiteSchema />
          </RecipeProvider>
        </AuthProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
