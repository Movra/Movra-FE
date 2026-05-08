import { ApiClientError } from "../../shared/api/client";
import {
  getNotificationPreference,
  getVapidPublicKey,
  subscribeWebPush,
  updateNotificationPreference,
} from "./api";

describe("notification preference api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the documented Notification Preference read endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accountabilityEnabled: false,
          dailyFocusEnabled: true,
          dailyTimetableEnabled: true,
          dailyTopPicksEnabled: true,
          maxDailyPushCount: 3,
          notificationPreferenceId: "preference-id",
          schoolHoursEnd: "15:30",
          schoolHoursQuietEnabled: true,
          schoolHoursStart: "08:00",
          sleepHoursQuietEnabled: true,
          weekendSchoolQuietEnabled: false,
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getNotificationPreference({ token: "access-token" }),
    ).resolves.toEqual({
      accountabilityEnabled: false,
      dailyFocusEnabled: true,
      dailyTimetableEnabled: true,
      dailyTopPicksEnabled: true,
      maxDailyPushCount: 3,
      notificationPreferenceId: "preference-id",
      schoolHoursEnd: "15:30",
      schoolHoursQuietEnabled: true,
      schoolHoursStart: "08:00",
      sleepHoursQuietEnabled: true,
      weekendSchoolQuietEnabled: false,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/notification/preferences",
      expect.objectContaining({ method: "GET" }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });

  it("calls the documented Notification Preference update endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accountabilityEnabled: false,
          dailyFocusEnabled: true,
          dailyTimetableEnabled: true,
          dailyTopPicksEnabled: true,
          maxDailyPushCount: 5,
          notificationPreferenceId: "preference-id",
          schoolHoursEnd: "15:30",
          schoolHoursQuietEnabled: true,
          schoolHoursStart: "08:00",
          sleepHoursQuietEnabled: true,
          weekendSchoolQuietEnabled: false,
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await updateNotificationPreference({
      token: "access-token",
      values: {
        accountabilityEnabled: false,
        dailyFocusEnabled: true,
        dailyTimetableEnabled: true,
        dailyTopPicksEnabled: true,
        maxDailyPushCount: 5,
        schoolHoursEnd: "15:30",
        schoolHoursQuietEnabled: true,
        schoolHoursStart: "08:00",
        sleepHoursQuietEnabled: true,
        weekendSchoolQuietEnabled: false,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/notification/preferences",
      expect.objectContaining({
        body: JSON.stringify({
          accountabilityEnabled: false,
          dailyFocusEnabled: true,
          dailyTimetableEnabled: true,
          dailyTopPicksEnabled: true,
          maxDailyPushCount: 5,
          schoolHoursEnd: "15:30",
          schoolHoursQuietEnabled: true,
          schoolHoursStart: "08:00",
          sleepHoursQuietEnabled: true,
          weekendSchoolQuietEnabled: false,
        }),
        method: "PATCH",
      }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });

  it("propagates a Notification Preference 400 via ApiClientError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "잘못된 알림 설정입니다.",
          statusCode: 400,
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 400,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const promise = updateNotificationPreference({
      token: "access-token",
      values: {
        accountabilityEnabled: false,
        dailyFocusEnabled: true,
        dailyTimetableEnabled: true,
        dailyTopPicksEnabled: true,
        maxDailyPushCount: 99,
        schoolHoursEnd: "15:30",
        schoolHoursQuietEnabled: true,
        schoolHoursStart: "08:00",
        sleepHoursQuietEnabled: true,
        weekendSchoolQuietEnabled: false,
      },
    });
    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
    await expect(promise).rejects.toMatchObject({ status: 400 });
  });
});

describe("web push api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the documented VAPID public key endpoint without authorization", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ publicKey: "base64-url-vapid-public-key" }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getVapidPublicKey()).resolves.toEqual({
      publicKey: "base64-url-vapid-public-key",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/web-push/vapid-public-key",
      expect.objectContaining({ method: "GET" }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBeNull();
  });

  it("calls the documented Web Push subscribe endpoint with the documented body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          contentEncoding: "aes128gcm",
          createdAt: "2026-04-24T01:00:00Z",
          endpoint: "https://push.example.com/abc",
          lastRegisteredAt: "2026-04-24T01:00:00Z",
          webPushSubscriptionId: "sub-id",
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await subscribeWebPush({
      token: "access-token",
      values: {
        contentEncoding: "aes128gcm",
        endpoint: "https://push.example.com/abc",
        keys: { auth: "auth-key", p256dh: "p256dh-key" },
        userAgent: "Mozilla/5.0",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/web-push/subscribe",
      expect.objectContaining({
        body: JSON.stringify({
          contentEncoding: "aes128gcm",
          endpoint: "https://push.example.com/abc",
          keys: { auth: "auth-key", p256dh: "p256dh-key" },
          userAgent: "Mozilla/5.0",
        }),
        method: "POST",
      }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });

  it("propagates a Web Push subscribe 400 via ApiClientError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "잘못된 구독 정보입니다.",
          statusCode: 400,
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 400,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const promise = subscribeWebPush({
      token: "access-token",
      values: {
        contentEncoding: "aes128gcm",
        endpoint: "https://push.example.com/abc",
        keys: { auth: "auth-key", p256dh: "p256dh-key" },
        userAgent: "Mozilla/5.0",
      },
    });
    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
    await expect(promise).rejects.toMatchObject({ status: 400 });
  });
});
