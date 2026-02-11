import { readFileSync } from "fs";
import { join } from "path";
import {
  ProfileSecureService,
  createProfileSecureService,
} from "../../profile-secure-service";
import type { EmailLocale } from "../types/email-types";

interface LocaleMessages {
  common: {
    [key: string]: string;
  };
  emails: {
    [key: string]: EmailLocale;
  };
}

export class LocalizationService {
  private localesCache = new Map<string, LocaleMessages>();
  private localesPath: string;
  private supportedLocales = ["en", "nl"];
  private fallbackLocale = "en";
  private profileSecureService: ProfileSecureService;

  constructor(
    localesPath?: string,
    profileSecureService?: ProfileSecureService
  ) {
    this.localesPath =
      localesPath || join(process.cwd(), "src/lib/email/locales");
    this.profileSecureService =
      profileSecureService || createProfileSecureService();
  }

  /**
   * Detects user language from various sources with fallback chain:
   * 1. Database user_profiles.language_preference
   * 2. User metadata (from Supabase user object)
   * 3. Page locale (from the URL where user initiated the request)
   * 4. Accept-Language header
   * 5. Fallback to English
   */
  public detectLanguage(
    databaseLanguagePreference?: string,
    userMetadata?: Record<string, unknown>,
    pageLocale?: string,
    acceptLanguageHeader?: string
  ): string {
    // Priority 1: Database language preference from user_profiles table
    if (
      databaseLanguagePreference &&
      this.supportedLocales.includes(databaseLanguagePreference)
    ) {
      return databaseLanguagePreference;
    }

    // Priority 2: User metadata (from Supabase user object)
    if (
      userMetadata &&
      typeof userMetadata === "object" &&
      userMetadata !== null
    ) {
      const metadata = userMetadata as Record<string, unknown>;
      if (
        typeof metadata.locale === "string" &&
        this.supportedLocales.includes(metadata.locale)
      ) {
        return metadata.locale;
      }
    }

    // Priority 3: Page locale (from the URL where user initiated the request)
    if (pageLocale && this.supportedLocales.includes(pageLocale)) {
      return pageLocale;
    }

    // Priority 4: Accept-Language header parsing
    if (acceptLanguageHeader) {
      const preferredLanguage =
        this.parseAcceptLanguageHeader(acceptLanguageHeader);
      if (
        preferredLanguage &&
        this.supportedLocales.includes(preferredLanguage)
      ) {
        return preferredLanguage;
      }
    }

    // Priority 5: Fallback to default
    return this.fallbackLocale;
  }

  /**
   * Gets localized email content for a specific email type and language
   */
  public getEmailLocale(emailType: string, locale: string): EmailLocale {
    try {
      const messages = this.loadLocale(locale);

      if (messages.emails[emailType]) {
        return messages.emails[emailType];
      }

      // Fallback to English if email type not found in requested locale
      if (locale !== this.fallbackLocale) {
        console.warn(
          `Email type "${emailType}" not found in locale "${locale}", falling back to ${this.fallbackLocale}`
        );
        const fallbackMessages = this.loadLocale(this.fallbackLocale);
        return fallbackMessages.emails[emailType];
      }

      throw new Error(`Email type "${emailType}" not found in any locale`);
    } catch (error) {
      throw new Error(
        `Failed to get email locale: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        { cause: error }
      );
    }
  }

  /**
   * Gets common localized strings for a specific language
   */
  public getCommonStrings(locale: string): Record<string, string> {
    try {
      const messages = this.loadLocale(locale);
      return messages.common;
    } catch (error) {
      // Fallback to English if locale loading fails
      if (locale !== this.fallbackLocale) {
        console.warn(
          `Failed to load common strings for locale "${locale}", falling back to ${this.fallbackLocale}`
        );
        const fallbackMessages = this.loadLocale(this.fallbackLocale);
        return fallbackMessages.common;
      }
      throw new Error(
        `Failed to get common strings: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        { cause: error }
      );
    }
  }

  /**
   * Gets all supported locales
   */
  public getSupportedLocales(): string[] {
    return [...this.supportedLocales];
  }

  /**
   * Checks if a locale is supported
   */
  public isLocaleSupported(locale: string): boolean {
    return this.supportedLocales.includes(locale);
  }

  /**
   * Fetches user's language preference using ProfileSecureService
   * Delegates to the dedicated service for better separation of concerns
   */
  public async getUserLanguagePreference(
    userEmail: string
  ): Promise<string | null> {
    return this.profileSecureService.getLanguagePreference(userEmail);
  }

  /**
   * Convenience method to detect language with database lookup
   */
  public async detectLanguageWithDatabase(
    userEmail: string,
    userMetadata?: Record<string, unknown>,
    pageLocale?: string,
    acceptLanguageHeader?: string
  ): Promise<string> {
    const databaseLanguagePreference = await this.getUserLanguagePreference(
      userEmail
    );
    return this.detectLanguage(
      databaseLanguagePreference || undefined,
      userMetadata,
      pageLocale,
      acceptLanguageHeader
    );
  }

  /**
   * Clears the locale cache (useful for testing or dynamic reloading)
   */
  public clearCache(): void {
    this.localesCache.clear();
  }

  private loadLocale(locale: string): LocaleMessages {
    if (!this.localesCache.has(locale)) {
      const localeFile = join(this.localesPath, `${locale}.json`);
      try {
        const content = readFileSync(localeFile, "utf-8");
        const messages: LocaleMessages = JSON.parse(content);
        this.localesCache.set(locale, messages);
      } catch (error) {
        throw new Error(
          `Failed to load locale file for "${locale}": ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          { cause: error }
        );
      }
    }
    return this.localesCache.get(locale)!;
  }

  private parseAcceptLanguageHeader(header: string): string | null {
    // Parse Accept-Language header like "en-US,en;q=0.9,nl;q=0.8"
    const languages = header
      .split(",")
      .map((lang) => {
        const [code, priority] = lang.trim().split(";q=");
        return {
          code: code.split("-")[0].toLowerCase(), // Extract base language (en from en-US)
          priority: priority ? parseFloat(priority) : 1.0,
        };
      })
      .sort((a, b) => b.priority - a.priority); // Sort by priority (highest first)

    // Return the first supported language
    for (const lang of languages) {
      if (this.supportedLocales.includes(lang.code)) {
        return lang.code;
      }
    }

    return null;
  }
}
