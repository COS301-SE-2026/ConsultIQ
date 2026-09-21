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

  const [isLoggingOutUI, setIsLoggingOutUI] = useState(false);
  const [logoutProgress, setLogoutProgress] = useState(0);

  const logout = useCallback(async () => {
    setLoggingOut(true);
    setIsLoggingOutUI(true);
    setLogoutProgress(0);

    const progressInterval = setInterval(() => {
      setLogoutProgress((prev) => {

        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.floor(Math.random() * 10) + 5;
      });
    }, 100);

    try {
      await authService.logout();
    } catch {
      // Ignore logout errors
    } finally {
      clearInterval(progressInterval);
      setLogoutProgress(100);

      setTimeout(() => {
        window.location.href = '/login';
      }, 300);
    }
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

  return (
    <AuthContext.Provider value={value}>
      {isLoggingOutUI && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white h-screen w-screen">

          <div className="flex justify-between w-64 mb-2">
            <span className="text-sm font-medium text-gray-600">Logging out...</span>
            {/* Show the exact percentage number */}
            <span className="text-sm font-medium text-gray-600">
              {Math.min(100, Math.round(logoutProgress))}%
            </span>
          </div>

          {/* Progress Bar Container */}
          <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-150 ease-out"
              style={{ width: `${Math.min(100, logoutProgress)}%` }}
            ></div>
          </div>

        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}