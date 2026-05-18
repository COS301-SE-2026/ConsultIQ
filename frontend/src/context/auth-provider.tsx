import { useState } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import { injectAuth } from "../api/axios-client";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const refreshToken = async (): Promise<string | null> => {
    try {
      //will be adjsuted to use the actual refresh url
      const res = await axios.post("/api/auth/refresh", {}, { withCredentials: true });
      const token = res.data.accessToken;
      setAccessToken(token);
      return token;
    } catch {
      logout();
      return null;
    }
  };

  

const logout = async () => {
  try {
   
    await axios.post("logout url", {}, { withCredentials: true });
  } catch (err) {

    console.error("Server-side logout failed:", err);
  } finally {
    setAccessToken(null);
    window.location.href = "/login";
  }
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
