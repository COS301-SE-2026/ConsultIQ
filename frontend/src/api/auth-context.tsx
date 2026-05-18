import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import { injectAuth } from "./axios-client";

interface AuthContextType {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  refreshToken: () => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const refreshToken = async (): Promise<string | null> => {
    try {
      const res = await axios.post("/api/auth/refresh", {}, { withCredentials: true });
      const token = res.data.accessToken;
      setAccessToken(token);
      return token;
    } catch {
      logout();
      return null;
    }
  };

  const logout = () => {
    setAccessToken(null);
    window.location.href = "/login";
  };

  injectAuth({
    getToken: () => accessToken,
    refreshToken,
    logout,
  });

  return (
    <AuthContext.Provider value={{ accessToken, setAccessToken, refreshToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};