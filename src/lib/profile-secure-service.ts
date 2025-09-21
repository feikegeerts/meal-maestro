/**
 * Secure Profile Service
 *
 * Service for secure database function operations that require anon client access.
 * ONLY contains operations that use SECURITY DEFINER database functions.
 *
 * SECURITY:
 * - Uses anon client ONLY for secure database functions
 * - NO direct table access - only RPC calls
 * - Used by email system and other server-side services
 * - Input validation for all operations
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ApplicationError, ErrorCode, ErrorHandler } from './types/error-types';

export interface ProfileSecureServiceConfig {
  supabaseUrl?: string;
  supabaseKey?: string;
}

export class ProfileSecureService {
  private anonClient: SupabaseClient | null = null;

  constructor(config?: ProfileSecureServiceConfig) {
    // SECURITY: Initialize anon client ONLY for secure database functions (SECURITY DEFINER)
    // This client should NEVER be used for direct table access - only for RPC calls
    const supabaseUrl = config?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = config?.supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.anonClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    }
  }

  /**
   * Gets user language preference using secure database function
   * This method works with anon client and is safe for server-side operations
   * Uses SECURITY DEFINER function - NO direct table access
   */
  async getLanguagePreference(userEmail: string): Promise<string | null> {
    try {
      if (!this.isValidEmail(userEmail)) {
        throw new ApplicationError(
          ErrorCode.INVALID_EMAIL_FORMAT,
          'Invalid email format',
          'ProfileSecureService',
          'getLanguagePreference',
          { email: userEmail }
        );
      }

      const client = this.anonClient;
      if (!client) {
        throw new ApplicationError(
          ErrorCode.CONFIGURATION_ERROR,
          'Anon client not configured',
          'ProfileSecureService',
          'getLanguagePreference',
          { email: userEmail }
        );
      }

      const { data, error } = await client
        .rpc('get_user_language_preference', { user_email: userEmail });

      if (error) {
        throw new ApplicationError(
          ErrorCode.DATABASE_ERROR,
          `Database error: ${error.message}`,
          'ProfileSecureService',
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
          'ProfileSecureService',
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
   * Validates email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 320;
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

// Helper function to create instance - avoids module-level initialization issues in tests
export function createProfileSecureService(config?: ProfileSecureServiceConfig): ProfileSecureService {
  return new ProfileSecureService(config);
}