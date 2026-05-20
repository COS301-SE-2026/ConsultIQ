/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { authService } from '../features/authentication/services/auth.service';
import type { LoginPayload, LoginResult } from '../features/authentication/types/auth.types';

const ACCESS_TOKEN_KEY = 'ciq_access_token';
const REFRESH_TOKEN_KEY = 'ciq_refresh_token';

// Clean profile shape stripped of the token strings
export type UserProfile = Omit<LoginResult, 'accessToken' | 'refreshToken'>;

interface AuthContextValue {
    tokens: { accessToken: string; refreshToken: string } | null;
    user: UserProfile | null;
    isAuthenticated: boolean;
    login: (payload: LoginPayload) => Promise<string | undefined>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Initialize tokens state from sessionStorage 
    const [tokens, setTokens] = useState<{ accessToken: string; refreshToken: string } | null>(() => {
        const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
        const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
        if (accessToken && refreshToken) return { accessToken, refreshToken };
        return null;
    });

    // Initialize user profile state
    const [user, setUser] = useState<UserProfile | null>(null);

    // Clear storage and state on logout
    const logout = useCallback(() => {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        setTokens(null);
        setUser(null);
    }, []);

    // Session recovery: Run on app mount to get user metadata if an active token exists
    useEffect(() => {
        const checkAuth = async () => {
            const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
            if (!token) return;

            try {
                const profile = await authService.getProfile();
                setUser(profile);
            } catch (error) {
                console.error('Session restoration failed:', error);
                logout();
            }
        };

        checkAuth();
    }, [logout]);

    // Login processor
    const login = useCallback(async (payload: LoginPayload) => {
        const response = await authService.login(payload);

        if (response && response.result) {
            const { accessToken, refreshToken, ...userProfile } = response.result;

            // Persist tokens across page reloads in sessionStorage
            sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
            sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

            setTokens({ accessToken, refreshToken });
            setUser(userProfile);

            // Return dashboard route to let the Login page wrap up routing
            return userProfile.dashboardRoute;
        } else {
            console.error('Backend response structure is unexpected:', response);
            throw new Error('Malformed response structure from authentication server.');
        }
    }, []);

    // Memoized value to eliminate unneeded re-renders
    const value = useMemo<AuthContextValue>(
        () => ({
            tokens,
            user,
            isAuthenticated: tokens !== null,
            login,
            logout,
        }),
        [tokens, user, login, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom React hook for cross-app consumption
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}