import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authService } from '../features/auth/services/authService';
import type {
  AuthUser,
  LoginCredentials,
  RegisterData,
  AuthResponse,
} from '../features/auth/types';
import { setApiSessionScope } from '../features/api/apiClient';

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isApiAvailable: boolean;
  lastError: string | null;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateAvatar: (avatarUrl: string | null) => void;
  revalidateSession: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearClientWorkspaceCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('marketflow_workspaces_list') || key.startsWith('marketflow_current_workspace_id'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isApiAvailable, setIsApiAvailable] = useState<boolean>(true);
  const [lastError, setLastError] = useState<string | null>(null);

  /**
   * Validate session on initial application mount
   * Security rule: Never rely on client storage as proof of authentication
   */
  useEffect(() => {
    let isMounted = true;

    authService
      .getCurrentUser()
      .then((serverUser) => {
        if (!isMounted) return;
        if (serverUser && serverUser.id) {
          setApiSessionScope(serverUser.id);
          setUser(serverUser);
          setIsApiAvailable(true);
          setLastError(null);
        } else {
          clearClientWorkspaceCache();
          setApiSessionScope(null);
          setUser(null);
        }
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        clearClientWorkspaceCache();
        setUser(null);
        setApiSessionScope(null);
        setIsApiAvailable(false);
        setLastError(error instanceof Error
          ? error.message
          : 'Unable to connect to the Laravel authentication service through the Vite API proxy.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Manually revalidate current session against server
   */
  const revalidateSession = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLastError(null);
    try {
      const serverUser = await authService.getCurrentUser();
      if (serverUser && serverUser.id) {
        setApiSessionScope(serverUser.id);
        setUser(serverUser);
        setIsApiAvailable(true);
      } else {
        setApiSessionScope(null);
        setUser(null);
        setIsApiAvailable(true);
      }
    } catch (error: unknown) {
      setUser(null);
      setApiSessionScope(null);
      setIsApiAvailable(false);
      setLastError(error instanceof Error
        ? error.message
        : 'Unable to connect to the Laravel authentication service through the Vite API proxy.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Authenticate user with credentials
   */
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthResponse> => {
      setIsLoading(true);
      setLastError(null);
      setApiSessionScope(null);
      try {
        const response = await authService.login(credentials);
        if (response.success && response.user) {
          setApiSessionScope(response.user.id);
          setUser(response.user);
          setIsApiAvailable(true);
          setLastError(null);
        } else {
          setApiSessionScope(null);
          setUser(null);
          setLastError(response.message || 'Authentication failed.');
        }
        return response;
      } catch {
        setUser(null);
        setApiSessionScope(null);
        setIsApiAvailable(false);
        const errorMsg = 'Backend authentication service is offline or unreachable.';
        setLastError(errorMsg);
        return {
          success: false,
          message: errorMsg,
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Register a new user account
   */
  const register = useCallback(
    async (data: RegisterData): Promise<AuthResponse> => {
      setIsLoading(true);
      setLastError(null);
      setApiSessionScope(null);
      try {
        const response = await authService.register(data);
        if (response.success && response.user) {
          setApiSessionScope(response.user.id);
          setUser(response.user);
          setIsApiAvailable(true);
        } else {
          setLastError(response.message || 'Registration failed.');
        }
        return response;
      } catch {
        setApiSessionScope(null);
        setIsApiAvailable(false);
        const errorMsg = 'Registration service is currently offline.';
        setLastError(errorMsg);
        return {
          success: false,
          message: errorMsg,
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Terminate authenticated session
   */
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setApiSessionScope(null);
    clearClientWorkspaceCache();
    try {
      await authService.logout();
    } finally {
      clearClientWorkspaceCache();
      setUser(null);
      setLastError(null);
      setIsLoading(false);
    }
  }, []);

  const updateAvatar = useCallback((avatarUrl: string | null) => {
    setUser((current) => current ? { ...current, avatar_url: avatarUrl } : current);
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      isApiAvailable,
      lastError,
      login,
      register,
      logout,
      updateAvatar,
      revalidateSession,
      clearError,
    }),
    [user, isLoading, isApiAvailable, lastError, login, register, logout, updateAvatar, revalidateSession, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
