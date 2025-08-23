import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { RecipeProvider } from "@/contexts/recipe-context";
import { MainNav } from "@/components/navigation/main-nav";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../i18n/routing';
import { setRequestLocale } from 'next-intl/server';
import { ThemeProvider } from '@/components/theme-provider';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params
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
  const messages = await getMessages();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <NextIntlClientProvider messages={messages}>
        <AuthProvider>
          <RecipeProvider>
            <MainNav />
            {children}
            <Toaster richColors position="top-right" />
          </RecipeProvider>
        </AuthProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
