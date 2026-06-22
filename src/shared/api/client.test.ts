import { apiRequest, ApiClientError, configureApiAuth } from "./client";

describe("apiRequest", () => {
  afterEach(() => {
    configureApiAuth(null);
    vi.restoreAllMocks();
  });

  it("sends JSON requests to the backend base URL with bearer auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accessToken: "access" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await apiRequest<{ accessToken: string }>("/auth/login", {
      body: { accountId: "student", password: "password" },
      method: "POST",
      token: "token",
    });

    expect(response.accessToken).toBe("access");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/auth/login",
      expect.objectContaining({
        body: JSON.stringify({ accountId: "student", password: "password" }),
        method: "POST",
      }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer token",
    );
    expect(new Headers(request.headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("throws API errors using the documented ErrorResponse shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            httpStatus: "BAD_REQUEST",
            statusCode: 400,
            message: "잘못된 요청입니다.",
            timestamp: "2026-04-24T09:30:00",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 400,
          },
        ),
      ),
    );

    await expect(apiRequest("/daily-plans")).rejects.toMatchObject({
      message: "잘못된 요청입니다.",
      name: "ApiClientError",
      status: 400,
    } satisfies Partial<ApiClientError>);
  });

  it("uses the default API error message for non-JSON error bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("service unavailable", {
          headers: { "content-type": "text/plain" },
          status: 503,
        }),
      ),
    );

    await expect(apiRequest("/daily-plans")).rejects.toMatchObject({
      message: "요청 처리에 실패했습니다.",
      name: "ApiClientError",
      status: 503,
    } satisfies Partial<ApiClientError>);
  });

  it("returns undefined for successful empty responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

    await expect(apiRequest<void>("/future-vision/weekly")).resolves.toBeUndefined();
  });

  it("surfaces non-JSON success bodies as API client errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<!doctype html><title>oops</title>", {
          headers: { "content-type": "text/html" },
          status: 200,
        }),
      ),
    );

    await expect(apiRequest("/home/today")).rejects.toMatchObject({
      message: "응답을 해석하지 못했습니다.",
      name: "ApiClientError",
      status: 200,
    } satisfies Partial<ApiClientError>);
  });

  it("wraps invalid JSON responses as API client errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{", {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      ),
    );

    await expect(apiRequest("/home/today")).rejects.toMatchObject({
      message: "응답을 해석하지 못했습니다.",
      name: "ApiClientError",
      status: 200,
    } satisfies Partial<ApiClientError>);
  });

  it("wraps network failures as API client errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("failed")));

    await expect(apiRequest("/home/today")).rejects.toMatchObject({
      message: "네트워크 연결을 확인해 주세요.",
      name: "ApiClientError",
      status: 0,
    } satisfies Partial<ApiClientError>);
  });

  it("refreshes the access token once and retries expired authenticated requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            httpStatus: "UNAUTHORIZED",
            statusCode: 401,
            message: "JWT 토큰이 만료되었습니다.",
            timestamp: "2026-04-24T09:30:00",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 401,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: "ok" }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const refreshAccessToken = vi.fn().mockResolvedValue("next-token");
    const onSessionExpired = vi.fn();
    configureApiAuth({ onSessionExpired, refreshAccessToken });

    await expect(
      apiRequest<{ result: string }>("/home/today", { token: "expired-token" }),
    ).resolves.toEqual({ result: "ok" });

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).not.toHaveBeenCalled();

    const retryRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(new Headers(retryRequest.headers).get("Authorization")).toBe(
      "Bearer next-token",
    );
  });

  it("expires the session when token refresh is not available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            httpStatus: "UNAUTHORIZED",
            statusCode: 401,
            message: "JWT 토큰이 만료되었습니다.",
            timestamp: "2026-04-24T09:30:00",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 401,
          },
        ),
      ),
    );

    const onSessionExpired = vi.fn();
    configureApiAuth({
      onSessionExpired,
      refreshAccessToken: vi.fn().mockResolvedValue(null),
    });

    await expect(apiRequest("/home/today", { token: "expired-token" })).rejects
      .toMatchObject({
        message: "JWT 토큰이 만료되었습니다.",
        status: 401,
      });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });
});
