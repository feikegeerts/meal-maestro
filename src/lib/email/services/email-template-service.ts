import * as Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { LocalizationService } from './localization-service';
import { ApplicationError, ErrorCode, ErrorHandler, type ServiceResult } from '../../types/error-types';
import type { EmailData, EmailTemplate, EmailType } from '../types/email-types';

export class EmailTemplateService {
  private compiledTemplates = new Map<string, HandlebarsTemplateDelegate>();
  private templatesPath: string;
  private localizationService: LocalizationService;

  constructor(
    templatesPath?: string,
    localizationService?: LocalizationService
  ) {
    this.templatesPath = templatesPath || join(process.cwd(), 'src/lib/email/templates');
    this.localizationService = localizationService || new LocalizationService();
    this.registerHelpers();
  }

  private registerHelpers(): void {
    // Helper for translations - will be enhanced in Phase 2
    Handlebars.registerHelper('t', function(key: string) {
      // Placeholder for now, will integrate with localization service
      return key;
    });
  }

  private getTemplate(templateKey: string): ServiceResult<HandlebarsTemplateDelegate> {
    try {
      if (!this.compiledTemplates.has(templateKey)) {
        const templatePath = join(this.templatesPath, `${templateKey}.hbs`);
        const templateSource = readFileSync(templatePath, 'utf-8');
        const compiledTemplate = Handlebars.compile(templateSource);
        this.compiledTemplates.set(templateKey, compiledTemplate);
      }
      return ErrorHandler.success(this.compiledTemplates.get(templateKey)!);
    } catch (error) {
      return ErrorHandler.handleError(
        new ApplicationError(
          ErrorCode.EMAIL_TEMPLATE_ERROR,
          `Failed to load template "${templateKey}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          'EmailTemplateService',
          'getTemplate',
          { templateKey, templatePath: join(this.templatesPath, `${templateKey}.hbs`) },
          error instanceof Error ? error : undefined
        ),
        'EmailTemplateService',
        'getTemplate'
      );
    }
  }

  public async renderTemplate(emailType: EmailType, data: EmailData): Promise<ServiceResult<EmailTemplate>> {
    try {
      // Detect user language using the database-first approach
      const detectedLocale = await this.localizationService.detectLanguageWithDatabase(
        data.userEmail,
        data.userMetadata,
        data.acceptLanguageHeader
      );

      // Get localized content for this email type
      const localizedContent = this.localizationService.getEmailLocale(emailType, detectedLocale);
      
      // Get common localized strings
      const commonStrings = this.localizationService.getCommonStrings(detectedLocale);

      const templateResult = this.getTemplate(emailType);
      if (!templateResult.success) {
        return {
          success: false,
          error: templateResult.error
        };
      }

      const html = templateResult.data!({
        ...data,
        // Add localized content
        ...localizedContent,
        // Add localized common strings
        ...commonStrings,
        locale: detectedLocale
      });

      return ErrorHandler.success({
        subject: localizedContent.subject,
        html
      });
    } catch (error) {
      return ErrorHandler.handleError(
        new ApplicationError(
          ErrorCode.EMAIL_TEMPLATE_ERROR,
          `Failed to render ${emailType} template: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'EmailTemplateService',
          'renderTemplate',
          { emailType, userEmail: data.userEmail },
          error instanceof Error ? error : undefined
        ),
        'EmailTemplateService',
        'renderTemplate'
      );
    }
  }


  public clearCache(): void {
    this.compiledTemplates.clear();
  }
}