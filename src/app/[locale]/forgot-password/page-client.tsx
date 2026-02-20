"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ForgotPasswordPageClient() {
  const { requestPasswordReset } = useAuth();
  const t = useTranslations("forgotPassword");
  const tAuth = useTranslations("auth");
  const locale = useLocale();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error(t("emailRequired"));
      return;
    }

    if (!isValidEmail(email)) {
      toast.error(tAuth("invalidEmail"));
      return;
    }

    setIsLoading(true);

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}/${locale}/reset-password`;

      // We intentionally ignore the error to not reveal whether an account exists
      await requestPasswordReset(email.trim(), redirectTo);
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="container mx-auto px-4 py-10 lg:py-16 flex justify-center">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-lg p-6 md:p-8">
            {submitted ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <h1 className="text-xl font-semibold text-foreground">
                  {t("successTitle")}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {t("successDescription")}
                </p>
                <Link
                  href="/login"
                  className="inline-block text-sm text-primary underline hover:no-underline"
                >
                  {t("backToSignIn")}
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
                    {t("title")}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {t("description")}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    type="email"
                    placeholder={tAuth("emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    autoComplete="email"
                    autoFocus
                  />

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("sending")}
                      </>
                    ) : (
                      t("submit")
                    )}
                  </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground">
                  <Link
                    href="/login"
                    className="underline hover:text-foreground transition-colors"
                  >
                    {t("backToSignIn")}
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
