// import { useState, useCallback, useMemo } from "react";
// import type { ReactNode } from "react";
// import axios from "axios";
// import { injectAuth } from "../api/axios-client";
// import { AuthContext } from "./auth-context";

// interface AuthProviderProps {
//   readonly children: ReactNode;
// }

// export function AuthProvider({ children }: AuthProviderProps) {
//   const [accessToken, setAccessToken] = useState<string | null>(null);

  
//   const logout = useCallback(async () => {
//     try {
//       await axios.post("logout url", {}, { withCredentials: true });
//     } catch (err) {
//       console.error("Server-side logout failed:", err);
//     } finally {
//       setAccessToken(null);
//       globalThis.location.href = "/login";
//     }
//   }, []);

 
//   const refreshToken = useCallback(async (): Promise<string | null> => {
//     try {
//       // will be adjusted to use the actual refresh url
//       const res = await axios.post("/api/auth/refresh", {}, { withCredentials: true });
//       const token = res.data.accessToken;
//       setAccessToken(token);
//       return token;
//     } catch {
//       logout();
//       return null;
//     }
//   }, [logout]);

//   injectAuth({
//     getToken: () => accessToken,
//     refreshToken,
//     logout,
//   });

//   const contextValue = useMemo(() => ({
//     accessToken,
//     setAccessToken,
//     refreshToken,
//     logout,
//   }), [accessToken, refreshToken, logout]);

//   return (
//     <AuthContext.Provider value={contextValue}>
//       {children}
//     </AuthContext.Provider>
//   );
// }