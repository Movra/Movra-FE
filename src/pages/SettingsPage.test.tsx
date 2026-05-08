import { HttpResponse, http } from "msw";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../app/App";
import type { HomeToday, NotificationPreference } from "../features/core-loop/types";
import type { NotificationPreferenceUpdateRequest } from "../features/notification/types";
import { createHomeTodayFixture } from "../test/fixtures";
import { server } from "../test/server";

type SetupSettingsHandlersOptions = {
  initialHome?: HomeToday;
  initialPreference?: NotificationPreference;
  failUpdate?: boolean;
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
}: SetupSettingsHandlersOptions = {}) {
  let preference = initialPreference;
  const updates: NotificationPreferenceUpdateRequest[] = [];

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
  );

  return {
    getUpdates: () => updates,
  };
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
