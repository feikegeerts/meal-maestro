"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/app/i18n/routing";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

const languages = [
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "en", name: "English", flag: "🇺🇸" },
];

export function LanguagePreferenceSetting() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const { profile, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLanguageChange = async (newLocale: string) => {
    // Skip if already in the requested locale
    if (locale === newLocale) {
      return;
    }

    if (!profile) {
      return;
    }

    setIsLoading(true);

    try {
      // Update both the database preference AND the page locale
      const success = await updateProfile({
        language_preference: newLocale,
      });

      if (success) {
        // Only navigate after successful database update
        router.push(pathname, { locale: newLocale });
        toast.success("Language preference updated");
      } else {
        throw new Error("Failed to update language preference");
      }
    } catch (error) {
      console.error("Error updating language preference:", error);
      toast.error("Failed to save language preference");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Globe className="h-4 w-4" />
        {t("language")}
      </h3>
      <div className="space-y-2">
        {languages.map((language) => (
          <Button
            key={language.code}
            variant={locale === language.code ? "secondary" : "ghost"}
            onClick={() => handleLanguageChange(language.code)}
            disabled={isLoading}
            className="w-full justify-start gap-3"
          >
            <span className="text-sm">{language.flag}</span>
            <span className="text-sm">{language.name}</span>
            {locale === language.code && (
              <div className="ml-auto h-2 w-2 bg-primary rounded-full" />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}