import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ApplicationError, ErrorCode, ErrorHandler, type ServiceResult } from './types/error-types';

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  language_preference?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfileServiceConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

/**
 * Service for managing user profile operations
 * Uses database functions with SECURITY DEFINER for secure access without service role key
 */
export class UserProfileService {
  private supabase: SupabaseClient;

  constructor(config?: UserProfileServiceConfig) {
    const supabaseUrl = config?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = config?.supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new ApplicationError(
        ErrorCode.CONFIGURATION_ERROR,
        'Missing required Supabase configuration',
        'UserProfileService',
        'constructor',
        { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey }
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  /**
   * Gets user language preference using secure database function
   * This is the preferred method for server-side operations
   */
  async getLanguagePreference(userEmail: string): Promise<string | null> {
    try {
      if (!this.isValidEmail(userEmail)) {
        throw new ApplicationError(
          ErrorCode.INVALID_EMAIL_FORMAT,
          'Invalid email format',
          'UserProfileService',
          'getLanguagePreference',
          { email: userEmail }
        );
      }

      const { data, error } = await this.supabase
        .rpc('get_user_language_preference', { user_email: userEmail });

      if (error) {
        throw new ApplicationError(
          ErrorCode.DATABASE_ERROR,
          `Database error: ${error.message}`,
          'UserProfileService',
          'getLanguagePreference',
          { email: userEmail },
          error
        );
      }

      return data || null;
    } catch (error) {
      if (error instanceof ApplicationError) {
        ErrorHandler.logError(error);
      } else {
        const appError = new ApplicationError(
          ErrorCode.UNKNOWN_ERROR,
          error instanceof Error ? error.message : 'Unknown error',
          'UserProfileService',
          'getLanguagePreference',
          { email: userEmail },
          error instanceof Error ? error : undefined
        );
        ErrorHandler.logError(appError);
      }
      return null;
    }
  }

  /**
   * Gets full user profile (requires authentication context)
   * Use this for authenticated operations only
   */
  async getUserProfile(userId: string): Promise<ServiceResult<UserProfile | null>> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw new ApplicationError(
          ErrorCode.DATABASE_ERROR,
          `Database error: ${error.message}`,
          'UserProfileService',
          'getUserProfile',
          { userId },
          error
        );
      }

      return ErrorHandler.success(data);
    } catch (error) {
      return ErrorHandler.handleError(error, 'UserProfileService', 'getUserProfile');
    }
  }

  /**
   * Updates user language preference
   * Requires authentication context
   */
  async updateLanguagePreference(userId: string, languagePreference: string): Promise<ServiceResult<boolean>> {
    try {
      if (!this.isValidLanguage(languagePreference)) {
        throw new ApplicationError(
          ErrorCode.VALIDATION_ERROR,
          `Invalid language preference: ${languagePreference}`,
          'UserProfileService',
          'updateLanguagePreference',
          { userId, languagePreference, supportedLanguages: this.getSupportedLanguages() }
        );
      }

      const { error } = await this.supabase
        .from('user_profiles')
        .update({ 
          language_preference: languagePreference,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        throw new ApplicationError(
          ErrorCode.DATABASE_ERROR,
          `Database error: ${error.message}`,
          'UserProfileService',
          'updateLanguagePreference',
          { userId, languagePreference },
          error
        );
      }

      return ErrorHandler.success(true);
    } catch (error) {
      return ErrorHandler.handleError(error, 'UserProfileService', 'updateLanguagePreference');
    }
  }

  /**
   * Creates or updates user profile
   * Used during user registration/profile setup
   */
  async upsertUserProfile(profile: Partial<UserProfile> & { id: string; email: string }): Promise<ServiceResult<boolean>> {
    try {
      if (!this.isValidEmail(profile.email)) {
        throw new ApplicationError(
          ErrorCode.INVALID_EMAIL_FORMAT,
          'Invalid email format',
          'UserProfileService',
          'upsertUserProfile',
          { email: profile.email }
        );
      }

      const { error } = await this.supabase
        .from('user_profiles')
        .upsert({
          id: profile.id,
          email: profile.email,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          language_preference: profile.language_preference,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        throw new ApplicationError(
          ErrorCode.DATABASE_ERROR,
          `Database error: ${error.message}`,
          'UserProfileService',
          'upsertUserProfile',
          { profileId: profile.id, email: profile.email },
          error
        );
      }

      return ErrorHandler.success(true);
    } catch (error) {
      return ErrorHandler.handleError(error, 'UserProfileService', 'upsertUserProfile');
    }
  }

  /**
   * Validates email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 320;
  }

  /**
   * Validates language preference
   */
  private isValidLanguage(language: string): boolean {
    const supportedLanguages = ['en', 'nl'];
    return supportedLanguages.includes(language);
  }

  /**
   * Gets supported languages
   */
  getSupportedLanguages(): string[] {
    return ['en', 'nl'];
  }

  /**
   * Validates service configuration
   */
  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}