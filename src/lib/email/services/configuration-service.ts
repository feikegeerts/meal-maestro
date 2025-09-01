/**
 * Configuration validation and management service
 * Provides centralized configuration validation and type-safe environment variable access
 */

export interface EmailServiceConfig {
  resendApiKey: string;
  fromEmail: string;
  replyToEmail: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface WebhookConfig {
  secret: string;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  dailyBudget: number;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConfigurationService {
  private static instance: ConfigurationService;

  private constructor() {}

  /**
   * Singleton pattern to ensure consistent configuration across the app
   */
  static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  /**
   * Gets and validates email service configuration
   */
  getEmailServiceConfig(): EmailServiceConfig {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const replyToEmail = process.env.RESEND_REPLY_TO;

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }

    if (!fromEmail) {
      throw new Error('RESEND_FROM_EMAIL environment variable is required');
    }

    if (!replyToEmail) {
      throw new Error('RESEND_REPLY_TO environment variable is required');
    }

    // Validate email formats
    if (!this.isValidEmail(fromEmail.replace(/^.*<(.+)>.*$/, '$1'))) {
      throw new Error('RESEND_FROM_EMAIL contains invalid email format');
    }

    if (!this.isValidEmail(replyToEmail)) {
      throw new Error('RESEND_REPLY_TO contains invalid email format');
    }

    return {
      resendApiKey,
      fromEmail,
      replyToEmail
    };
  }

  /**
   * Gets and validates Supabase configuration
   */
  getSupabaseConfig(): SupabaseConfig {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
    }

    return {
      url,
      anonKey
    };
  }

  /**
   * Gets and validates webhook configuration
   */
  getWebhookConfig(): WebhookConfig {
    let secret = process.env.SUPABASE_WEBHOOK_SECRET;

    if (!secret) {
      throw new Error('SUPABASE_WEBHOOK_SECRET environment variable is required');
    }

    // Handle case where secret incorrectly includes v1, prefix
    // Standard Webhooks expects raw secret, not prefixed version
    if (secret.startsWith('v1,')) {
      console.warn('⚠️ Webhook secret contains v1, prefix - removing it for proper verification');
      secret = secret.substring(3); // Remove 'v1,'
    }

    // Validate webhook secret format and quality
    this.validateWebhookSecret(secret);

    return { secret };
  }

  /**
   * Validates webhook secret format and security properties
   */
  private validateWebhookSecret(secret: string): void {
    // Check minimum length for security
    if (secret.length < 32) {
      console.warn('⚠️ Webhook secret is shorter than recommended 32 characters');
    }

    // Check for obvious weak secrets
    const weakSecrets = ['test', 'secret', 'password', '123456', 'webhook'];
    const lowerSecret = secret.toLowerCase();
    for (const weak of weakSecrets) {
      if (lowerSecret.includes(weak)) {
        console.warn(`⚠️ Webhook secret contains potentially weak pattern: ${weak}`);
        break;
      }
    }

    // Check for whitespace issues
    if (secret !== secret.trim()) {
      throw new Error('Webhook secret contains leading or trailing whitespace');
    }

    // Check for basic entropy (should contain mix of characters)
    const hasLetter = /[a-zA-Z]/.test(secret);
    const hasNumber = /[0-9]/.test(secret);
    const hasSymbol = /[^a-zA-Z0-9]/.test(secret);

    if (!hasLetter && !hasNumber) {
      console.warn('⚠️ Webhook secret lacks alphanumeric characters');
    }

    // Log secret quality info for debugging (safely)
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      console.log(`🔍 [WEBHOOK CONFIG] Secret length: ${secret.length}`);
      console.log(`🔍 [WEBHOOK CONFIG] Has letters: ${hasLetter}`);
      console.log(`🔍 [WEBHOOK CONFIG] Has numbers: ${hasNumber}`);
      console.log(`🔍 [WEBHOOK CONFIG] Has symbols: ${hasSymbol}`);
      console.log(`🔍 [WEBHOOK CONFIG] First 4 chars: ${secret.substring(0, 4)}`);
      console.log(`🔍 [WEBHOOK CONFIG] Last 4 chars: ...${secret.substring(secret.length - 4)}`);
    }
  }

  /**
   * Gets and validates OpenAI configuration
   */
  getOpenAIConfig(): OpenAIConfig {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const dailyBudgetStr = process.env.OPENAI_DAILY_BUDGET || '1.00';

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    const dailyBudget = parseFloat(dailyBudgetStr);
    if (isNaN(dailyBudget) || dailyBudget <= 0) {
      throw new Error('OPENAI_DAILY_BUDGET must be a positive number');
    }

    return {
      apiKey,
      model,
      dailyBudget
    };
  }

  /**
   * Validates all application configurations
   */
  validateAllConfigurations(): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate email service configuration
    try {
      this.getEmailServiceConfig();
    } catch (error) {
      errors.push(`Email service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate Supabase configuration
    try {
      this.getSupabaseConfig();
    } catch (error) {
      errors.push(`Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate webhook configuration
    try {
      this.getWebhookConfig();
    } catch (error) {
      errors.push(`Webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate OpenAI configuration (optional for email service)
    try {
      this.getOpenAIConfig();
    } catch (error) {
      warnings.push(`OpenAI: ${error instanceof Error ? error.message : 'Configuration missing (optional for email service)'}`);
    }

    // Environment-specific validations
    const nodeEnv = process.env.NODE_ENV;
    const vercelEnv = process.env.VERCEL_ENV;

    if (nodeEnv === 'production' && !vercelEnv) {
      warnings.push('Production environment detected but VERCEL_ENV not set');
    }

    if (nodeEnv !== 'production' && !nodeEnv) {
      warnings.push('NODE_ENV not explicitly set, defaulting to development behavior');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Gets environment information
   */
  getEnvironmentInfo(): {
    nodeEnv: string;
    vercelEnv?: string;
    isProduction: boolean;
    isDevelopment: boolean;
  } {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const vercelEnv = process.env.VERCEL_ENV;

    return {
      nodeEnv,
      vercelEnv,
      isProduction: nodeEnv === 'production',
      isDevelopment: nodeEnv === 'development'
    };
  }

  /**
   * Validates a specific configuration key exists and is not empty
   */
  requireEnvVar(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  /**
   * Gets an environment variable with optional default
   */
  getEnvVar(key: string, defaultValue?: string): string | undefined {
    return process.env[key] || defaultValue;
  }

  /**
   * Validates email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 320;
  }

  /**
   * Validates URL format
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Logs configuration status at startup
   */
  logConfigurationStatus(): void {
    const validation = this.validateAllConfigurations();
    const env = this.getEnvironmentInfo();

    console.log(`🔧 Configuration validation for ${env.nodeEnv} environment:`);
    
    if (validation.valid) {
      console.log('✅ All required configurations are valid');
    } else {
      console.log('❌ Configuration errors found:');
      validation.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (validation.warnings.length > 0) {
      console.log('⚠️ Configuration warnings:');
      validation.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
  }
}