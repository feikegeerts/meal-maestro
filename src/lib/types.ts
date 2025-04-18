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
