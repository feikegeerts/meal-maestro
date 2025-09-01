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
          // No rows returned - try to create the profile for existing users
          if (retryCount === 0) {
            console.debug("User profile not found, attempting to create profile for user:", userId);
            const createdProfile = await this.createMissingProfile(userId);
            if (createdProfile) {
              return createdProfile;
            }
          }
          
          // Retry up to 3 times for new users
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

  async createMissingProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Get user info from auth.users
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || user.id !== userId) {
        console.error("Cannot create profile: user not authenticated or ID mismatch");
        return null;
      }

      const displayName = user.user_metadata?.display_name || 
                         user.user_metadata?.full_name || 
                         user.email?.split('@')[0] || 
                         'User';

      const { data, error } = await supabase
        .from("user_profiles")
        .insert({
          id: userId,
          email: user.email,
          display_name: displayName,
          avatar_url: user.user_metadata?.avatar_url || null,
          role: 'user'
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating missing profile:", error);
        return null;
      }

      console.log("Successfully created missing profile for user:", userId);
      return data;
    } catch (error) {
      console.error("Unexpected error creating missing profile:", error);
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