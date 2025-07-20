export interface Database {
  public: {
    Tables: {
      recipes: {
        Row: {
          id: string;
          title: string;
          ingredients: string[];
          description: string;
          category: string;
          tags: string[];
          season: string | null;
          last_eaten: string | null;
          user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          ingredients: string[];
          description: string;
          category: string;
          tags?: string[];
          season?: string | null;
          last_eaten?: string | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          ingredients?: string[];
          description?: string;
          category?: string;
          tags?: string[];
          season?: string | null;
          last_eaten?: string | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_usage: {
        Row: {
          id: string;
          endpoint: string;
          tokens_used: number | null;
          cost_usd: number | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          endpoint: string;
          tokens_used?: number | null;
          cost_usd?: number | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          endpoint?: string;
          tokens_used?: number | null;
          cost_usd?: number | null;
          timestamp?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}