/**
 * Shared type definitions for user profile operations
 * Used by both client-side and server-side profile services
 */

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  language_preference?: string;
  unit_system_preference?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Profile update payload - only contains user-editable fields
 */
export type ProfileUpdatePayload = Partial<Pick<UserProfile,
  "display_name" |
  "avatar_url" |
  "language_preference" |
  "unit_system_preference"
>>;

/**
 * Profile creation payload - includes all required fields for new profiles
 */
export interface ProfileCreatePayload {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  language_preference?: string;
  unit_system_preference?: string;
  role?: 'user' | 'admin';
}