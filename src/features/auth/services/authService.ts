import type {
  LoginCredentials,
  RegisterData,
  ForgotPasswordData,
  ResetPasswordData,
  VerifyRecoveryCodeData,
  AuthResponse,
  AuthUser,
} from '../types';
import { ApiRequestTimeoutError, fetchWithTimeout } from '../../api/apiClient.ts';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

class AuthService {
  private currentUserRequest: Promise<AuthUser | null> | null = null;

  /**
   * Initializes Laravel's session CSRF token through the same-origin Vite proxy.
   */
  async getCsrfCookie(): Promise<void> {
    const response = await fetchWithTimeout('/sanctum/csrf-cookie', {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`CSRF initialization failed with HTTP ${response.status}.`);
    }

    if (!this.readXsrfToken()) {
      throw new Error('Laravel did not provide an XSRF-TOKEN cookie.');
    }
  }

  private readXsrfToken(): string | null {
    const cookie = document.cookie
      .split('; ')
      .find((value) => value.startsWith('XSRF-TOKEN='));

    if (!cookie) return null;

    try {
      return decodeURIComponent(cookie.slice('XSRF-TOKEN='.length));
    } catch {
      return null;
    }
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const method = (init.method || 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');

    if (!SAFE_METHODS.includes(method)) {
      await this.getCsrfCookie();
      const xsrfToken = this.readXsrfToken();

      if (!xsrfToken) {
        throw new Error('Laravel XSRF-TOKEN cookie is missing.');
      }

      headers.set('X-XSRF-TOKEN', xsrfToken);
    }

    return fetchWithTimeout(path, {
      ...init,
      method,
      headers,
      credentials: 'include',
    });
  }

  /**
   * Login request to Laravel Sanctum
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.request('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    } catch (error) {
      return {
        success: false,
        message: error instanceof ApiRequestTimeoutError
          ? error.message
          : 'Unable to connect to the Laravel authentication service. Check that the backend is running and the Vite API proxy is available.',
      };
    }
  }

  /**
   * Register request to Laravel
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await this.request('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        message: 'Unable to connect to the Laravel registration service. Check that the backend is running and the Vite API proxy is available.',
      };
    }
  }

  /**
   * Request an email verification code for password recovery.
   */
  async forgotPassword(data: ForgotPasswordData): Promise<AuthResponse> {
    try {
      const response = await this.request('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        message: resData.message || 'If an account exists for that email address, a verification code will be sent.',
      };
    } catch {
      return {
        success: false,
        message: 'Unable to connect to the password recovery service.',
      };
    }
  }

  async verifyRecoveryCode(data: VerifyRecoveryCodeData): Promise<AuthResponse> {
    try {
      const response = await this.request('/api/verify-recovery-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const resData = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          success: false,
          message: resData.message || 'That code is incorrect or expired. Request a new code and try again.',
          errors: resData.errors,
        };
      }

      return {
        success: true,
        recoveryToken: resData.recovery_token,
        message: resData.message || 'Email verified. Choose a new password.',
      };
    } catch {
      return { success: false, message: 'Unable to connect to the password recovery service.' };
    }
  }

  /**
   * Reset password with a verified, short-lived recovery token.
   */
  async resetPassword(data: ResetPasswordData): Promise<AuthResponse> {
    try {
      const response = await this.request('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
  getCurrentUser(): Promise<AuthUser | null> {
    if (this.currentUserRequest) return this.currentUserRequest;

    const request = this.loadCurrentUser();
    this.currentUserRequest = request;
    void request.then(
      () => {
        if (this.currentUserRequest === request) this.currentUserRequest = null;
      },
      () => {
        if (this.currentUserRequest === request) this.currentUserRequest = null;
      },
    );
    return request;
  }

  private async loadCurrentUser(): Promise<AuthUser | null> {
    const response = await this.request('/api/user');

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Unable to validate the current session (HTTP ${response.status}).`);
    }

    return await response.json();
  }

  /**
   * Logout session
   */
  async logout(): Promise<void> {
    try {
      await this.request('/api/logout', {
        method: 'POST',
      });
    } catch {
      // The client clears local authentication state even when the server is unreachable.
    }
  }
}

export const authService = new AuthService();
