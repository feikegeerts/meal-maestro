"use client";

import { useTranslations } from "next-intl";
import {
  Heart,
  Shield,
  Users,
  Zap,
  Globe,
  ExternalLink,
  Euro,
  DollarSign,
  Info,
} from "lucide-react";
import { ChefHatIcon } from "@/components/ui/chef-hat-icon";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getAppVersion, formatVersion } from "@/lib/version";
import { useAuth } from "@/lib/auth-context";
import { useUserCosts } from "@/lib/hooks/use-user-costs";
import { toast } from "sonner";

export default function AboutPage() {
  const t = useTranslations("about");
  const { user } = useAuth();
  const { data: costData, loading: costLoading } = useUserCosts({
    lazy: !user,
  });
  const { version } = getAppVersion();

  const values = [
    {
      icon: Shield,
      key: "respectsPrivacy" as const,
      color: "bg-info/20 text-info dark:bg-info/20 dark:text-info",
    },
    {
      icon: Zap,
      key: "adFree" as const,
      color: "bg-purple/20 text-purple dark:bg-purple/20 dark:text-purple",
    },
    {
      icon: Globe,
      key: "noSubscriptions" as const,
      color: "bg-warning/20 text-warning dark:bg-warning/20 dark:text-warning",
    },
    {
      icon: Users,
      key: "simpleToUse" as const,
      color: "bg-error/20 text-error dark:bg-error/20 dark:text-error",
    },
  ];

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Meal Maestro",
          text: "Check out Meal Maestro - an AI-powered recipe management app that respects your privacy!",
          url: window.location.origin,
        });
        // Native sharing succeeded, no toast needed
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          // Fallback to clipboard if native sharing failed (but not if user cancelled)
          try {
            await navigator.clipboard.writeText(window.location.origin);
            toast.success(t("shareSuccess"));
          } catch (_clipboardErr) {
            toast.error(t("shareError"));
          }
        }
      }
    } else {
      // Desktop fallback - copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.origin);
        toast.success(t("shareSuccess"));
      } catch (_err) {
        toast.error(t("shareError"));
      }
    }
  };

  const formatCost = (cost: number): string => {
    if (cost >= 1) {
      return `$${cost.toFixed(2)}`;
    } else if (cost >= 0.001) {
      return `$${cost.toFixed(4)}`;
    } else {
      return `$${cost.toFixed(6)}`;
    }
  };

  return (
    <div className="relative min-h-screen">
      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-10px) rotate(1deg);
          }
          66% {
            transform: translateY(5px) rotate(-1deg);
          }
        }
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.05);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>

      {/* Unified Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-muted/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-muted/30 rounded-full blur-3xl animate-pulse-slow"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-16 max-w-6xl relative z-10">
          {/* Hero Content */}
          <div className="text-center space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-4 mb-12">
                <div className="p-3 bg-primary/20 rounded-2xl backdrop-blur-sm border border-primary/20">
                  <ChefHatIcon className="h-12 w-12 text-primary" width={48} height={48} />
                </div>
                <h1 className="text-5xl md:text-6xl font-bold text-foreground">
                  {t("title")}
                </h1>
              </div>

              {/* Floating Values */}
              <div className="relative">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                  {values.map(({ icon: Icon, key, color }, index) => (
                    <div
                      key={key}
                      className="group relative p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-300 dark:border-slate-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-2 hover:rotate-1 opacity-0 animate-fade-in-up"
                      style={{
                        animationDelay: `${index * 150}ms`,
                        animationFillMode: "forwards",
                      }}
                    >
                      <div className="flex flex-col items-center space-y-3">
                        <div
                          className={`p-3 rounded-xl ${color
                            .replace("text-", "text-")
                            .replace(
                              "bg-",
                              "bg-"
                            )} transition-all duration-300 group-hover:scale-125 group-hover:rotate-12`}
                        >
                          <Icon className="h-6 w-6 transition-all duration-300" />
                        </div>
                        <span className="text-sm font-medium text-center leading-tight text-slate-700 dark:text-slate-300 transition-colors group-hover:text-primary">
                          {t(`values.${key}`)}
                        </span>
                      </div>

                      {/* Hover glow effect */}
                      <div className="absolute inset-0 rounded-2xl bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Version Info */}
              <div className="space-y-2 pt-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 rounded-full">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {t("version.current")}: {formatVersion(version)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="container mx-auto px-4 pt-6 pb-16 max-w-6xl relative">
        {/* Content Sections */}
        <div className="space-y-24">
          {/* Philosophy Section */}
          <section className="relative text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary leading-tight flex items-center justify-center gap-3 mb-6">
              <Shield className="h-8 w-8 text-primary" />
              {t("philosophy.title")}
            </h2>
            <p className="text-xl text-slate-700 dark:text-slate-300 leading-relaxed max-w-4xl mx-auto">
              {t("philosophy.description")}
            </p>
          </section>

          {/* Story Section */}
          <section className="relative text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary leading-tight flex items-center justify-center gap-3 mb-6">
              <Heart className="h-8 w-8 text-primary" />
              {t("story.title")}
            </h2>
            <p className="text-xl text-slate-700 dark:text-slate-300 leading-relaxed max-w-4xl mx-auto">
              {t("story.description")}
            </p>
          </section>

          {/* Costs Dashboard */}
          <section className="relative">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4 flex items-center justify-center gap-3">
                <Euro className="h-8 w-8 text-primary" />
                {t("costs.title")}
              </h2>
              <p className="text-xl text-slate-700 dark:text-slate-300 max-w-3xl mx-auto">
                {t("costs.description")}
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Your Usage Card */}
              <div className="relative group hover:-translate-y-2 transition-all duration-500">
                <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-300 dark:border-slate-600 rounded-3xl p-8 h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-info rounded-2xl flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-info-foreground" />
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {t("costs.usage.title")}
                      </h3>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="p-1 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 focus:bg-slate-200/60 dark:focus:bg-slate-700/60 focus:outline-none transition-colors">
                            <Info className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <p className="text-sm">
                            {t("costs.usage.yourCosts")}
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {user ? (
                    <div className="space-y-4">
                      {costLoading ? (
                        <div className="space-y-4">
                          <div className="h-8 w-full animate-pulse bg-muted rounded-xl"></div>
                          <div className="h-6 w-3/4 animate-pulse bg-muted rounded-lg"></div>
                          <div className="h-6 w-1/2 animate-pulse bg-muted rounded-lg"></div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-info/10 rounded-2xl p-6 border border-info/40 dark:border-info/40">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                {t("costs.usage.openai")}
                              </span>
                            </div>
                            <div className="text-3xl font-bold text-info dark:text-info">
                              {formatCost(costData?.totalCost || 0)}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {costData?.totalCalls || 0}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {t("costs.usage.calls")}
                              </div>
                            </div>
                            <div className="text-center p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {((costData?.totalTokens || 0) / 1000).toFixed(
                                  1
                                )}
                                K
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {t("costs.usage.tokens")}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-info/10 dark:bg-info/10 rounded-xl border border-info/40 dark:border-info/40">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {t("costs.usage.photoStorage")}
                            </span>
                            <span className="text-sm font-medium text-info dark:text-info">
                              {t("costs.usage.comingSoon")}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 text-center">
                        {t("costs.usage.signInToSee")}
                      </p>
                      <div className="space-y-4 opacity-60">
                        <div className="bg-muted/60 rounded-2xl p-6">
                          <div className="text-3xl font-bold text-slate-400 dark:text-slate-500">
                            $0.00
                          </div>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-slate-100/60 dark:bg-slate-800/60 rounded-xl">
                          <span className="text-sm text-slate-400 dark:text-slate-500">
                            {t("costs.usage.photoStorage")}
                          </span>
                          <span className="text-sm font-medium text-info/60 dark:text-info/60">
                            {t("costs.usage.comingSoon")}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Infrastructure Card */}
              <div
                className="relative group hover:-translate-y-2 transition-all duration-500"
                style={{ animationDelay: "200ms" }}
              >
                <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-300 dark:border-slate-600 rounded-3xl p-8 h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-success rounded-2xl flex items-center justify-center">
                      <Zap className="h-6 w-6 text-success-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {t("costs.infrastructure.title")}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {t("costs.infrastructure.domain")}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        €25/{t("costs.infrastructure.perYear")}
                      </span>
                    </div>

                    <div className="p-4 bg-success/10 dark:bg-success/10 rounded-xl border border-success/40 dark:border-success/40">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {t("costs.infrastructure.hosting")}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-success dark:text-success">
                            {t("costs.infrastructure.free")}
                          </span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="p-1 rounded-full hover:bg-success/20 dark:hover:bg-success/20 focus:bg-success/20 dark:focus:bg-success/20 focus:outline-none transition-colors">
                                <Info className="h-3 w-3 text-success dark:text-success hover:text-success/80 dark:hover:text-success/80 transition-colors" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-2">
                                <p className="text-sm font-medium">
                                  {t("costs.infrastructure.vercelLimits.title")}
                                </p>
                                <ul className="text-xs space-y-1 text-muted-foreground">
                                  <li>
                                    •{" "}
                                    {t(
                                      "costs.infrastructure.vercelLimits.bandwidth"
                                    )}
                                  </li>
                                  <li>
                                    •{" "}
                                    {t(
                                      "costs.infrastructure.vercelLimits.builds"
                                    )}
                                  </li>
                                  <li>
                                    •{" "}
                                    {t(
                                      "costs.infrastructure.vercelLimits.usage"
                                    )}
                                  </li>
                                  <li>
                                    •{" "}
                                    {t(
                                      "costs.infrastructure.vercelLimits.userLimit"
                                    )}
                                  </li>
                                </ul>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-success/10 dark:bg-success/10 rounded-xl border border-success/40 dark:border-success/40">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {t("costs.infrastructure.database")}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-success dark:text-success">
                            {t("costs.infrastructure.free")}
                          </span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="p-1 rounded-full hover:bg-success/20 dark:hover:bg-success/20 focus:bg-success/20 dark:focus:bg-success/20 focus:outline-none transition-colors">
                                <Info className="h-3 w-3 text-success dark:text-success hover:text-success/80 dark:hover:text-success/80 transition-colors" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-2">
                                <p className="text-sm font-medium">
                                  {t(
                                    "costs.infrastructure.supabaseLimits.title"
                                  )}
                                </p>
                                <ul className="text-xs space-y-1 text-muted-foreground">
                                  <li>
                                    •{" "}
                                    {t(
                                      "costs.infrastructure.supabaseLimits.bandwidth"
                                    )}
                                  </li>
                                  <li>
                                    •{" "}
                                    {t(
                                      "costs.infrastructure.supabaseLimits.storage"
                                    )}
                                  </li>
                                  <li>
                                    •{" "}
                                    {t(
                                      "costs.infrastructure.supabaseLimits.usage"
                                    )}
                                  </li>
                                  <li>
                                    •{" "}
                                    {t(
                                      "costs.infrastructure.supabaseLimits.userLimit"
                                    )}
                                  </li>
                                </ul>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Development Card */}
              <div
                className="relative group hover:-translate-y-2 transition-all duration-500"
                style={{ animationDelay: "400ms" }}
              >
                <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-300 dark:border-slate-600 rounded-3xl p-8 h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-purple rounded-2xl flex items-center justify-center">
                      <Users className="h-6 w-6 text-purple-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {t("costs.development.title")}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-purple/10 rounded-2xl p-6 border border-purple/40 dark:border-purple/40">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          {t("costs.development.aiSubscription")}
                        </span>
                      </div>
                      <div className="text-3xl font-bold text-purple dark:text-purple mb-1">
                        €120
                      </div>
                      <div className="text-xs text-purple/80 dark:text-purple/80">
                        {t("costs.development.oneTime")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sustainability Section */}
          <section className="relative">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold text-primary leading-tight flex items-center gap-3">
                  <Zap className="h-8 w-8 text-primary" />
                  {t("sustainability.title")}
                </h2>
                <p className="text-xl text-slate-700 dark:text-slate-300 leading-relaxed">
                  {t("sustainability.description")}
                </p>

                <div className="space-y-4">
                  <Button
                    size="lg"
                    className="w-full bg-purple hover:bg-purple/90 text-purple-foreground shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={() =>
                      window.open("https://paypal.me/feikegeerts", "_blank")
                    }
                  >
                    <Heart className="h-5 w-5 mr-3" />
                    {t("sustainability.tipJar")}
                    <ExternalLink className="h-4 w-4 ml-3" />
                  </Button>
                  {/* Mobile: Show clickable bank details */}
                  <div className="sm:hidden">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: "Bank Transfer Details",
                            text: "IBAN: NL07 ASNB 8851 7276 94\\nReference: Meal Maestro Donation",
                          });
                        } else {
                          navigator.clipboard?.writeText("NL07ASNB8851727694");
                        }
                      }}
                    >
                      💳 {t("sustainability.copyIban")}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="relative hidden sm:block">
                <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-300 dark:border-slate-600 rounded-3xl p-8">
                  {/* Desktop: Show QR code */}
                  <div className="text-center space-y-4">
                    <div className="inline-block p-4 bg-white dark:bg-slate-100 rounded-2xl shadow-lg">
                      <Image
                        src="/sepa-qr-code.png"
                        alt="SEPA QR Code for bank transfer"
                        width={160}
                        height={160}
                        className="w-40 h-40"
                      />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {t("sustainability.qrInstructions")}
                    </p>

                    <div className="text-center space-y-3">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t("sustainability.bankTransfer")}
                      </p>
                      <div className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-3">
                        NL07 ASNB 8851 7276 94
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Community Section */}
          <section className="relative text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary leading-tight flex items-center justify-center gap-3 mb-6">
              <Users className="h-8 w-8 text-primary" />
              {t("community.title")}
            </h2>
            <p className="text-xl text-slate-700 dark:text-slate-300 leading-relaxed max-w-4xl mx-auto mb-8">
              {t("community.description")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-primary/40 dark:border-primary/40 hover:bg-primary/10 dark:hover:bg-primary/10 py-2 px-6 h-auto"
                onClick={handleShare}
              >
                <Globe className="h-5 w-5 mr-3" />
                {t("community.shareButton")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex-1 opacity-60 cursor-not-allowed py-2 px-6 h-auto "
                disabled
                title="Coming soon!"
              >
                <ExternalLink className="h-5 w-5 mr-3" />
                {t("community.feedbackButton")}
                <Badge variant="secondary" className="ml-2 text-xs">
                  Soon
                </Badge>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
