/**
 * Server-side Profile Service
 *
 * Service for API routes and server-side profile operations.
 * Requires authenticated client - NO anon fallbacks for security.
 *
 * SECURITY:
 * - Only used by API routes with authenticated clients
 * - NO client-side imports - server-side only
 * - Complex error handling for proper API responses
 * - Requires authenticated client parameter (no defaults)
 */

import { type SupabaseClient } from '@supabase/supabase-js';
import { ApplicationError, ErrorCode, ErrorHandler, type ServiceResult } from './types/error-types';
import type { UserProfile, ProfileCreatePayload, ProfileUpdatePayload } from './profile-types';

export class ProfileServerService {
  /**
   * Gets user profile with structured error handling
   * SECURITY: Requires authenticated client - no anon fallback
   */
  static async getUserProfile(userId: string, authenticatedClient: SupabaseClient): Promise<ServiceResult<UserProfile | null>> {
    try {
      if (!authenticatedClient) {
        throw new ApplicationError(
          ErrorCode.CONFIGURATION_ERROR,
          'Authenticated client is required for profile operations',
          'ProfileServerService',
          'getUserProfile',
          { userId }
        );
      }

      const { data, error } = await authenticatedClient
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw new ApplicationError(
          ErrorCode.DATABASE_ERROR,
          `Database error: ${error.message}`,
          'ProfileServerService',
          'getUserProfile',
          { userId },
          error
        );
      }

      return ErrorHandler.success(data);
    } catch (error) {
      return ErrorHandler.handleError(error, 'ProfileServerService', 'getUserProfile');
    }
  }

  /**
   * Creates or updates user profile
   * SECURITY: Requires authenticated client - no anon fallback
   */
  static async upsertUserProfile(
    profile: ProfileCreatePayload,
    authenticatedClient: SupabaseClient
  ): Promise<ServiceResult<boolean>> {
    try {
      if (!authenticatedClient) {
        throw new ApplicationError(
          ErrorCode.CONFIGURATION_ERROR,
          'Authenticated client is required for profile operations',
          'ProfileServerService',
          'upsertUserProfile',
          { profileId: profile.id }
        );
      }

      if (!this.isValidEmail(profile.email)) {
        throw new ApplicationError(
          ErrorCode.INVALID_EMAIL_FORMAT,
          'Invalid email format',
          'ProfileServerService',
          'upsertUserProfile',
          { email: profile.email }
        );
      }

      const { error } = await authenticatedClient
        .from('user_profiles')
        .upsert({
          id: profile.id,
          email: profile.email,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          language_preference: profile.language_preference,
          unit_system_preference: profile.unit_system_preference,
          role: profile.role || 'user',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        throw new ApplicationError(
          ErrorCode.DATABASE_ERROR,
          `Database error: ${error.message}`,
          'ProfileServerService',
          'upsertUserProfile',
          { profileId: profile.id, email: profile.email },
          error
        );
      }

      return ErrorHandler.success(true);
    } catch (error) {
      return ErrorHandler.handleError(error, 'ProfileServerService', 'upsertUserProfile');
    }
  }

  /**
   * Updates user profile
   * SECURITY: Requires authenticated client - no anon fallback
   */
  static async updateUserProfile(
    userId: string,
    updates: ProfileUpdatePayload,
    authenticatedClient: SupabaseClient
  ): Promise<ServiceResult<UserProfile | null>> {
    try {
      if (!authenticatedClient) {
        throw new ApplicationError(
          ErrorCode.CONFIGURATION_ERROR,
          'Authenticated client is required for profile operations',
          'ProfileServerService',
          'updateUserProfile',
          { userId }
        );
      }

      const { data, error } = await authenticatedClient
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .maybeSingle();

      if (error) {
        throw new ApplicationError(
          ErrorCode.DATABASE_ERROR,
          `Database error: ${error.message}`,
          'ProfileServerService',
          'updateUserProfile',
          { userId },
          error
        );
      }

      return ErrorHandler.success(data);
    } catch (error) {
      return ErrorHandler.handleError(error, 'ProfileServerService', 'updateUserProfile');
    }
  }

  /**
   * Validates email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 320;
  }
}