export interface BaseEmailData {
  userEmail: string;
  locale: string;
  databaseLanguagePreference?: string;
  userMetadata?: Record<string, unknown>;
  pageLocale?: string;
  acceptLanguageHeader?: string;
}

export interface MagicLinkEmailData extends BaseEmailData {
  confirmationUrl: string;
}

export interface ConfirmSignupEmailData extends BaseEmailData {
  confirmationUrl: string;
  displayName?: string;
}

export type EmailData = MagicLinkEmailData | ConfirmSignupEmailData;

export type EmailType = 'magic-link' | 'confirm-signup';

export interface EmailTemplate {
  subject: string;
  html: string;
}

export interface EmailLocale {
  subject: string;
  title: string;
  description: string;
  cta: string;
  footer: {
    contact: string;
    copyright: string;
  };
}