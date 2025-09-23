"use client";

import "./homepage.css";
import { Suspense } from "react";
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
  Scale,
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
import { LocalizedSEOHead } from "@/components/seo/localized-seo-head";
import {
  LocalizedJsonLdSchema,
  useLocalizedSchemas,
} from "@/components/seo/localized-json-ld-schema";

function HomeContent() {
  const { user, profile, loading, signOut } = useAuth();
  const { organizationSchema, softwareApplicationSchema } =
    useLocalizedSchemas();

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
      <LocalizedSEOHead pageKey="homepage" />
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
                Recipe Organization
                <br />
                <span className="cinematic-text">Made Easy</span>
              </h1>
            </ScrollAnimation>

            <ScrollAnimation animation="fadeIn" delay={0.4}>
              <p className="text-xl md:text-2xl lg:text-3xl text-muted-foreground mb-6 max-w-4xl mx-auto font-light">
                Transform scattered recipes into an organized digital cookbook
                with AI-powered intelligence
              </p>
            </ScrollAnimation>

            <ScrollAnimation animation="slideUp" delay={0.6}>
              <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
                Import from anywhere. Organize effortlessly. Scale perfectly.
                Cook confidently.
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
                        Welcome back, {profile?.display_name || "User"}!
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <Link href="/recipes">
                        <Button
                          size="lg"
                          className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <BookOpen className="mr-2 h-5 w-5" />
                          View My Recipes
                        </Button>
                      </Link>
                      <Button
                        onClick={handleSignOut}
                        variant="outline"
                        size="lg"
                        className="text-lg px-8 py-6 liquid-glass-cta"
                      >
                        <LogOut className="mr-2 h-5 w-5" />
                        Sign Out
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
                        Start Organizing
                      </Button>
                    </Link>
                    <Link href="/about">
                      <Button
                        variant="outline"
                        size="lg"
                        className="text-lg px-8 py-6 liquid-glass-cta"
                      >
                        Learn More
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
                    Collect Recipes
                    <br />
                    <span className="cinematic-text">From Anywhere</span>
                  </h2>
                </ScrollAnimation>

                <ScrollAnimation animation="fadeIn" delay={0.3}>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    Import existing recipes from any source. Extract recipes from
                    websites instantly or digitize your handwritten cookbook pages
                    and recipe cards with AI-powered recognition.
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
                        <h3 className="font-semibold mb-1">URL Import</h3>
                        <p className="text-sm text-muted-foreground">
                          Paste any recipe link and we&apos;ll extract it
                          instantly
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
                        <h3 className="font-semibold mb-1">Recipe Photos</h3>
                        <p className="text-sm text-muted-foreground">
                          Photograph handwritten recipes, cookbook pages, or recipe cards
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
                        <h3 className="font-semibold mb-1">Copy & Paste</h3>
                        <p className="text-sm text-muted-foreground">
                          Copy recipe text from any source and paste it directly
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
                    AI Recipe
                    <br />
                    <span className="cinematic-text">Assistant</span>
                  </h2>
                </ScrollAnimation>

                <ScrollAnimation animation="fadeIn" delay={0.3}>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    Create original recipes through natural conversation. Brainstorm
                    meal ideas, get cooking suggestions, or modify existing recipes
                    with an AI that understands your preferences and dietary needs.
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
                        <p className="font-medium">Recipe Brainstorming</p>
                        <p className="text-sm text-muted-foreground">
                          Chat with AI to develop new recipes based on your cravings and constraints
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
                        <p className="font-medium">Ingredient-Based Recipes</p>
                        <p className="text-sm text-muted-foreground">
                          Photograph your available ingredients and get personalized recipe suggestions
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
                        <p className="font-medium">Recipe Modification</p>
                        <p className="text-sm text-muted-foreground">
                          Adapt existing recipes for dietary restrictions or ingredient substitutions
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
                    Find Any Recipe
                    <br />
                    <span className="cinematic-text">Instantly</span>
                  </h2>
                </ScrollAnimation>

                <ScrollAnimation animation="fadeIn" delay={0.3}>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    Advanced filtering across 95+ criteria. Search by cuisine,
                    diet, cooking method, ingredients, or any combination. Your
                    perfect recipe is always just a click away.
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
                        <p className="font-medium">Full-text Search</p>
                        <p className="text-sm text-muted-foreground">
                          Search across all recipe content, ingredients, and
                          descriptions
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
                        <p className="font-medium">Smart Filters</p>
                        <p className="text-sm text-muted-foreground">
                          9 categories with 95+ filtering options for precise
                          discovery
                        </p>
                      </div>
                    </div>
                  </ScrollAnimation>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Scaling Section */}
        <section className="section-padding bg-gradient-to-b from-muted/20 to-background">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-start">
              <div className="lg:col-span-7 space-y-8">
                <ScrollAnimation animation="fadeIn" delay={0.1}>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
                    Perfect Portions
                    <br />
                    <span className="cinematic-text">Every Time</span>
                  </h2>
                </ScrollAnimation>

                <ScrollAnimation animation="fadeIn" delay={0.3}>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    Intelligent serving size scaling with automatic unit
                    conversion. Cook for one or feed a crowd with perfectly
                    calculated ingredients.
                  </p>
                </ScrollAnimation>

                <div className="space-y-4">
                  <ScrollAnimation animation="slideUp" delay={0.4}>
                    <div className="flex items-center gap-4 p-4 rounded-lg liquid-glass-card interactive-liquid">
                      {/* Inverted: neutral circle, warning-colored icon */}
                      <div className="bg-muted rounded-full p-3">
                        <Scale
                          className="h-6 w-6"
                          style={{ color: "var(--warning)" }}
                        />
                      </div>
                      <div>
                        <p className="font-medium">Smart Scaling</p>
                        <p className="text-sm text-muted-foreground">
                          Automatically adjusts all ingredients proportionally
                          for any serving size
                        </p>
                      </div>
                    </div>
                  </ScrollAnimation>

                  <ScrollAnimation animation="slideUp" delay={0.5}>
                    <div className="flex items-center gap-4 p-4 rounded-lg liquid-glass-card interactive-liquid">
                      {/* Inverted: neutral circle, warning-colored icon */}
                      <div className="bg-muted rounded-full p-3">
                        <Utensils
                          className="h-6 w-6"
                          style={{ color: "var(--warning)" }}
                        />
                      </div>
                      <div>
                        <p className="font-medium">Unit Conversion</p>
                        <p className="text-sm text-muted-foreground">
                          Choose metric, imperial, or mixed units to match your
                          preferences
                        </p>
                      </div>
                    </div>
                  </ScrollAnimation>
                </div>
              </div>

              <div className="lg:col-span-5">
                <ScrollAnimation animation="fadeIn" delay={0.2}>
                  <VideoDemo
                    // videoSrc="/videos/recipe-scaling-demo.mp4"
                    // posterSrc="/videos/recipe-scaling-poster.jpg"
                  />
                </ScrollAnimation>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="section-padding bg-gradient-to-b from-background to-primary/5 hero-gradient">
          <div className="container mx-auto px-4 text-center">
            <ScrollAnimation animation="scaleIn" delay={0.1}>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-8 tracking-tight">
                Ready to Transform
                <br />
                <span className="cinematic-text">Your Kitchen?</span>
              </h2>
            </ScrollAnimation>

            <ScrollAnimation animation="fadeIn" delay={0.3}>
              <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                Join thousands of home cooks who&apos;ve already organized their
                recipe collections
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
                    Start Your Culinary Journey
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
