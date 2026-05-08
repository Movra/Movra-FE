import type { TokenPair } from "./api";

const ACCESS_TOKEN_KEY = "movra.accessToken";
const REFRESH_TOKEN_KEY = "movra.refreshToken";
const VISUAL_TOKENS: TokenPair = {
  accessToken: "visual-access-token",
  refreshToken: "visual-refresh-token",
};

type AuthStorageEnv = Pick<ImportMetaEnv, "MODE" | "VITE_VISUAL_AUTH">;

export function isVisualAuthEnabled(env: AuthStorageEnv = import.meta.env) {
  return env.MODE === "visual" && env.VITE_VISUAL_AUTH === "1";
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

function readTokensFromStorage(storage: Storage): TokenPair | null {
  const accessToken = storage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = storage.getItem(REFRESH_TOKEN_KEY);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

function clearLegacyLocalStorageTokens() {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function readStoredTokens(
  env: AuthStorageEnv = import.meta.env,
): TokenPair | null {
  if (!canUseStorage()) {
    if (isVisualAuthEnabled(env)) {
      return VISUAL_TOKENS;
    }

    return null;
  }

  const sessionTokens = readTokensFromStorage(window.sessionStorage);
  if (sessionTokens) {
    return sessionTokens;
  }

  const legacyTokens =
    typeof window.localStorage === "undefined"
      ? null
      : readTokensFromStorage(window.localStorage);
  if (legacyTokens) {
    storeTokens(legacyTokens);
    clearLegacyLocalStorageTokens();
    return legacyTokens;
  }

  if (isVisualAuthEnabled(env)) {
    return VISUAL_TOKENS;
  }

  return null;
}

export function storeTokens(tokens: TokenPair) {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  clearLegacyLocalStorageTokens();
}

export function clearStoredTokens() {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  clearLegacyLocalStorageTokens();
}
