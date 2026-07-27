import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { routing } from "./i18n/routing";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://meal-maestro.com";

export const metadata: Metadata = {
  title: {
    default: "Meal Maestro - AI-Powered Recipe Management App",
    template: "%s | Meal Maestro",
  },
  description:
    "Organize, discover, and manage your recipes with AI-powered natural language processing. Privacy-focused recipe management app with no ads or subscriptions.",
  keywords:
    "recipe management, AI recipe organizer, digital cookbook, meal planning, cooking app, recipe collection, food management, receptbeheer, AI receptorganisator, digitaal kookboek, maaltijdplanning, kook app",
  authors: [{ name: "Meal Maestro" }],
  creator: "Meal Maestro",
  publisher: "Meal Maestro",
  icons: {
    icon: "/chef-hat-sparkle.svg",
    apple: {
      url: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "Meal Maestro",
    title: "Meal Maestro - AI-Powered Recipe Management App",
    description:
      "Privacy-focused AI recipe management app. Organize your recipes with natural language processing. No ads, no subscriptions.",
    images: [
      {
        url: `${APP_URL}/icon-512x512.png`,
        width: 512,
        height: 512,
        alt: "Meal Maestro App Icon",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "oklch(0.55 0.12 145)" },
    { media: "(prefers-color-scheme: dark)", color: "oklch(0.65 0.12 145)" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const locale = routing.defaultLocale;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
