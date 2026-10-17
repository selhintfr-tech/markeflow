import type {
  LoginCredentials,
  RegisterData,
  ForgotPasswordData,
  ResetPasswordData,
  AuthResponse,
  AuthUser,
} from '../types';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

class AuthService {
  /**
   * Initializes Laravel's session CSRF token through the same-origin Vite proxy.
   */
  async getCsrfCookie(): Promise<void> {
    const response = await fetch('/sanctum/csrf-cookie', {
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

    return fetch(path, {
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
    } catch {
      return {
        success: false,
        message: 'Unable to connect to the Laravel authentication service. Check that the backend is running and the Vite API proxy is available.',
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
   * Request password reset link
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
  async getCurrentUser(): Promise<AuthUser | null> {
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
