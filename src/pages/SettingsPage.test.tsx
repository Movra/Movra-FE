import { HttpResponse, http } from "msw";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../app/App";
import type { HomeToday, NotificationPreference } from "../features/core-loop/types";
import type {
  NotificationPreferenceUpdateRequest,
  WebPushSubscriptionRequest,
} from "../features/notification/types";
import { createHomeTodayFixture } from "../test/fixtures";
import { server } from "../test/server";

type SetupSettingsHandlersOptions = {
  initialHome?: HomeToday;
  initialPreference?: NotificationPreference;
  failUpdate?: boolean;
  failVapid?: boolean;
  failSubscribe?: boolean;
  vapidPublicKey?: string;
};

function authenticate(path = "/settings") {
  window.localStorage.setItem("movra.accessToken", "access-token");
  window.localStorage.setItem("movra.refreshToken", "refresh-token");
  window.history.pushState({}, "", path);
}

function defaultPreference(): NotificationPreference {
  return {
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
  };
}

function setupSettingsHandlers({
  initialHome = createHomeTodayFixture(),
  initialPreference = defaultPreference(),
  failUpdate = false,
  failVapid = false,
  failSubscribe = false,
  vapidPublicKey = "AQAB",
}: SetupSettingsHandlersOptions = {}) {
  let preference = initialPreference;
  const updates: NotificationPreferenceUpdateRequest[] = [];
  const subscribeCalls: WebPushSubscriptionRequest[] = [];

  server.use(
    http.get("http://localhost:8080/home/today", () =>
      HttpResponse.json(initialHome),
    ),
    http.get("http://localhost:8080/notification/preferences", () =>
      HttpResponse.json(preference),
    ),
    http.patch(
      "http://localhost:8080/notification/preferences",
      async ({ request }) => {
        const body =
          (await request.json()) as NotificationPreferenceUpdateRequest;
        if (failUpdate) {
          return HttpResponse.json(
            {
              message: "잘못된 알림 설정입니다.",
              statusCode: 400,
            },
            { status: 400 },
          );
        }
        updates.push(body);
        preference = {
          notificationPreferenceId: preference.notificationPreferenceId,
          ...body,
        };
        return HttpResponse.json(preference);
      },
    ),
    http.get("http://localhost:8080/web-push/vapid-public-key", () => {
      if (failVapid) {
        return HttpResponse.json(
          { message: "VAPID 키 조회 실패", statusCode: 500 },
          { status: 500 },
        );
      }
      return HttpResponse.json({ publicKey: vapidPublicKey });
    }),
    http.post(
      "http://localhost:8080/web-push/subscribe",
      async ({ request }) => {
        const body = (await request.json()) as WebPushSubscriptionRequest;
        if (failSubscribe) {
          return HttpResponse.json(
            {
              message: "INVALID_WEB_PUSH_SUBSCRIPTION",
              statusCode: 400,
            },
            { status: 400 },
          );
        }
        subscribeCalls.push(body);
        return HttpResponse.json({
          contentEncoding: body.contentEncoding,
          createdAt: "2026-04-24T01:00:00Z",
          endpoint: body.endpoint,
          lastRegisteredAt: "2026-04-24T01:00:00Z",
          webPushSubscriptionId: "sub-id",
        });
      },
    ),
  );

  return {
    getSubscribeCalls: () => subscribeCalls,
    getUpdates: () => updates,
  };
}

type StubSubscriptionShape = {
  endpoint: string;
  toJSON: () => {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
};

type WebPushMockOptions = {
  permission?: NotificationPermission;
  existingSubscription?: StubSubscriptionShape | null;
  serviceWorkerSupported?: boolean;
  notificationSupported?: boolean;
  pushManagerSupported?: boolean;
};

const defaultStubSubscription: StubSubscriptionShape = {
  endpoint: "https://push.example.com/abc",
  toJSON: () => ({
    endpoint: "https://push.example.com/abc",
    keys: { auth: "fake-auth", p256dh: "fake-p256dh" },
  }),
};

function setupWebPushMocks({
  permission = "default",
  existingSubscription = null,
  serviceWorkerSupported = true,
  notificationSupported = true,
  pushManagerSupported = true,
}: WebPushMockOptions = {}) {
  const subscribeMock = vi.fn().mockResolvedValue(defaultStubSubscription);
  const getSubscriptionMock = vi
    .fn()
    .mockResolvedValue(existingSubscription);
  const registration = {
    pushManager: {
      getSubscription: getSubscriptionMock,
      subscribe: subscribeMock,
    },
  };
  const registerMock = vi.fn().mockResolvedValue(registration);

  if (notificationSupported) {
    vi.stubGlobal("Notification", {
      permission,
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });
  } else {
    // remove Notification from window
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: undefined,
    });
  }

  if (serviceWorkerSupported) {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve(registration),
        register: registerMock,
      },
    });
  } else {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });
  }

  if (pushManagerSupported) {
    vi.stubGlobal("PushManager", function PushManager() {});
  } else {
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: undefined,
    });
  }

  return {
    getSubscriptionMock,
    registerMock,
    subscribeMock,
  };
}

function teardownWebPushMocks() {
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(window, "PushManager", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: undefined,
  });
}

describe("SettingsPage notification section", () => {
  it("renders the settings page heading instead of the placeholder", async () => {
    setupSettingsHandlers();
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "설정" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "기능 미구현" })).toBeNull();
  });

  it("loads notification preference from server and prefills form", async () => {
    setupSettingsHandlers({
      initialPreference: {
        accountabilityEnabled: true,
        dailyFocusEnabled: false,
        dailyTimetableEnabled: false,
        dailyTopPicksEnabled: true,
        maxDailyPushCount: 5,
        notificationPreferenceId: "preference-id",
        schoolHoursEnd: "16:00",
        schoolHoursQuietEnabled: false,
        schoolHoursStart: "09:00",
        sleepHoursQuietEnabled: true,
        weekendSchoolQuietEnabled: true,
      },
    });
    authenticate();

    render(<App />);

    await waitFor(() =>
      expect(screen.getByLabelText("일일 집중 알림")).not.toBeChecked(),
    );
    expect(screen.getByLabelText("일일 TopPick 알림")).toBeChecked();
    expect(screen.getByLabelText("일일 시간표 알림")).not.toBeChecked();
    expect(screen.getByLabelText("Accountability 알림")).toBeChecked();
    expect(screen.getByLabelText("학교 시간 무음")).not.toBeChecked();
    expect(screen.getByLabelText("주말 학교 시간 무음")).toBeChecked();
    expect(screen.getByLabelText("학교 시간 시작")).toHaveValue("09:00");
    expect(screen.getByLabelText("학교 시간 종료")).toHaveValue("16:00");
    expect(screen.getByLabelText("하루 최대 푸시 수")).toHaveValue(5);
  });

  it("redirects to /onboarding when behaviorProfile is null", async () => {
    setupSettingsHandlers({
      initialHome: createHomeTodayFixture({ behaviorProfile: null }),
    });
    server.use(
      http.get("http://localhost:8080/auth/onboarding-context", () =>
        HttpResponse.json({ pendingSchoolHours: false }),
      ),
    );
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "지금의 공부 루프를 가볍게 맞춰볼게요.",
      }),
    ).toBeInTheDocument();
  });

  it("submits the full preference body on save", async () => {
    const user = userEvent.setup();
    const handlers = setupSettingsHandlers();
    authenticate();

    render(<App />);

    await waitFor(() =>
      expect(screen.getByLabelText("일일 집중 알림")).toBeChecked(),
    );

    await user.click(screen.getByLabelText("일일 집중 알림"));
    fireEvent.change(screen.getByLabelText("하루 최대 푸시 수"), {
      target: { value: "5" },
    });

    await user.click(
      screen.getByRole("button", { name: "알림 설정 저장하기" }),
    );

    await waitFor(() =>
      expect(handlers.getUpdates()).toEqual([
        {
          accountabilityEnabled: false,
          dailyFocusEnabled: false,
          dailyTimetableEnabled: true,
          dailyTopPicksEnabled: true,
          maxDailyPushCount: 5,
          schoolHoursEnd: "15:30",
          schoolHoursQuietEnabled: true,
          schoolHoursStart: "08:00",
          sleepHoursQuietEnabled: true,
          weekendSchoolQuietEnabled: false,
        },
      ]),
    );
    expect(
      await screen.findByText("알림 설정을 저장했습니다."),
    ).toBeInTheDocument();
  });

  it("blocks save when school hours start equals end", async () => {
    const user = userEvent.setup();
    const handlers = setupSettingsHandlers();
    authenticate();

    render(<App />);

    await waitFor(() =>
      expect(screen.getByLabelText("학교 시간 시작")).toHaveValue("08:00"),
    );

    fireEvent.change(screen.getByLabelText("학교 시간 종료"), {
      target: { value: "08:00" },
    });

    await user.click(
      screen.getByRole("button", { name: "알림 설정 저장하기" }),
    );

    expect(
      await screen.findByText("학교 시간 시작은 종료 시간보다 빨라야 합니다."),
    ).toBeInTheDocument();
    expect(handlers.getUpdates()).toEqual([]);
  });

  it("blocks save when school hours start is after end", async () => {
    const user = userEvent.setup();
    const handlers = setupSettingsHandlers();
    authenticate();

    render(<App />);

    await waitFor(() =>
      expect(screen.getByLabelText("학교 시간 시작")).toHaveValue("08:00"),
    );

    fireEvent.change(screen.getByLabelText("학교 시간 시작"), {
      target: { value: "20:00" },
    });

    await user.click(
      screen.getByRole("button", { name: "알림 설정 저장하기" }),
    );

    expect(
      await screen.findByText("학교 시간 시작은 종료 시간보다 빨라야 합니다."),
    ).toBeInTheDocument();
    expect(handlers.getUpdates()).toEqual([]);
  });

  it("blocks save when max daily push count exceeds 10", async () => {
    const user = userEvent.setup();
    const handlers = setupSettingsHandlers();
    authenticate();

    render(<App />);

    await waitFor(() =>
      expect(screen.getByLabelText("하루 최대 푸시 수")).toHaveValue(3),
    );

    fireEvent.change(screen.getByLabelText("하루 최대 푸시 수"), {
      target: { value: "11" },
    });

    await user.click(
      screen.getByRole("button", { name: "알림 설정 저장하기" }),
    );

    expect(
      await screen.findByText(
        "하루 최대 푸시 수는 0~10 사이여야 합니다.",
      ),
    ).toBeInTheDocument();
    expect(handlers.getUpdates()).toEqual([]);
  });

  it("blocks save when max daily push count is negative", async () => {
    const user = userEvent.setup();
    const handlers = setupSettingsHandlers();
    authenticate();

    render(<App />);

    await waitFor(() =>
      expect(screen.getByLabelText("하루 최대 푸시 수")).toHaveValue(3),
    );

    fireEvent.change(screen.getByLabelText("하루 최대 푸시 수"), {
      target: { value: "-1" },
    });

    await user.click(
      screen.getByRole("button", { name: "알림 설정 저장하기" }),
    );

    expect(
      await screen.findByText(
        "하루 최대 푸시 수는 0~10 사이여야 합니다.",
      ),
    ).toBeInTheDocument();
    expect(handlers.getUpdates()).toEqual([]);
  });

  it("renders sleep hours toggle as disabled and checked", async () => {
    setupSettingsHandlers();
    authenticate();

    render(<App />);

    const sleepToggle = await screen.findByLabelText("수면 시간 무음");
    expect(sleepToggle).toBeChecked();
    expect(sleepToggle).toBeDisabled();
  });

  it("surfaces a 400 error when notification update fails", async () => {
    const user = userEvent.setup();
    setupSettingsHandlers({ failUpdate: true });
    authenticate();

    render(<App />);

    await waitFor(() =>
      expect(screen.getByLabelText("일일 집중 알림")).toBeChecked(),
    );

    await user.click(
      screen.getByRole("button", { name: "알림 설정 저장하기" }),
    );

    expect(
      await screen.findByText("잘못된 알림 설정입니다."),
    ).toBeInTheDocument();
  });
});

describe("SettingsPage web push section", () => {
  afterEach(() => {
    teardownWebPushMocks();
  });

  it("disables button and explains when browser does not support Web Push", async () => {
    setupSettingsHandlers();
    setupWebPushMocks({ notificationSupported: false });
    authenticate();

    render(<App />);

    await waitFor(() =>
      expect(
        screen.getByText("이 브라우저에서는 Web Push를 사용할 수 없습니다."),
      ).toBeInTheDocument(),
    );
  });

  it("disables button when permission is denied", async () => {
    setupSettingsHandlers();
    setupWebPushMocks({ permission: "denied" });
    authenticate();

    render(<App />);

    await waitFor(() =>
      expect(
        screen.getByText("브라우저 설정에서 알림 권한을 허용해 주세요."),
      ).toBeInTheDocument(),
    );

    expect(
      screen.getByRole("button", { name: "Web Push 알림 받기" }),
    ).toBeDisabled();
  });

  it("requests permission and registers a Web Push subscription on click", async () => {
    const user = userEvent.setup();
    const handlers = setupSettingsHandlers();
    const mocks = setupWebPushMocks({ permission: "default" });
    authenticate();

    render(<App />);

    const button = await screen.findByRole("button", {
      name: "Web Push 알림 받기",
    });
    await user.click(button);

    await waitFor(() => expect(mocks.registerMock).toHaveBeenCalled());
    expect(mocks.registerMock).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    expect(mocks.subscribeMock).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );

    await waitFor(() =>
      expect(handlers.getSubscribeCalls()).toEqual([
        {
          contentEncoding: "aes128gcm",
          endpoint: "https://push.example.com/abc",
          keys: { auth: "fake-auth", p256dh: "fake-p256dh" },
          userAgent: navigator.userAgent,
        },
      ]),
    );

    expect(
      window.localStorage.getItem("movra:webPushEndpoint"),
    ).toBe("https://push.example.com/abc");
  });

  it("registers subscription when permission already granted and no existing subscription", async () => {
    const user = userEvent.setup();
    const handlers = setupSettingsHandlers();
    setupWebPushMocks({ permission: "granted", existingSubscription: null });
    authenticate();

    render(<App />);

    const button = await screen.findByRole("button", {
      name: "Web Push 알림 받기",
    });
    await user.click(button);

    await waitFor(() =>
      expect(handlers.getSubscribeCalls()).toHaveLength(1),
    );
  });

  it("shows '다시 등록' label when permission granted and stored endpoint matches existing subscription", async () => {
    setupSettingsHandlers();
    window.localStorage.setItem(
      "movra:webPushEndpoint",
      "https://push.example.com/abc",
    );
    setupWebPushMocks({
      existingSubscription: defaultStubSubscription,
      permission: "granted",
    });
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("button", { name: "다시 등록" }),
    ).toBeInTheDocument();
  });

  it("surfaces an error when VAPID GET fails", async () => {
    const user = userEvent.setup();
    setupSettingsHandlers({ failVapid: true });
    setupWebPushMocks({ permission: "default" });
    authenticate();

    render(<App />);

    const button = await screen.findByRole("button", {
      name: "Web Push 알림 받기",
    });
    await user.click(button);

    expect(
      await screen.findByText(/VAPID 키 조회 실패/),
    ).toBeInTheDocument();
  });

  it("surfaces an error when subscribe POST returns 400", async () => {
    const user = userEvent.setup();
    setupSettingsHandlers({ failSubscribe: true });
    setupWebPushMocks({ permission: "default" });
    authenticate();

    render(<App />);

    const button = await screen.findByRole("button", {
      name: "Web Push 알림 받기",
    });
    await user.click(button);

    expect(
      await screen.findByText(/INVALID_WEB_PUSH_SUBSCRIPTION/),
    ).toBeInTheDocument();
  });
});
