import { HttpResponse, http } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../app/App";
import {
  createBehaviorProfileFixture,
  createHomeTodayFixture,
} from "../test/fixtures";
import { server } from "../test/server";
import type {
  BehaviorProfile,
  BehaviorProfileRequest,
} from "../features/onboarding/types";

function authenticate(path = "/onboarding") {
  window.localStorage.setItem("movra.accessToken", "access-token");
  window.localStorage.setItem("movra.refreshToken", "refresh-token");
  window.history.pushState({}, "", path);
}

describe("OnboardingPage", () => {
  it("creates the default behavior profile when skipped and enters home", async () => {
    let profileCreated = false;
    const requests: BehaviorProfileRequest[] = [];

    server.use(
      http.get("http://localhost:8080/auth/onboarding-context", () =>
        HttpResponse.json({ pendingSchoolHours: false }),
      ),
      http.get("http://localhost:8080/home/today", () =>
        HttpResponse.json(
          createHomeTodayFixture({
            behaviorProfile: profileCreated
              ? createBehaviorProfileFixture()
              : null,
          }),
        ),
      ),
      http.post("http://localhost:8080/behavior-profiles", async ({ request }) => {
        requests.push((await request.json()) as BehaviorProfileRequest);
        profileCreated = true;

        return new HttpResponse(null, { status: 200 });
      }),
    );
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "지금의 공부 루프를 가볍게 맞춰볼게요.",
      }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "건너뛰기" }));

    expect(requests).toEqual([
      {
        coachingMode: "GENTLE",
        examTrack: "UNDECIDED",
        executionDifficulty: "MEDIUM",
        preferredFocusEndHour: 21,
        preferredFocusStartHour: 9,
        recoveryStyle: "QUICK_RESTART",
        socialPreference: "LOW",
      },
    ]);
    expect(
      await screen.findByRole("heading", {
        name: "안녕하세요, 김모브라님!",
      }),
    ).toBeInTheDocument();
  });

  it("stores selected answers as the documented behavior profile", async () => {
    const requests: BehaviorProfileRequest[] = [];

    server.use(
      http.get("http://localhost:8080/auth/onboarding-context", () =>
        HttpResponse.json({ pendingSchoolHours: true }),
      ),
      http.get("http://localhost:8080/home/today", () =>
        HttpResponse.json(createHomeTodayFixture()),
      ),
      http.post("http://localhost:8080/behavior-profiles", async ({ request }) => {
        requests.push((await request.json()) as BehaviorProfileRequest);

        return new HttpResponse(null, { status: 200 });
      }),
    );
    authenticate();

    render(<App />);

    expect(
      await screen.findByText("지금은 학교 시간대라 알림은 조용히 둘게요."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    await userEvent.click(screen.getByRole("button", { name: /흔들리는 중/ }));
    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    await userEvent.click(screen.getByRole("button", { name: /같이 확인하기/ }));
    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    await userEvent.click(screen.getByRole("button", { name: /차분한 회고/ }));
    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    await userEvent.click(screen.getByRole("button", { name: /둘 다/ }));
    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    await userEvent.selectOptions(screen.getByLabelText("시작 시간"), ["10"]);
    await userEvent.selectOptions(screen.getByLabelText("종료 시간"), ["22"]);
    await userEvent.click(screen.getByRole("button", { name: /분명하게/ }));
    await userEvent.click(screen.getByRole("button", { name: "완료" }));

    expect(requests).toEqual([
      {
        coachingMode: "STRICT",
        examTrack: "BOTH",
        executionDifficulty: "HIGH",
        preferredFocusEndHour: 22,
        preferredFocusStartHour: 10,
        recoveryStyle: "NEEDS_REFLECTION",
        socialPreference: "HIGH",
      },
    ]);
    expect(
      await screen.findByRole("heading", {
        name: "안녕하세요, 김모브라님!",
      }),
    ).toBeInTheDocument();
  });

  it("loads existing profile in edit mode and PUTs updates back to /behavior-profiles/me", async () => {
    const existingProfile: BehaviorProfile = createBehaviorProfileFixture({
      coachingMode: "STRICT",
      examTrack: "BOTH",
      executionDifficulty: "HIGH",
      preferredFocusEndHour: 22,
      preferredFocusStartHour: 10,
      recoveryStyle: "NEEDS_REFLECTION",
      socialPreference: "HIGH",
    });
    const updates: BehaviorProfileRequest[] = [];

    server.use(
      http.get("http://localhost:8080/auth/onboarding-context", () =>
        HttpResponse.json({ pendingSchoolHours: false }),
      ),
      http.get("http://localhost:8080/home/today", () =>
        HttpResponse.json(createHomeTodayFixture()),
      ),
      http.get("http://localhost:8080/notification/preferences", () =>
        HttpResponse.json({
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
      ),
      http.get("http://localhost:8080/behavior-profiles/me", () =>
        HttpResponse.json(existingProfile),
      ),
      http.put(
        "http://localhost:8080/behavior-profiles/me",
        async ({ request }) => {
          updates.push((await request.json()) as BehaviorProfileRequest);
          return new HttpResponse(null, { status: 200 });
        },
      ),
    );
    authenticate("/onboarding?mode=edit");

    render(<App />);

    // Step 0 initial heading still shown
    expect(
      await screen.findByRole("heading", {
        name: "지금의 공부 루프를 가볍게 맞춰볼게요.",
      }),
    ).toBeInTheDocument();

    // skip button hidden in edit mode
    expect(
      screen.queryByRole("button", { name: "건너뛰기" }),
    ).not.toBeInTheDocument();

    // Walk to last step
    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    await userEvent.click(screen.getByRole("button", { name: "다음" }));

    // Final step shows preselected values from existing profile
    await waitFor(() =>
      expect(screen.getByLabelText("시작 시간")).toHaveValue("10"),
    );
    expect(screen.getByLabelText("종료 시간")).toHaveValue("22");

    await userEvent.click(screen.getByRole("button", { name: "완료" }));

    await waitFor(() =>
      expect(updates).toEqual([
        {
          coachingMode: "STRICT",
          examTrack: "BOTH",
          executionDifficulty: "HIGH",
          preferredFocusEndHour: 22,
          preferredFocusStartHour: 10,
          recoveryStyle: "NEEDS_REFLECTION",
          socialPreference: "HIGH",
        },
      ]),
    );

    // Navigates to /settings
    expect(
      await screen.findByRole("heading", { name: "설정" }),
    ).toBeInTheDocument();
  });
});
