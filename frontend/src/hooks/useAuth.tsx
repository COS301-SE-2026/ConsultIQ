/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useState, useEffect, useLayoutEffect } from 'react';
import { authService } from '../features/authentication/services/auth.service';
import type { LoginPayload } from '../features/authentication/types/auth.types';
import { injectAuth, setLoggingOut } from '../lib/api-client';

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
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<string | undefined>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      // Ignore logout errors
    }
    setUser(null);
  }, []);


  useLayoutEffect(() => {
    injectAuth({
      refreshToken: async () => {
        return await authService.refresh();
      },
      logout: () => {
        logout();
      }
    });
  }, [logout]);

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
    setLoggingOut(false);

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
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}