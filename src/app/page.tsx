"use client";

import { useAuth } from "@/lib/auth-context";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { User, LogOut, ChefHat } from "lucide-react";
import Image from "next/image";

export default function Home() {
  const { user, profile, loading, signOut } = useAuth();

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
        <div className="max-w-md mx-auto md:max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="flex items-center justify-center mb-4">
              <ChefHat className="h-12 w-12 md:h-16 md:w-16 text-primary" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
              Meal Maestro
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-2">
              AI-Powered Recipe Management
            </p>
            <p className="text-sm md:text-base text-muted-foreground">
              Organize, discover, and manage your recipes with natural language
              conversations
            </p>
          </div>

          {/* Authentication Section */}
          <div className="bg-card rounded-lg shadow-lg p-6 md:p-8">
            {user ? (
              /* Authenticated User UI */
              <div className="text-center space-y-6">
                <div className="flex items-center justify-center space-x-3">
                  <div className="bg-primary/10 rounded-full p-3 relative overflow-hidden">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.display_name || "User avatar"}
                        width={24}
                        height={24}
                        className="rounded-full object-cover absolute inset-0 w-full h-full p-0"
                      />
                    ) : (
                      <User className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">
                      {profile?.display_name ? profile.display_name : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    You&apos;re successfully signed in and ready to start
                    managing your recipes!
                  </p>

                  <div className="flex justify-center">
                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      size="lg"
                      className="h-12 md:h-10"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Unauthenticated User UI */
              <div className="text-center space-y-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
                    Get Started
                  </h2>
                  <p className="text-muted-foreground text-sm md:text-base">
                    Sign in with your Google account to start organizing your
                    recipes
                  </p>
                </div>

                <GoogleLoginButton />

                <div className="text-xs text-muted-foreground leading-relaxed">
                  <p>
                    By signing in, you agree to our terms of service and privacy
                    policy. Your recipes will be securely stored and only
                    accessible to you.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
