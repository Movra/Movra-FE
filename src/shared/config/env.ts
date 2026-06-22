function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) {
    return configured;
  }

  // A missing base URL in production silently points every request at the
  // user's own localhost. Fail loudly instead so it cannot ship unnoticed.
  if (import.meta.env.PROD) {
    throw new Error(
      "VITE_API_BASE_URL must be configured for production builds.",
    );
  }

  return "http://localhost:8080";
}

export const API_BASE_URL = resolveApiBaseUrl();
