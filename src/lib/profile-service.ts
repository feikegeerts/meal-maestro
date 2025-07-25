import { supabase } from "./supabase";

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export const profileService = {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
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
