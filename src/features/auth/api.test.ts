import {
  completeOAuthProfileSetup,
  getOAuthAuthorizeUrl,
  login,
  reissueTokens,
  signup,
} from "./api";

describe("auth api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the documented login endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "access-token",
          refreshToken: "refresh-token",
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      login({ accountId: "student", password: "password" }),
    ).resolves.toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/auth/login",
      expect.objectContaining({
        body: JSON.stringify({ accountId: "student", password: "password" }),
        method: "POST",
      }),
    );
  });

  it("calls the documented token reissue endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "next-access-token",
          refreshToken: "next-refresh-token",
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(reissueTokens("refresh-token")).resolves.toEqual({
      accessToken: "next-access-token",
      refreshToken: "next-refresh-token",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/auth/reissue",
      expect.objectContaining({
        body: JSON.stringify({ refreshToken: "refresh-token" }),
        method: "POST",
      }),
    );
  });

  it("calls the documented signup endpoint with multipart form data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const profileImage = new File(["avatar"], "avatar.png", {
      type: "image/png",
    });

    await expect(
      signup({
        accountId: "student",
        email: "student@example.com",
        password: "password",
        profileImage,
        profileName: "학생",
      }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/auth/signup",
      expect.objectContaining({
        method: "POST",
      }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = request.body as FormData;
    expect(body.get("accountId")).toBe("student");
    expect(body.get("email")).toBe("student@example.com");
    expect(body.get("profileName")).toBe("학생");
    expect(body.get("profileImage")).toBe(profileImage);
    expect(body.get("password")).toBe("password");
    expect(new Headers(request.headers).get("Content-Type")).toBeNull();
  });

  it("calls the documented OAuth profile setup endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "access-token",
          isProfileCompleted: true,
          refreshToken: "refresh-token",
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const profileImage = new File(["avatar"], "avatar.png", {
      type: "image/png",
    });

    await expect(
      completeOAuthProfileSetup({
        accountId: "student",
        password: "password",
        pendingToken: "pending token",
        profileImage,
        profileName: "학생",
      }),
    ).resolves.toEqual({
      accessToken: "access-token",
      isProfileCompleted: true,
      refreshToken: "refresh-token",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/auth/oauth/profile-setup?pendingToken=pending%20token",
      expect.objectContaining({
        method: "POST",
      }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = request.body as FormData;
    expect(body.get("accountId")).toBe("student");
    expect(body.get("profileName")).toBe("학생");
    expect(body.get("profileImage")).toBe(profileImage);
    expect(body.get("password")).toBe("password");
    expect(new Headers(request.headers).get("Content-Type")).toBeNull();
  });

  it("builds provider OAuth authorization URLs against the backend", () => {
    expect(getOAuthAuthorizeUrl("google")).toBe(
      "http://localhost:8080/oauth2/authorization/google",
    );
    expect(getOAuthAuthorizeUrl("naver")).toBe(
      "http://localhost:8080/oauth2/authorization/naver",
    );
  });
});
