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

export interface AdminUsageAlertEmailData extends BaseEmailData {
  alertType: 'spend' | 'rate-limit';
  userId: string;
  endpoint: string;
  totalCost: number;
  totalCostFormatted: string;
  limitFormatted: string;
  monthStart: string;
  monthLabel: string;
  level: 'warning' | 'limit' | 'rate-limit';
  levelLabel: string;
  limitUsd: number;
}

export type EmailData =
  | MagicLinkEmailData
  | ConfirmSignupEmailData
  | AdminUsageAlertEmailData;

export type EmailType = 'magic-link' | 'confirm-signup' | 'admin-usage-alert';

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
