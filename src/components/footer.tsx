"use client";

import { Link } from "@/app/i18n/routing";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-auto">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-center items-center space-x-6">
          <Link 
            href="/privacy" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("privacy", { default: "Privacy Policy" })}
          </Link>
          <Link 
            href="/terms" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("terms", { default: "Terms of Service" })}
          </Link>
        </div>
      </div>
    </footer>
  );
}