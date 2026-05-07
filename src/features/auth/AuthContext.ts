import { createContext } from "react";

import type { LoginRequest, OAuthProfileSetupRequest } from "./api";

export type AuthContextValue = {
  accessToken: string | null;
  completeOAuthProfileSetup: (
    request: OAuthProfileSetupRequest,
  ) => Promise<void>;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
