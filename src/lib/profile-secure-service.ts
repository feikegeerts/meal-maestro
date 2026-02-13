/**
 * Secure Profile Service
 *
 * Service for secure database operations related to user profiles.
 * Uses Drizzle ORM for direct database access.
 *
 * SECURITY:
 * - Used by email system and other server-side services
 * - Input validation for all operations
 */

import { db } from "@/db";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApplicationError, ErrorCode, ErrorHandler } from "./types/error-types";

export class ProfileSecureService {
  /**
   * Gets user language preference by email
   * Replaces the previous SECURITY DEFINER RPC call with a direct Drizzle query
   */
  async getLanguagePreference(userEmail: string): Promise<string | null> {
    try {
      if (!this.isValidEmail(userEmail)) {
        throw new ApplicationError(
          ErrorCode.INVALID_EMAIL_FORMAT,
          "Invalid email format",
          "ProfileSecureService",
          "getLanguagePreference",
          { email: userEmail },
        );
      }

      const [row] = await db
        .select({ languagePreference: userProfiles.languagePreference })
        .from(userProfiles)
        .where(eq(userProfiles.email, userEmail))
        .limit(1);

      return row?.languagePreference ?? null;
    } catch (error) {
      if (error instanceof ApplicationError) {
        ErrorHandler.logError(error);
      } else {
        const appError = new ApplicationError(
          ErrorCode.UNKNOWN_ERROR,
          error instanceof Error ? error.message : "Unknown error",
          "ProfileSecureService",
          "getLanguagePreference",
          { email: userEmail },
          error instanceof Error ? error : undefined,
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

    if (!process.env.DATABASE_URL) {
      errors.push("DATABASE_URL is required");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Helper function to create instance - avoids module-level initialization issues in tests
export function createProfileSecureService(): ProfileSecureService {
  return new ProfileSecureService();
}
