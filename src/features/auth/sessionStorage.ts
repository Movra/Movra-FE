import type { TokenPair } from "./api";

const ACCESS_TOKEN_KEY = "movra.accessToken";
const REFRESH_TOKEN_KEY = "movra.refreshToken";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function readStoredTokens(): TokenPair | null {
  if (!canUseStorage()) {
    return null;
  }

  const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export function storeTokens(tokens: TokenPair) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearStoredTokens() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
