import {
  createBehaviorProfile,
  getBehaviorProfile,
  getOnboardingContext,
  updateBehaviorProfile,
} from "./api";
import type { BehaviorProfileRequest } from "./types";

const behaviorProfileRequest: BehaviorProfileRequest = {
  coachingMode: "GENTLE",
  examTrack: "NAESIN",
  executionDifficulty: "MEDIUM",
  preferredFocusEndHour: 21,
  preferredFocusStartHour: 9,
  recoveryStyle: "QUICK_RESTART",
  socialPreference: "LOW",
};

describe("onboarding api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gets the documented onboarding context", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ pendingSchoolHours: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getOnboardingContext()).resolves.toEqual({
      pendingSchoolHours: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/auth/onboarding-context",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("creates the documented behavior profile", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createBehaviorProfile({
        token: "access-token",
        values: behaviorProfileRequest,
      }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/behavior-profiles",
      expect.objectContaining({
        body: JSON.stringify(behaviorProfileRequest),
        method: "POST",
      }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });

  it("gets and updates the documented behavior profile", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            behaviorProfileId: "behavior-profile-id",
            ...behaviorProfileRequest,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getBehaviorProfile({ token: "access-token" })).resolves.toEqual({
      behaviorProfileId: "behavior-profile-id",
      ...behaviorProfileRequest,
    });
    await expect(
      updateBehaviorProfile({
        token: "access-token",
        values: { ...behaviorProfileRequest, coachingMode: "NEUTRAL" },
      }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8080/behavior-profiles/me",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8080/behavior-profiles/me",
      expect.objectContaining({
        body: JSON.stringify({
          ...behaviorProfileRequest,
          coachingMode: "NEUTRAL",
        }),
        method: "PUT",
      }),
    );
  });
});
