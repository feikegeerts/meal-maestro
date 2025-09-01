import { EmailTemplateService } from './services/email-template-service';
import { EmailDeliveryService, type EmailDeliveryOptions, type EmailDeliveryResult } from './services/email-delivery-service';
import type { EmailData, EmailType } from './types/email-types';

/**
 * Main EmailService that orchestrates template rendering and email delivery
 * This is the primary interface for sending localized emails in the application
 */
export class EmailService {
  private templateService: EmailTemplateService;
  private deliveryService: EmailDeliveryService;

  constructor(
    templateService?: EmailTemplateService,
    deliveryService?: EmailDeliveryService
  ) {
    this.templateService = templateService || new EmailTemplateService();
    this.deliveryService = deliveryService || new EmailDeliveryService();
  }

  /**
   * Renders and sends an email in one operation
   * This is the main method used throughout the application
   */
  public async sendLocalizedEmail(
    emailType: EmailType,
    emailData: EmailData,
    deliveryOptions?: Partial<EmailDeliveryOptions>
  ): Promise<EmailDeliveryResult> {
    try {

      // Step 1: Render the localized template
      const templateResult = await this.templateService.renderTemplate(emailType, emailData);
      if (!templateResult.success) {
        console.error(`❌ Failed to render ${emailType} template:`, templateResult.error);
        return {
          success: false,
          error: `Template rendering failed: ${templateResult.error?.message || 'Unknown error'}`
        };
      }
      
      // Step 2: Send the email
      const result = await this.deliveryService.sendEmail(templateResult.data!, {
        to: emailData.userEmail,
        ...deliveryOptions
      });

      if (!result.success) {
        console.error(`❌ Failed to send ${emailType} email to ${emailData.userEmail}:`, result.error);
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`💥 Email service error for ${emailType}:`, errorMessage);
      
      return {
        success: false,
        error: `Email service error: ${errorMessage}`
      };
    }
  }

  /**
   * Sends a magic link email for authentication
   */
  public async sendMagicLinkEmail(
    userEmail: string,
    confirmationUrl: string,
    options?: {
      databaseLanguagePreference?: string;
      userMetadata?: Record<string, unknown>;
      pageLocale?: string;
      acceptLanguageHeader?: string;
      deliveryOptions?: Partial<EmailDeliveryOptions>;
    }
  ): Promise<EmailDeliveryResult> {
    const emailData: EmailData = {
      userEmail,
      locale: 'en', // Will be overridden by language detection
      confirmationUrl,
      databaseLanguagePreference: options?.databaseLanguagePreference,
      userMetadata: options?.userMetadata,
      pageLocale: options?.pageLocale,
      acceptLanguageHeader: options?.acceptLanguageHeader
    };

    return this.sendLocalizedEmail('magic-link', emailData, options?.deliveryOptions);
  }

  /**
   * Sends a signup confirmation email
   */
  public async sendConfirmSignupEmail(
    userEmail: string,
    confirmationUrl: string,
    options?: {
      displayName?: string;
      databaseLanguagePreference?: string;
      userMetadata?: Record<string, unknown>;
      pageLocale?: string;
      acceptLanguageHeader?: string;
      deliveryOptions?: Partial<EmailDeliveryOptions>;
    }
  ): Promise<EmailDeliveryResult> {
    const emailData: EmailData = {
      userEmail,
      locale: 'en', // Will be overridden by language detection
      confirmationUrl,
      databaseLanguagePreference: options?.databaseLanguagePreference,
      userMetadata: options?.userMetadata,
      pageLocale: options?.pageLocale,
      acceptLanguageHeader: options?.acceptLanguageHeader
    };

    return this.sendLocalizedEmail('confirm-signup', emailData, options?.deliveryOptions);
  }

  /**
   * Sends a test email to verify the service is working
   */
  public async sendTestEmail(to: string): Promise<EmailDeliveryResult> {
    return this.deliveryService.sendTestEmail(to);
  }

  /**
   * Validates that all required services are properly configured
   */
  public validateConfiguration(): { 
    valid: boolean; 
    errors: string[]; 
    warnings: string[] 
  } {
    const deliveryValidation = this.deliveryService.validateConfiguration();
    const errors: string[] = [...deliveryValidation.errors];
    const warnings: string[] = [];

    // Check template service configuration
    try {
      // This will throw if templates directory doesn't exist
      new EmailTemplateService();
    } catch (error) {
      errors.push(`Template service configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      errors.push('NEXT_PUBLIC_SUPABASE_URL is required for user language preference lookup');
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required for user language preference lookup');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Clears any cached data (useful for testing)
   */
  public clearCaches(): void {
    this.templateService.clearCache();
  }
}