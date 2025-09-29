"use client";

import "./homepage.css";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/app/i18n/routing";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import {
  User,
  LogOut,
  BookOpen,
  Search,
  Camera,
  Bot,
  Download,
  Filter,
  Utensils,
} from "lucide-react";
import { ChefHatIcon } from "@/components/ui/chef-hat-icon";
import {
  ScrollAnimation,
  FloatingElement,
} from "@/components/ui/scroll-animations";
import { VideoDemo } from "@/components/ui/video-demo";
import Image from "next/image";
import {
  LocalizedJsonLdSchema,
  useLocalizedSchemas,
} from "@/components/seo/localized-json-ld-schema";

function HomeContent() {
  const { user, profile, loading, signOut } = useAuth();
  const { organizationSchema, softwareApplicationSchema } =
    useLocalizedSchemas();
  const t = useTranslations("homepage");

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
    <>
      <LocalizedJsonLdSchema schema={organizationSchema} />
      <LocalizedJsonLdSchema schema={softwareApplicationSchema} />

      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden hero-gradient animate-gradientShift liquid-glass-hero">
          {/* Video placeholder for future integration */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/10" />

          <div className="relative z-10 container mx-auto px-4 text-center">
            <FloatingElement amplitude={8} duration={4} delay={0}>
              <div className="flex items-center justify-center mb-8">
                <ChefHatIcon
                  className="h-20 w-20 md:h-24 md:w-24 text-primary"
                  width={96}
                  height={96}
                />
              </div>
            </FloatingElement>

            <ScrollAnimation animation="textReveal" delay={0.2}>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground mb-6 tracking-tight">
                {t("heroLine1")}
                <br />
                <span className="cinematic-text">{t("heroLine2")}</span>
              </h1>
            </ScrollAnimation>

            <ScrollAnimation animation="fadeIn" delay={0.4}>
              <p className="text-xl md:text-2xl lg:text-3xl text-muted-foreground mb-6 max-w-4xl mx-auto font-light">
                {t("heroDesc1")}
              </p>
            </ScrollAnimation>

            <ScrollAnimation animation="slideUp" delay={0.6}>
              <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
                {t("heroDesc2")}
              </p>
            </ScrollAnimation>

            {/* CTAs */}
            <ScrollAnimation animation="scaleIn" delay={0.8}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                {user ? (
                  <div className="flex flex-col items-center gap-6">
                    <div className="flex items-center gap-4 liquid-glass-cta interactive-liquid rounded-full px-6 py-3">
                      <div className="bg-primary/20 rounded-full p-3">
                        {profile?.avatar_url ? (
                          <Image
                            src={profile.avatar_url}
                            alt={profile.display_name || "User avatar"}
                            width={24}
                            height={24}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <p className="text-lg font-medium text-foreground">
                        {t("welcomeBack", {
                          name: profile?.display_name || "User",
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <Link href="/recipes">
                        <Button
                          size="lg"
                          className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <BookOpen className="mr-2 h-5 w-5" />
                          {t("ctaViewRecipes")}
                        </Button>
                      </Link>
                      <Button
                        onClick={handleSignOut}
                        variant="outline"
                        size="lg"
                        className="text-lg px-8 py-6 liquid-glass-cta"
                      >
                        <LogOut className="mr-2 h-5 w-5" />
                        {t("ctaSignOut")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Link href="/login">
                      <Button
                        size="lg"
                        className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <User className="mr-2 h-5 w-5" />
                        {t("ctaGetStarted")}
                      </Button>
                    </Link>
                    <Link href="/about">
                      <Button
                        variant="outline"
                        size="lg"
                        className="text-lg px-8 py-6 liquid-glass-cta"
                      >
                        {t("ctaLearnMore")}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </ScrollAnimation>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center glass-effect">
              <div className="w-1 h-3 bg-primary/60 rounded-full mt-2 animate-pulse" />
            </div>
          </div>
        </section>

        {/* Collection Section */}
        <section className="section-padding bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-start">
              <div className="lg:col-span-7 space-y-8">
                <ScrollAnimation animation="fadeIn" delay={0.1}>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
                    {t("captureTitleLine1")}
                    <br />
                    <span className="cinematic-text">
                      {t("captureTitleLine2")}
                    </span>
                  </h2>
                </ScrollAnimation>

                <ScrollAnimation animation="fadeIn" delay={0.3}>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    {t("captureDescription")}
                  </p>
                </ScrollAnimation>

                <div className="space-y-4">
                  {/* Inverted: neutral circle, colored icon (primary) */}
                  <ScrollAnimation animation="slideUp" delay={0.4}>
                    <div className="flex items-center gap-4 p-4 rounded-lg liquid-glass-card interactive-liquid">
                      <div className="bg-muted rounded-full p-3">
                        <Download className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">
                          {t("featureUrlImportTitle")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t("featureUrlImportDesc")}
                        </p>
                      </div>
                    </div>
                  </ScrollAnimation>

                  <ScrollAnimation animation="slideUp" delay={0.5}>
                    <div className="flex items-center gap-4 p-4 rounded-lg liquid-glass-card interactive-liquid">
                      <div className="bg-muted rounded-full p-3">
                        <Camera className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">
                          {t("featurePhotosTitle")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t("featurePhotosDesc")}
                        </p>
                      </div>
                    </div>
                  </ScrollAnimation>

                  <ScrollAnimation animation="slideUp" delay={0.6}>
                    <div className="flex items-center gap-4 p-4 rounded-lg liquid-glass-card interactive-liquid">
                      <div className="bg-muted rounded-full p-3">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">
                          {t("featureCopyPasteTitle")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t("featureCopyPasteDesc")}
                        </p>
                      </div>
                    </div>
                  </ScrollAnimation>
                </div>
              </div>

              <div className="lg:col-span-5">
                <ScrollAnimation animation="fadeIn" delay={0.2}>
                  <VideoDemo
                  // videoSrc="/videos/recipe-import-demo.mp4"
                  // posterSrc="/videos/recipe-import-poster.jpg"
                  />
                </ScrollAnimation>
              </div>
            </div>
          </div>
        </section>

        {/* AI Assistant Section */}
        <section className="section-padding bg-gradient-to-b from-muted/20 to-background">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-start">
              <div className="order-2 lg:order-1 lg:col-span-5">
                <ScrollAnimation animation="fadeIn" delay={0.2}>
                  <VideoDemo
                  // videoSrc="/videos/ai-chat-demo.mp4"
                  // posterSrc="/videos/ai-chat-poster.jpg"
                  />
                </ScrollAnimation>
              </div>
              <div className="order-1 lg:order-2 lg:col-span-7 space-y-8">
                <ScrollAnimation animation="fadeIn" delay={0.1}>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
                    {t("aiTitleLine1")}
                    <br />
                    <span className="cinematic-text">{t("aiTitleLine2")}</span>
                  </h2>
                </ScrollAnimation>

                <ScrollAnimation animation="fadeIn" delay={0.3}>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    {t("aiDescription")}
                  </p>
                </ScrollAnimation>

                <div className="space-y-4">
                  {/* Inverted: neutral circle, purple-colored icon */}
                  <ScrollAnimation animation="slideUp" delay={0.4}>
                    <div className="flex items-center gap-4 p-4 rounded-lg liquid-glass-card interactive-liquid">
                      <div className="bg-muted rounded-full p-3">
                        <Bot className="h-6 w-6 text-purple" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {t("featureBrainstormTitle")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("featureBrainstormDesc")}
                        </p>
                      </div>
                    </div>
                  </ScrollAnimation>

                  <ScrollAnimation animation="slideUp" delay={0.5}>
                    <div className="flex items-center gap-4 p-4 rounded-lg liquid-glass-card interactive-liquid">
                      <div className="bg-muted rounded-full p-3">
                        <Camera className="h-6 w-6 text-purple" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {t("featureIngredientImageTitle")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("featureIngredientImageDesc")}
                        </p>
                      </div>
                    </div>
                  </ScrollAnimation>

                  <ScrollAnimation animation="slideUp" delay={0.6}>
                    <div className="flex items-center gap-4 p-4 rounded-lg liquid-glass-card interactive-liquid">
                      <div className="bg-muted rounded-full p-3">
                        <Utensils className="h-6 w-6 text-purple" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {t("featureModificationTitle")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("featureModificationDesc")}
                        </p>
                      </div>
                    </div>
                  </ScrollAnimation>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Organization Section */}
        <section className="section-padding bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-start">
              <div className="lg:col-span-5 lg:order-2">
                <ScrollAnimation animation="fadeIn" delay={0.2}>
                  <VideoDemo
                  // videoSrc="/videos/recipe-table-demo.mp4"
                  // posterSrc="/videos/recipe-table-poster.jpg"
                  />
                </ScrollAnimation>
              </div>
              <div className="lg:col-span-7 lg:order-1 space-y-8">
                <ScrollAnimation animation="fadeIn" delay={0.1}>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
                    {t("searchTitleLine1")}
                    <br />
                    <span className="cinematic-text">
                      {t("searchTitleLine2")}
                    </span>
                  </h2>
                </ScrollAnimation>

                <ScrollAnimation animation="fadeIn" delay={0.3}>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    {t("searchDescription")}
                  </p>
                </ScrollAnimation>

                <div className="space-y-4">
                  <ScrollAnimation animation="slideUp" delay={0.4}>
                    <div className="flex items-center gap-4 p-4 rounded-lg liquid-glass-card interactive-liquid">
                      {/* Inverted: neutral circle, info-colored icon */}
                      <div className="bg-muted rounded-full p-3">
                        <Search
                          className="h-6 w-6"
                          style={{ color: "var(--info)" }}
                        />
                      </div>
                      <div>
                        <p className="font-medium">
                          {t("featureFullTextTitle")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("featureFullTextDesc")}
                        </p>
                      </div>
                    </div>
                  </ScrollAnimation>

                  <ScrollAnimation animation="slideUp" delay={0.5}>
                    <div className="flex items-center gap-4 p-4 rounded-lg liquid-glass-card interactive-liquid">
                      {/* Inverted: neutral circle, info-colored icon */}
                      <div className="bg-muted rounded-full p-3">
                        <Filter
                          className="h-6 w-6"
                          style={{ color: "var(--info)" }}
                        />
                      </div>
                      <div>
                        <p className="font-medium">
                          {t("featureSmartFiltersTitle")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("featureSmartFiltersDesc")}
                        </p>
                      </div>
                    </div>
                  </ScrollAnimation>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="section-padding bg-gradient-to-b from-muted/20 to-primary/5">
          <div className="container mx-auto px-4 text-center">
            <ScrollAnimation animation="scaleIn" delay={0.1}>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-8 tracking-tight">
                {t("finalCtaTitleLine1")}
                <br />
                <span className="cinematic-text">
                  {t("finalCtaTitleLine2")}
                </span>
              </h2>
            </ScrollAnimation>

            <ScrollAnimation animation="fadeIn" delay={0.3}>
              <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                {t("finalCtaDescription")}
              </p>
            </ScrollAnimation>

            {!user && (
              <ScrollAnimation animation="scaleIn" delay={0.5}>
                <Link href="/login">
                  <Button
                    size="lg"
                    className="text-lg px-12 py-6 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <User className="mr-2 h-5 w-5" />
                    {t("ctaCreateLibrary")}
                  </Button>
                </Link>
              </ScrollAnimation>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<PageLoading />}>
      <HomeContent />
    </Suspense>
  );
}
