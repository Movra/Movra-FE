import { HttpResponse, http } from "msw";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../../app/App";
import { createHomeTodayFixture } from "../../test/fixtures";
import { server } from "../../test/server";
import type { HomeToday } from "./types";

function authenticate(path = "/") {
  window.localStorage.setItem("movra.accessToken", "access-token");
  window.localStorage.setItem("movra.refreshToken", "refresh-token");
  window.history.pushState({}, "", path);
}

function setupHomeHandler(initialHome: HomeToday) {
  let home = initialHome;

  server.use(
    http.get("http://localhost:8080/home/today", () => HttpResponse.json(home)),
    http.post("http://localhost:8080/focus-sessions/start", () => {
      const activeFocusSession = {
        elapsedSeconds: 0,
        endedAt: null,
        focusSessionId: "focus-session-id",
        inProgress: true,
        presetCompletionRate: null,
        presetMinutes: 5,
        presetSeconds: 300,
        recordedElapsedSeconds: null,
        startedAt: "2026-04-24T01:00:00Z",
      } as const;

      home = {
        ...home,
        activeFocusSession,
        focusSessions: {
          ...home.focusSessions,
          focusing: true,
          sessions: [activeFocusSession],
        },
      };

      return HttpResponse.json(activeFocusSession);
    }),
    http.patch("http://localhost:8080/focus-sessions/stop", () => {
      const completedFocusSession = {
        elapsedSeconds: 300,
        endedAt: "2026-04-24T01:05:00Z",
        focusSessionId: "focus-session-id",
        inProgress: false,
        presetCompletionRate: 1,
        presetMinutes: 5,
        presetSeconds: 300,
        recordedElapsedSeconds: 300,
        startedAt: "2026-04-24T01:00:00Z",
      } as const;

      home = {
        ...home,
        activeFocusSession: null,
        focusSessions: {
          ...home.focusSessions,
          focusing: false,
          sessions: [completedFocusSession],
          totalFocusSeconds: 300,
        },
      };

      return HttpResponse.json(completedFocusSession);
    }),
  );
}

describe("CoreLoopDashboard", () => {
  it("renders the home overview as a compact dashboard", async () => {
    setupHomeHandler(
      createHomeTodayFixture({
        focusSessions: {
          focusing: false,
          queriedAt: "2026-04-24T03:00:00Z",
          sessions: [],
          targetDate: "2026-04-24",
          totalFocusSeconds: 5400,
        },
        nextExamSchedule: {
          daysUntil: 41,
          examDate: "2026-06-04",
          examScheduleId: "exam-1",
          examType: "MOPYUNG",
          seasonMode: "EXAM_MODE",
          subject: "수학",
          title: "6월 모의고사",
        },
        timetable: {
          dailyPlanId: "daily-plan-id",
          slots: [
            {
              content: "오후 복습",
              endTime: "14:00:00",
              slotId: "slot-2",
              startTime: "13:00:00",
              taskId: null,
              topPick: false,
            },
            {
              content: "수학 개념 정리",
              endTime: "10:30:00",
              slotId: "slot-1",
              startTime: "09:00:00",
              taskId: "task-1",
              topPick: true,
            },
          ],
          timetableId: "timetable-id",
          topPickTotal: 1,
        },
        topPicks: [
          {
            completed: false,
            content: "수학 개념 정리",
            estimatedMinutes: 90,
            memo: "미적분",
            taskId: "task-1",
          },
        ],
      }),
    );
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "안녕하세요, 김모브라님!",
      }),
    ).toBeInTheDocument();

    const topPickPanel = screen.getByRole("region", { name: "오늘의 TopPick" });
    expect(within(topPickPanel).getByText("수학 개념 정리")).toBeInTheDocument();
    expect(
      within(topPickPanel).getByText("오늘 반드시 지킬 핵심 행동"),
    ).toBeInTheDocument();
    expect(
      within(topPickPanel).getByRole("link", { name: "계획에서 변경하기" }),
    ).toHaveAttribute("href", "/planning");
    expect(within(topPickPanel).queryByText("TopPick 대기")).not.toBeInTheDocument();
    expect(
      within(topPickPanel).queryByText("최대 3개까지 선택할 수 있어요"),
    ).not.toBeInTheDocument();
    const timetablePanel = screen.getByRole("region", { name: "오늘의 시간표" });
    expect(
      within(timetablePanel)
        .getAllByText(/\d{2}:\d{2} - \d{2}:\d{2}/)
        .map((element) => element.textContent),
    ).toEqual(["09:00 - 10:30", "13:00 - 14:00"]);
    expect(screen.getByText("09:00 - 10:30")).toBeInTheDocument();
    expect(screen.getByText("1h 30m")).toBeInTheDocument();
    expect(screen.getByText("04.24")).toBeInTheDocument();
    expect(screen.getByText("금요일")).toBeInTheDocument();
    expect(screen.getByText("연결된 친구 없음")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "통계" })).toHaveAttribute(
      "href",
      "/statistics",
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: "집중, TopPick, 시간표 알림 켜짐",
      }),
    );
    expect(screen.getByText("오늘의 알림")).toBeInTheDocument();
    expect(
      screen.getByText("학교 시간 08:00-15:30 무음, 수면 시간 무음"),
    ).toBeInTheDocument();
  });

  it("starts and stops a focus session from the home CTA", async () => {
    setupHomeHandler(createHomeTodayFixture());
    authenticate();

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: "시작" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "집중 세션을 시작했습니다.",
    );

    await userEvent.click(await screen.findByRole("button", { name: "종료" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "집중 세션을 종료했습니다.",
    );
    expect(screen.getByText("5m")).toBeInTheDocument();
  });

  it("renders unimplemented placeholders for feature pages", async () => {
    setupHomeHandler(createHomeTodayFixture());
    authenticate("/statistics");

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "기능 미구현" }),
    ).toBeInTheDocument();
    expect(screen.getByText("통계")).toBeInTheDocument();
  });
});
