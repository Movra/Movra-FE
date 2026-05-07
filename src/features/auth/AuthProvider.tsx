import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AuthContext, type AuthContextValue } from "./AuthContext";
import {
  completeOAuthProfileSetup as requestOAuthProfileSetup,
  login as requestLogin,
  reissueTokens as requestReissueTokens,
  type LoginRequest,
  type OAuthProfileSetupRequest,
  type TokenPair,
} from "./api";
import {
  clearStoredTokens,
  readStoredTokens,
  storeTokens,
} from "./sessionStorage";
import { configureApiAuth } from "../../shared/api/client";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [tokens, setTokens] = useState<TokenPair | null>(readStoredTokens);

  const handleLogin = useCallback(async (request: LoginRequest) => {
    const nextTokens = await requestLogin(request);
    storeTokens(nextTokens);
    setTokens(nextTokens);
  }, []);

  const handleOAuthProfileSetup = useCallback(
    async (request: OAuthProfileSetupRequest) => {
      const nextTokens = await requestOAuthProfileSetup(request);
      storeTokens(nextTokens);
      setTokens(nextTokens);
    },
    [],
  );

  const handleLogout = useCallback(() => {
    clearStoredTokens();
    setTokens(null);
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const storedTokens = readStoredTokens();

    if (!storedTokens?.refreshToken) {
      handleLogout();
      return null;
    }

    try {
      const nextTokens = await requestReissueTokens(storedTokens.refreshToken);
      storeTokens(nextTokens);
      setTokens(nextTokens);
      return nextTokens.accessToken;
    } catch {
      handleLogout();
      return null;
    }
  }, [handleLogout]);

  useEffect(() => {
    configureApiAuth({
      onSessionExpired: handleLogout,
      refreshAccessToken,
    });

    return () => configureApiAuth(null);
  }, [handleLogout, refreshAccessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken: tokens?.accessToken ?? null,
      completeOAuthProfileSetup: handleOAuthProfileSetup,
      refreshToken: tokens?.refreshToken ?? null,
      isAuthenticated: Boolean(tokens?.accessToken && tokens.refreshToken),
      login: handleLogin,
      logout: handleLogout,
    }),
    [handleLogin, handleLogout, handleOAuthProfileSetup, tokens],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
