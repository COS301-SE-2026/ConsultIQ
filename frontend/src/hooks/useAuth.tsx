/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { authService } from '../features/authentication/services/auth.service';
import type { LoginPayload } from '../features/authentication/types/auth.types';

// Remove session tokens from profile
export type UserProfile = {
  userId: string;
  email: string;
  role: string;
  dashboardRoute: string;
};

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<string | undefined>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore logout errors
    }
    setUser(null);
  }, []);

  // On mount and check if the user is already logged in by calling /auth/me
  // The HTTP-only cookie is sent automatically by the browser
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const profile = await authService.getProfile();
        setUser(profile as UserProfile);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await authService.login(payload);

    if (response && response.result) {
        const userProfile = Object.fromEntries(
            Object.entries(response.result as Record<string, unknown>).filter(
            ([key]) => key !== 'accessToken' && key !== 'refreshToken'
            )
        ) as UserProfile;
        setUser(userProfile);
        return (userProfile as Record<string, unknown>).dashboardRoute as string | undefined;

    } else {
      throw new Error('Malformed response structure from authentication server.');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      logout,
    }),
    [user, login, logout],
  );

  // Don't render children until we know if the user is authenticated
  if (isLoading) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}