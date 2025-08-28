"use client";

import { ChefHat, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/app/i18n/routing";

export default function PrivacyPolicyPage() {
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
          <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {/* Table of Contents */}
          <div className="bg-muted/30 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Table of Contents</h2>
            <nav className="space-y-2">
              <a href="#information-we-collect" className="block text-primary hover:underline">1. Information We Collect</a>
              <a href="#how-we-use-information" className="block text-primary hover:underline">2. How We Use Your Information</a>
              <a href="#third-party-services" className="block text-primary hover:underline">3. Third-Party Services</a>
              <a href="#data-security" className="block text-primary hover:underline">4. Data Security</a>
              <a href="#data-retention" className="block text-primary hover:underline">5. Data Retention</a>
              <a href="#your-rights" className="block text-primary hover:underline">6. Your Rights</a>
              <a href="#cookies" className="block text-primary hover:underline">7. Cookies and Local Storage</a>
              <a href="#changes" className="block text-primary hover:underline">8. Changes to This Policy</a>
              <a href="#contact" className="block text-primary hover:underline">9. Contact Us</a>
            </nav>
          </div>

          <section id="information-we-collect" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">1. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-3">Account Information</h3>
            <p>When you create an account using Google OAuth, we collect:</p>
            <ul>
              <li>Your Google email address</li>
              <li>Your Google profile name</li>
              <li>Your Google profile picture (if provided)</li>
              <li>Unique account identifiers for authentication</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Recipe Data</h3>
            <p>When you use our recipe management features, we store:</p>
            <ul>
              <li>Recipe content you create or import</li>
              <li>Recipe categories and tags you assign</li>
              <li>Your recipe search and filtering preferences</li>
              <li>Recipe modification history</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Usage Information</h3>
            <p>We automatically collect:</p>
            <ul>
              <li>AI interaction logs (prompts and responses for cost tracking)</li>
              <li>Feature usage analytics through Vercel Analytics</li>
              <li>Performance metrics through Vercel Speed Insights</li>
              <li>Error logs for debugging and service improvement</li>
            </ul>
          </section>

          <section id="how-we-use-information" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide and maintain the Meal Maestro service</li>
              <li>Authenticate your account and maintain login sessions</li>
              <li>Store and manage your personal recipe collection</li>
              <li>Process AI-powered recipe operations using OpenAI</li>
              <li>Track API usage costs and provide cost transparency</li>
              <li>Improve our service through analytics and performance monitoring</li>
              <li>Send essential service communications (if email features are enabled)</li>
              <li>Comply with legal obligations and prevent abuse</li>
            </ul>
          </section>

          <section id="third-party-services" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">3. Third-Party Services</h2>
            
            <h3 className="text-xl font-semibold mb-3">Google OAuth</h3>
            <p>We use Google OAuth for authentication. Google&apos;s privacy policy applies to data collected during the authentication process. We only request access to basic profile information (email, name, profile picture).</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Supabase (Database & Auth)</h3>
            <p>Your recipe data and account information are stored securely in Supabase&apos;s cloud database infrastructure. Supabase operates under their privacy policy and maintains SOC 2 compliance.</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">OpenAI</h3>
            <p>When you use AI features, your recipe-related prompts are sent to OpenAI for processing. We:</p>
            <ul>
              <li>Only send recipe-related content, never personal information</li>
              <li>Do not store conversations on OpenAI&apos;s servers</li>
              <li>Track usage for cost monitoring and transparency</li>
              <li>OpenAI&apos;s data usage policy applies to these interactions</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Vercel (Hosting & Analytics)</h3>
            <p>Our application is hosted on Vercel, which provides:</p>
            <ul>
              <li>Web analytics (anonymous usage statistics)</li>
              <li>Performance monitoring (Core Web Vitals)</li>
              <li>Error tracking and logging</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Other Services</h3>
            <ul>
              <li><strong>CloudFlare:</strong> DNS and security services</li>
              <li><strong>TransIP:</strong> Domain registration</li>
              <li><strong>Resend:</strong> Email service (when email features are active)</li>
            </ul>
          </section>

          <section id="data-security" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">4. Data Security</h2>
            <p>We implement appropriate security measures to protect your information:</p>
            <ul>
              <li>All data is transmitted using HTTPS encryption</li>
              <li>Database access is secured with Row Level Security (RLS) policies</li>
              <li>Authentication is handled through secure OAuth flows</li>
              <li>API keys and secrets are stored securely and rotated regularly</li>
              <li>Access to user data is limited to essential service operations</li>
            </ul>
            <p>However, no internet transmission or electronic storage method is 100% secure. We cannot guarantee absolute security of your information.</p>
          </section>

          <section id="data-retention" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">5. Data Retention</h2>
            <ul>
              <li><strong>Account Data:</strong> Retained while your account is active</li>
              <li><strong>Recipe Data:</strong> Retained until you delete individual recipes or your account</li>
              <li><strong>Usage Logs:</strong> Retained for up to 90 days for cost tracking and analytics</li>
              <li><strong>Error Logs:</strong> Retained for up to 30 days for debugging purposes</li>
            </ul>
            <p>When you delete your account, we remove your personal data and recipes. Usage and cost tracking data may be retained in anonymized form for operational purposes.</p>
          </section>

          <section id="your-rights" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access:</strong> View all personal data we hold about you</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and personal data</li>
              <li><strong>Portability:</strong> Export your recipe data in a standard format</li>
              <li><strong>Restriction:</strong> Limit how we process your information</li>
              <li><strong>Objection:</strong> Object to certain types of processing</li>
            </ul>
            <p>To exercise these rights, contact us using the information provided below. We will respond within 30 days.</p>
          </section>

          <section id="cookies" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">7. Cookies and Local Storage</h2>
            <p>We use cookies and local storage for:</p>
            <ul>
              <li><strong>Authentication:</strong> Maintaining your login session</li>
              <li><strong>Preferences:</strong> Storing your theme and language preferences</li>
              <li><strong>Analytics:</strong> Anonymous usage statistics (via Vercel Analytics)</li>
              <li><strong>Functionality:</strong> Remembering your recipe filters and search preferences</li>
            </ul>
            <p>You can control cookies through your browser settings, but some features may not work properly if cookies are disabled.</p>
          </section>

          <section id="changes" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">8. Changes to This Policy</h2>
            <p>We may update this privacy policy occasionally to reflect changes in our practices or for legal reasons. When we make significant changes, we will:</p>
            <ul>
              <li>Update the &quot;Last updated&quot; date at the top of this page</li>
              <li>Notify users through the application interface</li>
              <li>For major changes, provide advance notice via email (if email features are active)</li>
            </ul>
            <p>Continued use of Meal Maestro after policy changes constitutes acceptance of the updated policy.</p>
          </section>

          <section id="contact" className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">9. Contact Us</h2>
            <p>If you have questions about this privacy policy or want to exercise your rights, contact us:</p>
            <div className="bg-muted/30 rounded-lg p-4 mt-4">
              <p><strong>Email:</strong> info@meal-maestro.com</p>
            </div>
          </section>

          <div className="border-t pt-8 mt-12">
            <p className="text-sm text-muted-foreground text-center">
              This privacy policy is effective as of {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} and applies to all users of Meal Maestro.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}