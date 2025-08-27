import { supabase } from "./supabase";

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export const profileService = {
  async getUserProfile(userId: string, retryCount = 0): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // For newly created users, the profile might not exist yet
        // This is expected when the database trigger hasn't completed
        if (error.code === 'PGRST116') {
          // No rows returned - retry up to 3 times for new users
          if (retryCount < 3) {
            console.debug("User profile not found, retrying (%d/3):", retryCount + 1, userId);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Progressive delay
            return this.getUserProfile(userId, retryCount + 1);
          } else {
            console.debug("User profile not found after retries - likely a newly created user:", userId);
          }
        } else {
          console.error("Error fetching user profile:", error);
        }
        return null;
      }

      // Supabase returns a single object or null
      return data || null;
    } catch (error) {
      console.error("Unexpected error fetching user profile:", error);
      return null;
    }
  },

  async updateUserProfile(
    userId: string,
    updates: Partial<Pick<UserProfile, "display_name" | "avatar_url">>
  ): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        console.error("Error updating user profile:", error);
        return null;
      }

      // Supabase returns a single object or null
      return data || null;
    } catch (error) {
      console.error("Unexpected error updating user profile:", error);
      return null;
    }
  },
};