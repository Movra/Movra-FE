import {
  clearStoredTokens,
  isVisualAuthEnabled,
  readStoredTokens,
  storeTokens,
} from "./sessionStorage";

const visualEnv = { MODE: "visual", VITE_VISUAL_AUTH: "1" } as const;

describe("auth session storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("enables visual auth only in explicit visual mode", () => {
    expect(isVisualAuthEnabled(visualEnv)).toBe(true);
    expect(isVisualAuthEnabled({ MODE: "visual", VITE_VISUAL_AUTH: "0" })).toBe(
      false,
    );
    expect(isVisualAuthEnabled({ MODE: "test", VITE_VISUAL_AUTH: "1" })).toBe(
      false,
    );
  });

  it("returns visual fallback tokens only when storage is empty and visual auth is enabled", () => {
    expect(readStoredTokens(visualEnv)).toEqual({
      accessToken: "visual-access-token",
      refreshToken: "visual-refresh-token",
    });
    expect(
      readStoredTokens({ MODE: "visual", VITE_VISUAL_AUTH: "0" }),
    ).toBeNull();
    expect(readStoredTokens({ MODE: "test", VITE_VISUAL_AUTH: "1" })).toBeNull();
  });

  it("prefers stored user tokens over visual fallback tokens", () => {
    storeTokens({ accessToken: "real-access", refreshToken: "real-refresh" });

    expect(readStoredTokens(visualEnv)).toEqual({
      accessToken: "real-access",
      refreshToken: "real-refresh",
    });
    expect(window.sessionStorage.getItem("movra.accessToken")).toBe("real-access");
    expect(window.localStorage.getItem("movra.accessToken")).toBeNull();
  });

  it("migrates legacy localStorage tokens into sessionStorage", () => {
    window.localStorage.setItem("movra.accessToken", "legacy-access");
    window.localStorage.setItem("movra.refreshToken", "legacy-refresh");

    expect(readStoredTokens({ MODE: "test", VITE_VISUAL_AUTH: "0" })).toEqual({
      accessToken: "legacy-access",
      refreshToken: "legacy-refresh",
    });
    expect(window.sessionStorage.getItem("movra.accessToken")).toBe(
      "legacy-access",
    );
    expect(window.localStorage.getItem("movra.accessToken")).toBeNull();
  });

  it("does not persist visual fallback tokens when clearing stored tokens", () => {
    expect(readStoredTokens(visualEnv)).not.toBeNull();

    clearStoredTokens();

    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
