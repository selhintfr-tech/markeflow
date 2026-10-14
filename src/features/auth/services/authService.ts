import type {
  LoginCredentials,
  RegisterData,
  ForgotPasswordData,
  ResetPasswordData,
  AuthResponse,
  AuthUser,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class AuthService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Initializes CSRF protection for Laravel Sanctum cookie-based authentication
   */
  async getCsrfCookie(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/sanctum/csrf-cookie`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });
    } catch {
      // Backend not yet reachable in local dev
    }
  }

  /**
   * Login request to Laravel Sanctum
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      await this.getCsrfCookie();

      const response = await fetch(`${this.baseUrl}/api/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.message || 'Invalid credentials or login failed.',
          errors: errorData.errors,
        };
      }

      const data = await response.json();
      return {
        success: true,
        user: data.user,
        message: 'Successfully signed in.',
      };
    } catch {
      // Truthful status when Laravel 12 backend is not reachable
      return {
        success: false,
        message: 'Backend authentication service is currently offline or unreachable. Please verify the Laravel API connection at http://localhost:8000.',
      };
    }
  }

  /**
   * Register request to Laravel
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      await this.getCsrfCookie();

      const response = await fetch(`${this.baseUrl}/api/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.message || 'Registration could not be completed.',
          errors: errorData.errors,
        };
      }

      const resData = await response.json();
      return {
        success: true,
        user: resData.user,
        message: 'Account created successfully.',
      };
    } catch {
      return {
        success: false,
        message: 'Registration service is currently offline. The Laravel 12 authentication endpoint has not been started yet.',
      };
    }
  }

  /**
   * Request password reset link
   */
  async forgotPassword(data: ForgotPasswordData): Promise<AuthResponse> {
    try {
      await this.getCsrfCookie();

      const response = await fetch(`${this.baseUrl}/api/forgot-password`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.message || 'Unable to send password reset link.',
          errors: errorData.errors,
        };
      }

      const resData = await response.json();
      return {
        success: true,
        message: resData.message || 'A secure password reset link has been dispatched to your email address.',
      };
    } catch {
      return {
        success: false,
        message: 'Password reset service is currently unreachable. The backend mail relay service is not connected.',
      };
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordData): Promise<AuthResponse> {
    try {
      await this.getCsrfCookie();

      const response = await fetch(`${this.baseUrl}/api/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.message || 'Password reset token is invalid or expired.',
          errors: errorData.errors,
        };
      }

      return {
        success: true,
        message: 'Your password has been reset successfully. You may now sign in.',
      };
    } catch {
      return {
        success: false,
        message: 'Password reset service is currently unavailable.',
      };
    }
  }

  /**
   * Get current authenticated user session
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/user`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Offline / not logged in
    }
    return null;
  }

  /**
   * Logout session
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });
    } catch {
      // offline
    }
  }
}

export const authService = new AuthService();
