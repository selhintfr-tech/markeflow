export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  terms_accepted: boolean;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  recovery_token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface VerifyRecoveryCodeData {
  email: string;
  code: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  workspaceId?: string;
  avatar_url?: string | null;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
  recoveryToken?: string;
  errors?: Record<string, string[]>;
}
