export interface CareerEvent {
  id: number;
  title: string;
  company: string;
  period: string;
  description: string;
}

export interface AuthRequest {
  password: string;
  csrfToken?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  csrfToken?: string;
}

// Recipe types for Meal Maestro
export interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  description: string;
  category: string;
  tags: string[];
  season?: string;
  last_eaten?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ActionLog {
  id: string;
  action_type: 'create' | 'update' | 'delete' | 'search';
  recipe_id?: string;
  description: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface APIUsage {
  id: string;
  endpoint: string;
  tokens_used?: number;
  cost_usd?: number;
  timestamp: string;
}
