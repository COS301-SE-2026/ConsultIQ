import { createContext} from "react";


interface AuthContextType {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  refreshToken: () => Promise<string | null>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

