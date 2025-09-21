"use client";

import { ChefHat, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/app/i18n/routing";
import { useTranslations } from "next-intl";
import { LocalizedSEOHead } from "@/components/seo/localized-seo-head";

export default function PrivacyPolicyPage() {
  const t = useTranslations("privacy");
  return (
    <>
      <LocalizedSEOHead pageKey="privacy" />

      <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("navigation.backToMealMaestro")}
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Meal Maestro</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-2">{t("title")}</h1>
          <p className="text-muted-foreground mb-8">
            {t("lastUpdated")} {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {/* Table of Contents */}
          <div className="bg-muted/30 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">{t("tableOfContents.title")}</h2>
            <nav className="space-y-2">
              <a href="#information-we-collect" className="block text-primary hover:underline">1. {t("tableOfContents.informationWeCollect")}</a>
              <a href="#how-we-use-information" className="block text-primary hover:underline">2. {t("tableOfContents.howWeUseInformation")}</a>
              <a href="#third-party-services" className="block text-primary hover:underline">3. {t("tableOfContents.thirdPartyServices")}</a>
              <a href="#data-security" className="block text-primary hover:underline">4. {t("tableOfContents.dataSecurity")}</a>
              <a href="#data-retention" className="block text-primary hover:underline">5. {t("tableOfContents.dataRetention")}</a>
              <a href="#your-rights" className="block text-primary hover:underline">6. {t("tableOfContents.yourRights")}</a>
              <a href="#cookies" className="block text-primary hover:underline">7. {t("tableOfContents.cookies")}</a>
              <a href="#changes" className="block text-primary hover:underline">8. {t("tableOfContents.changes")}</a>
              <a href="#contact" className="block text-primary hover:underline">9. {t("tableOfContents.contact")}</a>
            </nav>
          </div>

          <section id="information-we-collect" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">1. {t("sections.informationWeCollect.title")}</h2>
            
            <h3 className="text-xl font-semibold mb-3">{t("sections.informationWeCollect.accountInformation.title")}</h3>
            <p>{t("sections.informationWeCollect.accountInformation.intro")}</p>
            <ul>
              {t.raw("sections.informationWeCollect.accountInformation.data").map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">{t("sections.informationWeCollect.recipeData.title")}</h3>
            <p>{t("sections.informationWeCollect.recipeData.intro")}</p>
            <ul>
              {t.raw("sections.informationWeCollect.recipeData.data").map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">{t("sections.informationWeCollect.usageInformation.title")}</h3>
            <p>{t("sections.informationWeCollect.usageInformation.intro")}</p>
            <ul>
              {t.raw("sections.informationWeCollect.usageInformation.data").map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section id="how-we-use-information" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">2. {t("sections.howWeUseInformation.title")}</h2>
            <p>{t("sections.howWeUseInformation.intro")}</p>
            <ul>
              {t.raw("sections.howWeUseInformation.uses").map((use: string, index: number) => (
                <li key={index}>{use}</li>
              ))}
            </ul>
          </section>

          <section id="third-party-services" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">3. {t("sections.thirdPartyServices.title")}</h2>
            
            <h3 className="text-xl font-semibold mb-3">{t("sections.thirdPartyServices.googleOAuth.title")}</h3>
            <p>{t("sections.thirdPartyServices.googleOAuth.content")}</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">{t("sections.thirdPartyServices.supabase.title")}</h3>
            <p>{t("sections.thirdPartyServices.supabase.content")}</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">{t("sections.thirdPartyServices.openai.title")}</h3>
            <p>{t("sections.thirdPartyServices.openai.intro")}</p>
            <ul>
              {t.raw("sections.thirdPartyServices.openai.practices").map((practice: string, index: number) => (
                <li key={index}>{practice}</li>
              ))}
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">{t("sections.thirdPartyServices.vercel.title")}</h3>
            <p>{t("sections.thirdPartyServices.vercel.intro")}</p>
            <ul>
              {t.raw("sections.thirdPartyServices.vercel.services").map((service: string, index: number) => (
                <li key={index}>{service}</li>
              ))}
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">{t("sections.thirdPartyServices.otherServices.title")}</h3>
            <ul>
              {t.raw("sections.thirdPartyServices.otherServices.services").map((service: { name: string; purpose: string }, index: number) => (
                <li key={index}><strong>{service.name}:</strong> {service.purpose}</li>
              ))}
            </ul>
          </section>

          <section id="data-security" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">4. {t("sections.dataSecurity.title")}</h2>
            <p>{t("sections.dataSecurity.intro")}</p>
            <ul>
              {t.raw("sections.dataSecurity.measures").map((measure: string, index: number) => (
                <li key={index}>{measure}</li>
              ))}
            </ul>
            <p>{t("sections.dataSecurity.disclaimer")}</p>
          </section>

          <section id="data-retention" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">5. {t("sections.dataRetention.title")}</h2>
            <ul>
              {t.raw("sections.dataRetention.policies").map((policy: { type: string; retention: string }, index: number) => (
                <li key={index}><strong>{policy.type}:</strong> {policy.retention}</li>
              ))}
            </ul>
            <p>{t("sections.dataRetention.accountDeletion")}</p>
          </section>

          <section id="your-rights" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">6. {t("sections.yourRights.title")}</h2>
            <p>{t("sections.yourRights.intro")}</p>
            <ul>
              {t.raw("sections.yourRights.rights").map((right: { name: string; description: string }, index: number) => (
                <li key={index}><strong>{right.name}:</strong> {right.description}</li>
              ))}
            </ul>
            <p>{t("sections.yourRights.contact")}</p>
          </section>

          <section id="cookies" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">7. {t("sections.cookies.title")}</h2>
            <p>{t("sections.cookies.intro")}</p>
            <ul>
              {t.raw("sections.cookies.uses").map((use: { name: string; purpose: string }, index: number) => (
                <li key={index}><strong>{use.name}:</strong> {use.purpose}</li>
              ))}
            </ul>
            <p>{t("sections.cookies.control")}</p>
          </section>

          <section id="changes" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">8. {t("sections.changes.title")}</h2>
            <p>{t("sections.changes.intro")}</p>
            <ul>
              {t.raw("sections.changes.process").map((step: string, index: number) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
            <p>{t("sections.changes.acceptance")}</p>
          </section>

          <section id="contact" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">9. {t("sections.contact.title")}</h2>
            <p>{t("sections.contact.intro")}</p>
            <div className="bg-muted/30 rounded-lg p-4 mt-4">
              <p><strong>{t("sections.contact.email")}</strong> {t("sections.contact.emailAddress")}</p>
            </div>
          </section>

          <div className="border-t pt-8 mt-12">
            <p className="text-sm text-muted-foreground text-center">
              {t("footer.effective", { date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) })}
            </p>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}