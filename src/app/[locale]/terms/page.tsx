"use client";

import { ChefHat, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/app/i18n/routing";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Meal Maestro
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
          <h1 className="text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {/* Table of Contents */}
          <div className="bg-muted/30 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Table of Contents</h2>
            <nav className="space-y-2">
              <a href="#acceptance" className="block text-primary hover:underline">1. Acceptance of Terms</a>
              <a href="#service-description" className="block text-primary hover:underline">2. Service Description</a>
              <a href="#user-accounts" className="block text-primary hover:underline">3. User Accounts</a>
              <a href="#acceptable-use" className="block text-primary hover:underline">4. Acceptable Use Policy</a>
              <a href="#content-ownership" className="block text-primary hover:underline">5. Content and Intellectual Property</a>
              <a href="#ai-features" className="block text-primary hover:underline">6. AI-Powered Features</a>
              <a href="#service-availability" className="block text-primary hover:underline">7. Service Availability</a>
              <a href="#cost-transparency" className="block text-primary hover:underline">8. Cost Transparency</a>
              <a href="#limitation-of-liability" className="block text-primary hover:underline">9. Limitation of Liability</a>
              <a href="#termination" className="block text-primary hover:underline">10. Termination</a>
              <a href="#changes-to-terms" className="block text-primary hover:underline">11. Changes to Terms</a>
              <a href="#governing-law" className="block text-primary hover:underline">12. Governing Law</a>
              <a href="#contact" className="block text-primary hover:underline">13. Contact Information</a>
            </nav>
          </div>

          <section id="acceptance" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p>By accessing or using Meal Maestro, you agree to be bound by these Terms of Service and our Privacy Policy. If you disagree with any part of these terms, you may not access or use our service.</p>
            <p>These terms apply to all visitors, users, and others who access or use the service.</p>
          </section>

          <section id="service-description" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">2. Service Description</h2>
            <p>Meal Maestro is an AI-powered recipe management system that allows users to:</p>
            <ul>
              <li>Store, organize, and manage personal recipe collections</li>
              <li>Use AI-powered features for recipe processing and suggestions</li>
              <li>Search and filter recipes using various criteria</li>
              <li>Track costs associated with AI operations</li>
              <li>Access recipes across multiple devices</li>
            </ul>
            <p>The service is provided &quot;as is&quot; and we reserve the right to modify or discontinue any aspect of the service at any time.</p>
          </section>

          <section id="user-accounts" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">3. User Accounts</h2>
            
            <h3 className="text-xl font-semibold mb-3">Account Creation</h3>
            <p>To use Meal Maestro, you must create an account using Google OAuth. You agree to:</p>
            <ul>
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account</li>
              <li>Promptly update account information if it changes</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Account Responsibilities</h3>
            <p>You are responsible for:</p>
            <ul>
              <li>Safeguarding your Google account credentials</li>
              <li>All content and activity associated with your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
              <li>Ensuring your account information remains current</li>
            </ul>
          </section>

          <section id="acceptable-use" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">4. Acceptable Use Policy</h2>
            
            <h3 className="text-xl font-semibold mb-3">Permitted Use</h3>
            <p>You may use Meal Maestro for personal recipe management and related culinary activities.</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Prohibited Activities</h3>
            <p>You may not:</p>
            <ul>
              <li>Use the service for any illegal or unauthorized purpose</li>
              <li>Share copyrighted recipes without proper attribution</li>
              <li>Attempt to reverse engineer, hack, or compromise the service</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Use the service to spam, harass, or abuse others</li>
              <li>Attempt to circumvent usage limits or cost controls</li>
              <li>Resell, redistribute, or commercialize the service without permission</li>
              <li>Use automated tools to scrape or extract data</li>
              <li>Impersonate others or create fake accounts</li>
            </ul>
          </section>

          <section id="content-ownership" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">5. Content and Intellectual Property</h2>
            
            <h3 className="text-xl font-semibold mb-3">Your Content</h3>
            <p>You retain ownership of all recipes and content you upload to Meal Maestro. By using our service, you grant us a limited license to:</p>
            <ul>
              <li>Store and process your recipes for service functionality</li>
              <li>Use AI services to enhance your recipe management experience</li>
              <li>Backup and maintain your data for service reliability</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Our Intellectual Property</h3>
            <p>The Meal Maestro service, including its design, features, and underlying technology, is owned by us and protected by intellectual property laws. You may not:</p>
            <ul>
              <li>Copy, modify, or distribute our software or design elements</li>
              <li>Use our trademarks or branding without permission</li>
              <li>Create derivative works based on our service</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Third-Party Content</h3>
            <p>When sharing recipes from other sources, you are responsible for respecting copyright and attribution requirements.</p>
          </section>

          <section id="ai-features" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">6. AI-Powered Features</h2>
            
            <h3 className="text-xl font-semibold mb-3">AI Processing</h3>
            <p>Our AI features use OpenAI&apos;s services to process your recipe-related requests. You understand that:</p>
            <ul>
              <li>AI-generated content may not always be accurate or suitable</li>
              <li>You should review and verify all AI suggestions before use</li>
              <li>AI processing incurs costs that are tracked and displayed transparently</li>
              <li>AI features may be subject to usage limits or availability constraints</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">AI Limitations</h3>
            <p>AI-powered features are provided for convenience and enhancement. We do not guarantee:</p>
            <ul>
              <li>Accuracy of AI-generated recipe suggestions or modifications</li>
              <li>Safety or suitability of AI-recommended ingredients or methods</li>
              <li>Nutritional accuracy of AI-processed information</li>
              <li>Continuous availability of AI features</li>
            </ul>
          </section>

          <section id="service-availability" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">7. Service Availability</h2>
            <p>We strive to maintain high service availability, but we do not guarantee uninterrupted access. The service may be temporarily unavailable due to:</p>
            <ul>
              <li>Scheduled maintenance and updates</li>
              <li>Technical issues or system failures</li>
              <li>Third-party service dependencies (Google, Supabase, OpenAI, Vercel)</li>
              <li>Emergency security measures</li>
            </ul>
            <p>We will make reasonable efforts to provide advance notice of scheduled maintenance.</p>
          </section>

          <section id="cost-transparency" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">8. Cost Transparency</h2>
            <p>Meal Maestro operates on a transparent cost model:</p>
            <ul>
              <li>The core service is free to use</li>
              <li>AI features incur costs based on OpenAI usage</li>
              <li>All AI-related costs are tracked and displayed to users</li>
              <li>No hidden fees or subscription charges</li>
              <li>Users can monitor their usage and associated costs in real-time</li>
            </ul>
            <p>We reserve the right to implement usage limits or request contributions to cover operational costs if necessary.</p>
          </section>

          <section id="limitation-of-liability" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Meal Maestro and its operators shall not be liable for:</p>
            <ul>
              <li>Any indirect, incidental, special, or consequential damages</li>
              <li>Loss of data, recipes, or content</li>
              <li>Service interruptions or downtime</li>
              <li>Errors in AI-generated content or suggestions</li>
              <li>Any harm resulting from following recipe suggestions or modifications</li>
              <li>Costs incurred due to service usage</li>
            </ul>
            <p>Our total liability for any claim related to the service is limited to the amount you have paid us in the past 12 months (which may be $0 for free users).</p>
          </section>

          <section id="termination" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">10. Termination</h2>
            
            <h3 className="text-xl font-semibold mb-3">Termination by You</h3>
            <p>You may terminate your account at any time by deleting your account through the service interface or contacting us directly.</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Termination by Us</h3>
            <p>We may suspend or terminate your account if you:</p>
            <ul>
              <li>Violate these Terms of Service</li>
              <li>Engage in prohibited activities</li>
              <li>Abuse the service or its resources</li>
              <li>Provide false information</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Effect of Termination</h3>
            <p>Upon termination:</p>
            <ul>
              <li>Your access to the service will cease immediately</li>
              <li>Your account data and recipes may be deleted</li>
              <li>These terms will remain in effect for applicable provisions</li>
              <li>You remain responsible for any costs incurred before termination</li>
            </ul>
          </section>

          <section id="changes-to-terms" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">11. Changes to Terms</h2>
            <p>We may update these Terms of Service to reflect changes in our service or legal requirements. When we make changes:</p>
            <ul>
              <li>We will update the &quot;Last updated&quot; date</li>
              <li>Significant changes will be communicated through the service</li>
              <li>Continued use of the service constitutes acceptance of updated terms</li>
              <li>If you disagree with changes, you may terminate your account</li>
            </ul>
          </section>

          <section id="governing-law" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">12. Governing Law</h2>
            <p>These Terms of Service are governed by and construed in accordance with applicable laws. Any disputes arising from these terms or your use of the service will be resolved through:</p>
            <ul>
              <li>Good faith negotiation</li>
              <li>Mediation if negotiation fails</li>
              <li>Legal proceedings in appropriate jurisdiction if necessary</li>
            </ul>
          </section>

          <section id="contact" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">13. Contact Information</h2>
            <p>If you have questions about these Terms of Service, contact us:</p>
            <div className="bg-muted/30 rounded-lg p-4 mt-4">
              <p><strong>Email:</strong> info@meal-maestro.com</p>
            </div>
          </section>

          <div className="border-t pt-8 mt-12">
            <p className="text-sm text-muted-foreground text-center">
              These terms are effective as of {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} and apply to all users of Meal Maestro.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}