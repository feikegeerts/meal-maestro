"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "@/app/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { PageLoading } from "@/components/ui/page-loading";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ChefHatIcon } from "@/components/ui/chef-hat-icon";
import { useTranslations } from 'next-intl';
import { LocalizedSEOHead } from "@/components/seo/localized-seo-head";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const t = useTranslations('home');
  const tAuth = useTranslations('auth');

  useEffect(() => {
    // Redirect authenticated users to recipes
    if (!loading && user) {
      router.push('/recipes');
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Handle authentication errors from callback
    const error = searchParams.get('error');
    if (error && !user) {
      let errorMessage = '';
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
    <>
      <LocalizedSEOHead pageKey="login" />

      <PageWrapper>
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-md mx-auto md:max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="flex items-center justify-center mb-6">
              <ChefHatIcon className="h-16 w-16 md:h-20 md:w-20 text-primary" width={80} height={80} />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              {t('title')}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-4">
              {t('subtitle')}
            </p>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('description')}
            </p>
          </div>

          {/* Authentication Section */}
          <div className="bg-card rounded-lg shadow-lg p-6 md:p-8">
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
                  {t('getStarted')}
                </h2>
                <p className="text-muted-foreground text-sm md:text-base">
                  {t('signInDescription')}
                </p>
              </div>

              {authError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-destructive text-sm">{authError}</p>
                </div>
              )}

              <div className="space-y-4">
                <GoogleLoginButton />
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      {tAuth('or') || 'Or'}
                    </span>
                  </div>
                </div>

                <MagicLinkForm />
              </div>

              <div className="text-xs text-muted-foreground leading-relaxed">
                <p>
                  {t('termsText')}
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </PageWrapper>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginContent />
    </Suspense>
  );
}