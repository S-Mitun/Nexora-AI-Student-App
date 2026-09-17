export interface StudentProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  education_level: string;
  preferred_language: string;
  institution: string | null;
  interests: string[];
  enable_code_mixing: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
  identities?: any[];
}

export interface AuthState {
  user: AuthUser | null;
  session: {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
  } | null;
  profile: StudentProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  identities: string[];
  primaryProvider?: string;
  hasPasswordAuth: boolean;
}

