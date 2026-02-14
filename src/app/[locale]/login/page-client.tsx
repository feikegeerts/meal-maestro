"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter } from "@/app/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
// TODO: Re-enable when Neon Auth ships webhook support for custom email templates
// import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { PageLoading } from "@/components/ui/page-loading";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ChefHatIcon } from "@/components/ui/chef-hat-icon";
import { useLocale, useTranslations } from 'next-intl';
import { sanitizeRedirectPath, resolveLocaleAwarePath } from "@/lib/auth-redirect";
import { routing } from "@/app/i18n/routing";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const t = useTranslations('home');
  const tAuth = useTranslations('auth');
  const locale = useLocale();

  const redirectParam = useMemo(() => {
    const raw = searchParams.get('redirectTo');
    return sanitizeRedirectPath(raw);
  }, [searchParams]);

  const callbackRedirectPath = useMemo(() => {
    const basePath = redirectParam ?? '/recipes';
    const { path } = resolveLocaleAwarePath({
      path: basePath,
      locale,
      availableLocales: routing.locales,
      defaultLocale: routing.defaultLocale,
    });
    return path;
  }, [redirectParam, locale]);

  useEffect(() => {
    // Redirect authenticated users to recipes
    if (!loading && user) {
      router.push(redirectParam ?? '/recipes');
      return;
    }
  }, [user, loading, router, redirectParam]);

  useEffect(() => {
    // Handle authentication errors from callback
    const error = searchParams.get('error');
    if (error && !user) {
      let errorMessage: string;
      switch (error) {
        case 'invalid_link':
          errorMessage = tAuth('invalidLink');
          break;
        case 'auth_cancelled':
          errorMessage = tAuth('authCancelled');
          break;
        case 'timeout':
          errorMessage = tAuth('authTimeout');
          break;
        case 'auth_error':
          errorMessage = tAuth('authError');
          break;
        default:
          errorMessage = tAuth('unexpectedError');
      }
      setAuthError(errorMessage);
      
      // Clear error from URL after a delay
      setTimeout(() => {
        router.replace('/login', undefined);
        setAuthError(null);
      }, 5000);
    }
  }, [user, router, searchParams, tAuth]);

  if (loading) {
    return <PageLoading />;
  }

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return <PageLoading />;
  }

  return (
    <PageWrapper>
      <div className="container mx-auto px-4 py-10 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-10 lg:grid lg:grid-cols-2 lg:items-start lg:gap-16">
            {/* Header */}
            <div className="text-center lg:text-left space-y-4">
              <div className="flex items-center justify-center lg:justify-start">
                <ChefHatIcon
                  className="h-14 w-14 md:h-16 md:w-16 text-primary"
                  width={64}
                  height={64}
                />
              </div>
              <div className="space-y-3 lg:space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                  {t("title")}
                </h1>
                <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground">
                  {t("subtitle")}
                </p>
                <p className="text-base md:text-lg text-muted-foreground lg:max-w-xl">
                  {t("description")}
                </p>
              </div>
            </div>

            {/* Authentication Section */}
            <div className="bg-card rounded-lg shadow-lg p-6 md:p-8 lg:w-full lg:max-w-md lg:justify-self-end">
              <div className="text-center space-y-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
                    {t("getStarted")}
                  </h2>
                  <p className="text-muted-foreground text-sm md:text-base">
                    {t("signInDescription")}
                  </p>
                </div>

                {authError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <p className="text-destructive text-sm">{authError}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <GoogleLoginButton
                    redirectPath={callbackRedirectPath}
                    locale={locale}
                  />
                </div>

                <div className="text-xs text-muted-foreground leading-relaxed">
                  <p>{t("termsText")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginContent />
    </Suspense>
  );
}
