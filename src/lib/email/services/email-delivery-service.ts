import { Resend } from 'resend';
import { ConfigurationService } from './configuration-service';
import type { EmailTemplate } from '../types/email-types';

export interface EmailDeliveryOptions {
  to: string;
  from?: string;
  replyTo?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailDeliveryService {
  private resend: Resend;
  private defaultFrom: string;
  private defaultReplyTo: string;

  constructor(configService?: ConfigurationService) {
    const config = configService || ConfigurationService.getInstance();
    const emailConfig = config.getEmailServiceConfig();

    this.resend = new Resend(emailConfig.resendApiKey);
    this.defaultFrom = emailConfig.fromEmail;
    this.defaultReplyTo = emailConfig.replyToEmail;
  }

  /**
   * Sends an email using the rendered template
   */
  public async sendEmail(
    template: EmailTemplate,
    options: EmailDeliveryOptions
  ): Promise<EmailDeliveryResult> {
    try {
      
      const result = await this.resend.emails.send({
        from: options.from || this.defaultFrom,
        to: [options.to],
        replyTo: options.replyTo || this.defaultReplyTo,
        subject: template.subject,
        html: template.html,
      });

      if (result.error) {
        console.error('❌ Email sending failed:', result.error);
        return {
          success: false,
          error: result.error.message || 'Unknown email sending error'
        };
      }

      return {
        success: true,
        messageId: result.data?.id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Email delivery service error:', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Sends a test email to verify configuration
   */
  public async sendTestEmail(to: string): Promise<EmailDeliveryResult> {
    const testTemplate: EmailTemplate = {
      subject: 'Test Email from Meal Maestro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #059f3d;">🍽️ Meal Maestro Test Email</h1>
          <p>This is a test email to verify that the email delivery service is working correctly.</p>
          <p>If you receive this email, the Resend integration is configured properly!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            Sent at: ${new Date().toISOString()}<br>
            Environment: ${process.env.NODE_ENV || 'development'}
          </p>
        </div>
      `
    };

    return this.sendEmail(testTemplate, { to });
  }

  /**
   * Validates the email service configuration
   */
  public validateConfiguration(): { valid: boolean; errors: string[] } {
    const configService = ConfigurationService.getInstance();
    
    try {
      configService.getEmailServiceConfig();
      return { valid: true, errors: [] };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown configuration error']
      };
    }
  }
}