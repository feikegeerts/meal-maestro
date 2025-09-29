import Mustache from 'mustache';
import { readFileSync } from 'fs';
import { join } from 'path';
import { LocalizationService } from './localization-service';
import { ApplicationError, ErrorCode, ErrorHandler, type ServiceResult } from '../../types/error-types';
import type { EmailData, EmailTemplate, EmailType } from '../types/email-types';

export class EmailTemplateService {
  private templateCache = new Map<string, string>();
  private templatesPath: string;
  private localizationService: LocalizationService;

  constructor(
    templatesPath?: string,
    localizationService?: LocalizationService
  ) {
    this.templatesPath = templatesPath || join(process.cwd(), 'src/lib/email/templates');
    this.localizationService = localizationService || new LocalizationService();
  }

  private getTemplate(templateKey: string): ServiceResult<string> {
    try {
      if (!this.templateCache.has(templateKey)) {
        const templatePath = join(this.templatesPath, `${templateKey}.mustache`);
        const templateSource = readFileSync(templatePath, 'utf-8');
        // Parse upfront so repeated renders are faster; Mustache caches internally too
        Mustache.parse(templateSource);
        this.templateCache.set(templateKey, templateSource);
      }
      return ErrorHandler.success(this.templateCache.get(templateKey)!);
    } catch (error) {
      return ErrorHandler.handleError(
        new ApplicationError(
          ErrorCode.EMAIL_TEMPLATE_ERROR,
          `Failed to load template "${templateKey}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          'EmailTemplateService',
          'getTemplate',
          { templateKey, templatePath: join(this.templatesPath, `${templateKey}.mustache`) },
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
        data.pageLocale,
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

      // Process subject through Mustache to handle variables like {{brandName}}
      const initialContext = {
        ...data,
        // Add localized content
        ...localizedContent,
        // Add localized common strings
        ...commonStrings,
        locale: detectedLocale
      };
      
      const processedSubject = Mustache.render(localizedContent.subject, initialContext);
      
      // Create the template context with processed subject
      const templateContext = {
        ...initialContext,
        subject: processedSubject // Override subject with processed version
      };

      const html = Mustache.render(templateResult.data!, templateContext);

      return ErrorHandler.success({
        subject: processedSubject,
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
    this.templateCache.clear();
    Mustache.clearCache();
  }
}
