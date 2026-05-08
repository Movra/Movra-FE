import { API_BASE_URL } from "../config/env";
import { type ApiRequestOptions, type ErrorResponse } from "./types";

type ApiAuthConfig = {
  onSessionExpired: () => void;
  refreshAccessToken: () => Promise<string | null>;
};

let apiAuthConfig: ApiAuthConfig | null = null;
let refreshAccessTokenPromise: Promise<string | null> | null = null;
const defaultErrorMessage = "요청 처리에 실패했습니다.";
const invalidJsonMessage = "응답을 해석하지 못했습니다.";
const networkErrorMessage = "네트워크 연결을 확인해 주세요.";

export class ApiClientError extends Error {
  readonly status: number;
  readonly response?: ErrorResponse;

  constructor(status: number, message: string, response?: ErrorResponse) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.response = response;
  }
}

export function configureApiAuth(config: ApiAuthConfig | null) {
  apiAuthConfig = config;
}

function createUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

async function readJson<T>(response: Response): Promise<T | undefined> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined;
  }

  const rawBody = await response.text();
  if (!rawBody.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new ApiClientError(response.status, invalidJsonMessage);
  }
}

function createHeaders(options: ApiRequestOptions, token?: string) {
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (isFormData(options.body)) {
      body = options.body;
    } else {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(options.body);
    }
  }

  return { body, headers };
}

async function request(
  path: string,
  options: ApiRequestOptions,
  token?: string,
) {
  const { body, headers } = createHeaders(options, token);

  try {
    return await fetch(createUrl(path), {
      method: options.method ?? "GET",
      headers,
      body,
      signal: options.signal,
    });
  } catch {
    throw new ApiClientError(0, networkErrorMessage);
  }
}

async function createApiError(response: Response) {
  const errorResponse = await readJson<ErrorResponse>(response);

  return new ApiClientError(
    response.status,
    errorResponse?.message ?? defaultErrorMessage,
    errorResponse,
  );
}

async function refreshAccessToken() {
  if (!apiAuthConfig) {
    return null;
  }

  refreshAccessTokenPromise ??= apiAuthConfig
    .refreshAccessToken()
    .catch(() => null)
    .finally(() => {
      refreshAccessTokenPromise = null;
    });

  return refreshAccessTokenPromise;
}

function shouldRefreshAuth(error: ApiClientError, options: ApiRequestOptions) {
  return Boolean(
    !options.skipAuthRefresh && options.token && error.status === 401,
  );
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const response = await request(path, options, options.token);

  if (!response.ok) {
    const error = await createApiError(response);

    if (shouldRefreshAuth(error, options)) {
      const nextAccessToken = await refreshAccessToken();

      if (nextAccessToken) {
        const retryResponse = await request(path, options, nextAccessToken);

        if (retryResponse.ok) {
          return (await readJson<T>(retryResponse)) as T;
        }

        const retryError = await createApiError(retryResponse);
        if (retryError.status === 401) {
          apiAuthConfig?.onSessionExpired();
        }
        throw retryError;
      }

      apiAuthConfig?.onSessionExpired();
    }

    throw error;
  }

  return (await readJson<T>(response)) as T;
}
