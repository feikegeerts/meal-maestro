"use client";

import { ChefHat, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/app/i18n/routing";
import { useTranslations } from "next-intl";

export default function TermsOfServicePage() {
  const t = useTranslations("terms");
  return (
    <>
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
              <a href="#acceptance" className="block text-primary hover:underline">1. {t("tableOfContents.acceptance")}</a>
              <a href="#service-description" className="block text-primary hover:underline">2. {t("tableOfContents.serviceDescription")}</a>
              <a href="#user-accounts" className="block text-primary hover:underline">3. {t("tableOfContents.userAccounts")}</a>
              <a href="#acceptable-use" className="block text-primary hover:underline">4. {t("tableOfContents.acceptableUse")}</a>
              <a href="#content-ownership" className="block text-primary hover:underline">5. {t("tableOfContents.contentOwnership")}</a>
              <a href="#ai-features" className="block text-primary hover:underline">6. {t("tableOfContents.aiFeatures")}</a>
              <a href="#service-availability" className="block text-primary hover:underline">7. {t("tableOfContents.serviceAvailability")}</a>
              <a href="#cost-transparency" className="block text-primary hover:underline">8. {t("tableOfContents.costTransparency")}</a>
              <a href="#limitation-of-liability" className="block text-primary hover:underline">9. {t("tableOfContents.limitationOfLiability")}</a>
              <a href="#termination" className="block text-primary hover:underline">10. {t("tableOfContents.termination")}</a>
              <a href="#changes-to-terms" className="block text-primary hover:underline">11. {t("tableOfContents.changesToTerms")}</a>
              <a href="#governing-law" className="block text-primary hover:underline">12. {t("tableOfContents.governingLaw")}</a>
              <a href="#contact" className="block text-primary hover:underline">13. {t("tableOfContents.contact")}</a>
            </nav>
          </div>

          <section id="acceptance" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">1. {t("sections.acceptance.title")}</h2>
            <div className="whitespace-pre-line">
              {t("sections.acceptance.content")}
            </div>
          </section>

          <section id="service-description" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">2. {t("sections.serviceDescription.title")}</h2>
            <p>{t("sections.serviceDescription.intro")}</p>
            <ul>
              {t.raw("sections.serviceDescription.features").map((feature: string, index: number) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
            <p>{t("sections.serviceDescription.disclaimer")}</p>
          </section>

          <section id="user-accounts" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">3. {t("sections.userAccounts.title")}</h2>
            
            <h3 className="text-xl font-semibold mb-3">{t("sections.userAccounts.accountCreation.title")}</h3>
            <p>{t("sections.userAccounts.accountCreation.intro")}</p>
            <ul>
              {t.raw("sections.userAccounts.accountCreation.requirements").map((req: string, index: number) => (
                <li key={index}>{req}</li>
              ))}
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">{t("sections.userAccounts.accountResponsibilities.title")}</h3>
            <p>{t("sections.userAccounts.accountResponsibilities.intro")}</p>
            <ul>
              {t.raw("sections.userAccounts.accountResponsibilities.responsibilities").map((resp: string, index: number) => (
                <li key={index}>{resp}</li>
              ))}
            </ul>
          </section>

          <section id="acceptable-use" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">4. {t("sections.acceptableUse.title")}</h2>
            
            <h3 className="text-xl font-semibold mb-3">{t("sections.acceptableUse.permittedUse.title")}</h3>
            <p>{t("sections.acceptableUse.permittedUse.content")}</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">{t("sections.acceptableUse.prohibitedActivities.title")}</h3>
            <p>{t("sections.acceptableUse.prohibitedActivities.intro")}</p>
            <ul>
              {t.raw("sections.acceptableUse.prohibitedActivities.activities").map((activity: string, index: number) => (
                <li key={index}>{activity}</li>
              ))}
            </ul>
          </section>

          <section id="content-ownership" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">5. {t("sections.contentOwnership.title")}</h2>
            
            <h3 className="text-xl font-semibold mb-3">{t("sections.contentOwnership.yourContent.title")}</h3>
            <p>{t("sections.contentOwnership.yourContent.intro")}</p>
            <ul>
              {t.raw("sections.contentOwnership.yourContent.licenses").map((license: string, index: number) => (
                <li key={index}>{license}</li>
              ))}
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">{t("sections.contentOwnership.ourIntellectualProperty.title")}</h3>
            <p>{t("sections.contentOwnership.ourIntellectualProperty.intro")}</p>
            <ul>
              {t.raw("sections.contentOwnership.ourIntellectualProperty.restrictions").map((restriction: string, index: number) => (
                <li key={index}>{restriction}</li>
              ))}
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">{t("sections.contentOwnership.thirdPartyContent.title")}</h3>
            <p>{t("sections.contentOwnership.thirdPartyContent.content")}</p>
          </section>

          <section id="ai-features" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">6. {t("sections.aiFeatures.title")}</h2>
            
            <h3 className="text-xl font-semibold mb-3">{t("sections.aiFeatures.aiProcessing.title")}</h3>
            <p>{t("sections.aiFeatures.aiProcessing.intro")}</p>
            <ul>
              {t.raw("sections.aiFeatures.aiProcessing.understanding").map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">{t("sections.aiFeatures.aiLimitations.title")}</h3>
            <p>{t("sections.aiFeatures.aiLimitations.intro")}</p>
            <ul>
              {t.raw("sections.aiFeatures.aiLimitations.noGuarantees").map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section id="service-availability" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">7. {t("sections.serviceAvailability.title")}</h2>
            <p>{t("sections.serviceAvailability.intro")}</p>
            <ul>
              {t.raw("sections.serviceAvailability.causes").map((cause: string, index: number) => (
                <li key={index}>{cause}</li>
              ))}
            </ul>
            <p>{t("sections.serviceAvailability.notice")}</p>
          </section>

          <section id="cost-transparency" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">8. {t("sections.costTransparency.title")}</h2>
            <p>{t("sections.costTransparency.intro")}</p>
            <ul>
              {t.raw("sections.costTransparency.model").map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <p>{t("sections.costTransparency.disclaimer")}</p>
          </section>

          <section id="limitation-of-liability" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">9. {t("sections.limitationOfLiability.title")}</h2>
            <p>{t("sections.limitationOfLiability.intro")}</p>
            <ul>
              {t.raw("sections.limitationOfLiability.limitations").map((limitation: string, index: number) => (
                <li key={index}>{limitation}</li>
              ))}
            </ul>
            <p>{t("sections.limitationOfLiability.totalLiability")}</p>
          </section>

          <section id="termination" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">10. {t("sections.termination.title")}</h2>
            
            <h3 className="text-xl font-semibold mb-3">{t("sections.termination.terminationByYou.title")}</h3>
            <p>{t("sections.termination.terminationByYou.content")}</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">{t("sections.termination.terminationByUs.title")}</h3>
            <p>{t("sections.termination.terminationByUs.intro")}</p>
            <ul>
              {t.raw("sections.termination.terminationByUs.reasons").map((reason: string, index: number) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">{t("sections.termination.effectOfTermination.title")}</h3>
            <p>{t("sections.termination.effectOfTermination.intro")}</p>
            <ul>
              {t.raw("sections.termination.effectOfTermination.effects").map((effect: string, index: number) => (
                <li key={index}>{effect}</li>
              ))}
            </ul>
          </section>

          <section id="changes-to-terms" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">11. {t("sections.changesToTerms.title")}</h2>
            <p>{t("sections.changesToTerms.intro")}</p>
            <ul>
              {t.raw("sections.changesToTerms.process").map((step: string, index: number) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
          </section>

          <section id="governing-law" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">12. {t("sections.governingLaw.title")}</h2>
            <p>{t("sections.governingLaw.intro")}</p>
            <ul>
              {t.raw("sections.governingLaw.resolution").map((method: string, index: number) => (
                <li key={index}>{method}</li>
              ))}
            </ul>
          </section>

          <section id="contact" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">13. {t("sections.contact.title")}</h2>
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
