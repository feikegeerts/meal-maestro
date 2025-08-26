"use client";

import { Suspense } from "react";
import { Link } from "@/app/i18n/routing";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { User, LogOut, ChefHat, BookOpen } from "lucide-react";
import Image from "next/image";
import { useTranslations } from 'next-intl';

function HomeContent() {
  const { user, profile, loading, signOut } = useAuth();
  const t = useTranslations('home');

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  return (
    <PageWrapper>
      <div className="container mx-auto px-4 py-8 md:py-16">
        {/* Hero Section */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <ChefHat className="h-16 w-16 md:h-20 md:w-20 text-primary" />
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
          
          {/* Call to Action */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              /* Authenticated User CTA */
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-2 relative overflow-hidden">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.display_name || "User avatar"}
                        width={20}
                        height={20}
                        className="rounded-full object-cover absolute inset-0 w-full h-full p-0"
                      />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      {t('welcomeBack')}, {profile?.display_name || "User"}!
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Link href="/recipes">
                    <Button size="lg">
                      <BookOpen className="mr-2 h-5 w-5" />
                      {t('goToRecipes')}
                    </Button>
                  </Link>
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    size="lg"
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    {t('signOut')}
                  </Button>
                </div>
              </div>
            ) : (
              /* Unauthenticated User CTA */
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link href="/login">
                  <Button size="lg">
                    <User className="mr-2 h-5 w-5" />
                    {t('getStarted')}
                  </Button>
                </Link>
                <Link href="/about">
                  <Button variant="outline" size="lg">
                    Learn More
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<PageLoading />}>
      <HomeContent />
    </Suspense>
  );
}
