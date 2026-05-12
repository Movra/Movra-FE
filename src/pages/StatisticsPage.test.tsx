import { HttpResponse, http } from "msw";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { App } from "../app/App";
import type { HomeToday } from "../features/core-loop/types";
import type {
  FocusStatisticsSummary,
  FocusTimingRecommendation,
  TimeOfDayFocusStatistics,
} from "../features/statistics/api";
import { createHomeTodayFixture } from "../test/fixtures";
import { server } from "../test/server";

type SetupStatisticsHandlersOptions = {
  daily?: FocusStatisticsSummary;
  initialHome?: HomeToday;
  monthly?: FocusStatisticsSummary;
  recommendation?: FocusTimingRecommendation;
  timeOfDay?: TimeOfDayFocusStatistics;
  weekly?: FocusStatisticsSummary;
};

function authenticate(path = "/statistics") {
  window.localStorage.setItem("movra.accessToken", "access-token");
  window.localStorage.setItem("movra.refreshToken", "refresh-token");
  window.history.pushState({}, "", path);
}

function createSummaryFixture(
  override: Partial<FocusStatisticsSummary> = {},
): FocusStatisticsSummary {
  return {
    averageDailyFocusSeconds: 5400,
    coveredDayCount: 1,
    dataSource: "SUMMARY",
    dayCount: 1,
    periodEndDate: "2026-04-24",
    periodStartDate: "2026-04-24",
    queriedAt: "2026-04-24T03:00:00Z",
    status: "FINAL",
    targetDate: "2026-04-24",
    totalFocusSeconds: 5400,
    ...override,
  };
}

function createTimeOfDayFixture(
  override: Partial<TimeOfDayFocusStatistics> = {},
): TimeOfDayFocusStatistics {
  return {
    dataSource: "RAW",
    hourlyBuckets: [
      { focusSeconds: 1800, hourOfDay: 9 },
      { focusSeconds: 3600, hourOfDay: 16 },
    ],
    queriedAt: "2026-04-24T03:00:00Z",
    status: "PARTIAL",
    targetDate: "2026-04-24",
    totalFocusSeconds: 5400,
    ...override,
  };
}

function createRecommendationFixture(
  override: Partial<FocusTimingRecommendation> = {},
): FocusTimingRecommendation {
  return {
    basedOnData: true,
    queriedAt: "2026-04-24T01:00:00Z",
    reason: "최근 2주 평일 데이터 기준 집중 시간이 가장 길었던 시간대입니다.",
    recommendedHours: [
      { averageFocusSeconds: 1500, hourOfDay: 16 },
      { averageFocusSeconds: 1200, hourOfDay: 20 },
    ],
    targetDate: "2026-04-24",
    ...override,
  };
}

function setupStatisticsHandlers({
  daily = createSummaryFixture(),
  initialHome = createHomeTodayFixture(),
  monthly = createSummaryFixture({
    averageDailyFocusSeconds: 4200,
    coveredDayCount: 20,
    dayCount: 30,
    periodEndDate: "2026-04-30",
    periodStartDate: "2026-04-01",
    totalFocusSeconds: 84000,
  }),
  recommendation = createRecommendationFixture(),
  timeOfDay = createTimeOfDayFixture(),
  weekly = createSummaryFixture({
    averageDailyFocusSeconds: 4800,
    coveredDayCount: 5,
    dayCount: 7,
    periodEndDate: "2026-04-26",
    periodStartDate: "2026-04-20",
    totalFocusSeconds: 24000,
  }),
}: SetupStatisticsHandlersOptions = {}) {
  const requestedTargetDates: string[] = [];

  server.use(
    http.get("http://localhost:8080/home/today", () =>
      HttpResponse.json(initialHome),
    ),
    http.get("http://localhost:8080/focus-statistics/daily", ({ request }) => {
      const targetDate = new URL(request.url).searchParams.get("targetDate");
      requestedTargetDates.push(`daily:${targetDate ?? ""}`);
      return HttpResponse.json({
        ...daily,
        periodEndDate: targetDate ?? daily.periodEndDate,
        periodStartDate: targetDate ?? daily.periodStartDate,
        targetDate: targetDate ?? daily.targetDate,
      });
    }),
    http.get("http://localhost:8080/focus-statistics/weekly", ({ request }) => {
      const targetDate = new URL(request.url).searchParams.get("targetDate");
      requestedTargetDates.push(`weekly:${targetDate ?? ""}`);
      return HttpResponse.json({ ...weekly, targetDate: targetDate ?? weekly.targetDate });
    }),
    http.get("http://localhost:8080/focus-statistics/monthly", ({ request }) => {
      const targetDate = new URL(request.url).searchParams.get("targetDate");
      requestedTargetDates.push(`monthly:${targetDate ?? ""}`);
      return HttpResponse.json({
        ...monthly,
        targetDate: targetDate ?? monthly.targetDate,
      });
    }),
    http.get(
      "http://localhost:8080/focus-statistics/time-of-day",
      ({ request }) => {
        const targetDate = new URL(request.url).searchParams.get("targetDate");
        requestedTargetDates.push(`time-of-day:${targetDate ?? ""}`);
        return HttpResponse.json({
          ...timeOfDay,
          targetDate: targetDate ?? timeOfDay.targetDate,
        });
      },
    ),
    http.get(
      "http://localhost:8080/focus-statistics/timing-recommendation",
      () => HttpResponse.json(recommendation),
    ),
  );

  return {
    getRequestedTargetDates: () => requestedTargetDates,
  };
}

describe("StatisticsPage", () => {
  it("renders the statistics page instead of the placeholder", async () => {
    setupStatisticsHandlers();
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "통계" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "기능 미구현" })).toBeNull();
    expect(screen.getByText("일간")).toBeInTheDocument();
    expect(screen.getByText("주간")).toBeInTheDocument();
    expect(screen.getByText("월간")).toBeInTheDocument();
    expect(screen.getByText("시간대별 집중 분포")).toBeInTheDocument();
    const recommendationList = screen.getByRole("list", {
      name: "추천 시간대 목록",
    });
    expect(
      within(recommendationList).getByText("16:00 - 17:00"),
    ).toBeInTheDocument();
    expect(
      within(recommendationList).getByText("20:00 - 21:00"),
    ).toBeInTheDocument();
  });

  it("refetches date-based statistics when target date changes", async () => {
    const handlers = setupStatisticsHandlers();
    authenticate();

    render(<App />);

    const dateInput = await screen.findByLabelText("기준일");
    await waitFor(() => expect(dateInput).toHaveValue("2026-04-24"));

    fireEvent.change(dateInput, { target: { value: "2026-04-25" } });

    await waitFor(() =>
      expect(handlers.getRequestedTargetDates()).toEqual(
        expect.arrayContaining([
          "daily:2026-04-25",
          "weekly:2026-04-25",
          "monthly:2026-04-25",
          "time-of-day:2026-04-25",
        ]),
      ),
    );
  });

  it("shows empty and fallback states when statistics are missing", async () => {
    setupStatisticsHandlers({
      daily: createSummaryFixture({
        averageDailyFocusSeconds: 0,
        coveredDayCount: 0,
        dataSource: "NONE",
        totalFocusSeconds: 0,
      }),
      recommendation: createRecommendationFixture({
        basedOnData: false,
        reason: "데이터가 아직 없어요.",
        recommendedHours: [],
      }),
      timeOfDay: createTimeOfDayFixture({
        dataSource: "NONE",
        hourlyBuckets: [],
        totalFocusSeconds: 0,
      }),
    });
    authenticate();

    render(<App />);

    await waitFor(() =>
      expect(
        screen.getByText("아직 시간대별 집중 기록이 없어요."),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("프로필 기반")).toBeInTheDocument();
    expect(
      screen.getByText("아직 추천할 시간대가 충분하지 않아요."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("현재 행동 프로필의 선호 시간대는 09:00 - 21:00입니다."),
    ).toBeInTheDocument();
  });

  it("hides recommendation hours that conflict with school or sleep policy", async () => {
    setupStatisticsHandlers({
      recommendation: createRecommendationFixture({
        recommendedHours: [
          { averageFocusSeconds: 1200, hourOfDay: 9 },
          { averageFocusSeconds: 900, hourOfDay: 14 },
          { averageFocusSeconds: 1500, hourOfDay: 16 },
          { averageFocusSeconds: 1800, hourOfDay: 22 },
        ],
      }),
    });
    authenticate();

    render(<App />);

    const recommendationList = await screen.findByRole("list", {
      name: "추천 시간대 목록",
    });
    expect(
      within(recommendationList).getByText("16:00 - 17:00"),
    ).toBeInTheDocument();
    expect(
      within(recommendationList).queryByText("09:00 - 10:00"),
    ).toBeNull();
    expect(
      within(recommendationList).queryByText("14:00 - 15:00"),
    ).toBeNull();
    expect(
      within(recommendationList).queryByText("22:00 - 23:00"),
    ).toBeNull();
    expect(
      screen.getByText(
        "학교 시간 또는 22시 이후와 겹친 3개 추천은 표시하지 않았습니다.",
      ),
    ).toBeInTheDocument();
  });

  it("redirects to onboarding when behaviorProfile is null", async () => {
    setupStatisticsHandlers({
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
});
