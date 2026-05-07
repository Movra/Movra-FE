import { HttpResponse, delay, http } from "msw";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../app/App";
import { createHomeTodayFixture } from "../test/fixtures";
import { server } from "../test/server";
import type { DailyPlanTask, HomeToday, TopPick } from "../features/core-loop/types";

function authenticate(path = "/planning") {
  window.localStorage.setItem("movra.accessToken", "access-token");
  window.localStorage.setItem("movra.refreshToken", "refresh-token");
  window.history.pushState({}, "", path);
}

function updateDailyPlan(
  home: HomeToday,
  updater: (tasks: DailyPlanTask[], morningTasks: DailyPlanTask[]) => {
    morningTasks?: DailyPlanTask[];
    tasks?: DailyPlanTask[];
  },
) {
  const dailyPlan = home.todayDailyPlan;

  if (!dailyPlan) {
    return home;
  }

  const next = updater(dailyPlan.tasks, dailyPlan.morningTasks);

  return {
    ...home,
    morningTasks: next.morningTasks ?? home.morningTasks,
    todayDailyPlan: {
      ...dailyPlan,
      morningTasks: next.morningTasks ?? dailyPlan.morningTasks,
      tasks: next.tasks ?? dailyPlan.tasks,
    },
  };
}

function setupPlanningHandlers(initialHome: HomeToday) {
  let home = initialHome;
  let nextTaskIndex = 10;

  server.use(
    http.get("http://localhost:8080/home/today", () => HttpResponse.json(home)),
    http.post(
      "http://localhost:8080/daily-plans/:dailyPlanId/mind-sweeps",
      async ({ request }) => {
        const body = (await request.json()) as { content: string };
        const task: DailyPlanTask = {
          completed: false,
          content: body.content,
          taskId: `task-${nextTaskIndex}`,
          taskType: "GENERAL",
          topPicked: false,
        };
        nextTaskIndex += 1;
        home = updateDailyPlan(home, (tasks) => ({ tasks: [...tasks, task] }));

        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.patch(
      "http://localhost:8080/daily-plans/:dailyPlanId/mind-sweeps/:taskId/complete",
      ({ params }) => {
        const taskId = String(params.taskId);
        home = updateDailyPlan(home, (tasks) => ({
          tasks: tasks.map((task) =>
            task.taskId === taskId ? { ...task, completed: true } : task,
          ),
        }));

        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.post(
      "http://localhost:8080/daily-plans/:dailyPlanId/top-picks/:taskId",
      async ({ params, request }) => {
        const taskId = String(params.taskId);
        const body = (await request.json()) as {
          estimatedMinutes: number;
          memo: string;
        };
        const task = home.todayDailyPlan?.tasks.find(
          (candidate) => candidate.taskId === taskId,
        );

        if (!task) {
          return new HttpResponse(null, { status: 404 });
        }

        const topPick: TopPick = {
          completed: task.completed,
          content: task.content,
          estimatedMinutes: body.estimatedMinutes,
          memo: body.memo,
          taskId,
        };

        home = {
          ...updateDailyPlan(home, (tasks) => ({
            tasks: tasks.map((candidate) =>
              candidate.taskId === taskId
                ? {
                    ...candidate,
                    topPickDetail: {
                      estimatedMinutes: body.estimatedMinutes,
                      memo: body.memo,
                    },
                    topPicked: true,
                  }
                : candidate,
            ),
          })),
          topPicks: [
            ...home.topPicks.filter((candidate) => candidate.taskId !== taskId),
            topPick,
          ],
        };

        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.delete(
      "http://localhost:8080/daily-plans/:dailyPlanId/top-picks/:taskId",
      ({ params }) => {
        const taskId = String(params.taskId);
        home = {
          ...updateDailyPlan(home, (tasks) => ({
            tasks: tasks.map((candidate) =>
              candidate.taskId === taskId
                ? { ...candidate, topPickDetail: null, topPicked: false }
                : candidate,
            ),
          })),
          topPicks: home.topPicks.filter((candidate) => candidate.taskId !== taskId),
        };

        return new HttpResponse(null, { status: 200 });
      },
    ),
  );
}

describe("PlanningPage", () => {
  it("lets users add MindSweep tasks, complete tasks, and choose TopPick", async () => {
    const user = userEvent.setup();
    setupPlanningHandlers(
      createHomeTodayFixture({
        todayDailyPlan: {
          dailyPlanId: "daily-plan-id",
          morningTasks: [],
          planDate: "2026-04-24",
          tasks: [
            {
              completed: false,
              content: "수학 기출 문제 30문제 풀기",
              taskId: "task-1",
              taskType: "GENERAL",
              topPicked: false,
            },
            {
              completed: false,
              content: "영어 독해 모의고사 2회 풀기",
              taskId: "task-2",
              taskType: "GENERAL",
              topPicked: false,
            },
          ],
        },
        topPicks: [],
      }),
    );
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "MindSweep" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("수학 기출 문제 30문제 풀기").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("MindSweep 할 일 입력"), {
      target: { value: "한국사 개념 정리" },
    });
    await user.click(screen.getByRole("button", { name: "MindSweep 할 일 추가" }));
    expect((await screen.findAllByText("한국사 개념 정리")).length).toBeGreaterThan(0);
    expect(await screen.findByText("MindSweep에 할 일을 추가했습니다.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("MindSweep 할 일 입력"), {
      target: { value: "과학탐구 정리" },
    });
    await user.click(screen.getByRole("button", { name: "MindSweep 할 일 추가" }));
    expect((await screen.findAllByText("과학탐구 정리")).length).toBeGreaterThan(0);

    const taskRows = screen.getAllByRole("listitem");
    const addedFirstIndex = taskRows.findIndex((row) =>
      row.textContent?.includes("한국사 개념 정리"),
    );
    const addedSecondIndex = taskRows.findIndex((row) =>
      row.textContent?.includes("과학탐구 정리"),
    );

    expect(addedFirstIndex).toBeGreaterThanOrEqual(0);
    expect(addedSecondIndex).toBeGreaterThan(addedFirstIndex);

    await user.click(
      screen.getByRole("button", {
        name: "영어 독해 모의고사 2회 풀기 완료",
      }),
    );
    expect(await screen.findByText("MindSweep 완료 상태를 바꿨습니다.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "TopPick 선정하기" }));
    expect(
      await screen.findByRole("heading", {
        name: /오늘의 TopPick\s+하나\s*를 선택해 주세요/,
      }),
    ).toBeInTheDocument();

    const topPickPanel = screen.getByRole("region", {
      name: /오늘의 TopPick\s+하나\s*를 선택해 주세요/,
    });
    expect(
      screen.queryByRole("heading", { name: "내일 아침 첫 행동" }),
    ).not.toBeInTheDocument();

    await user.click(
      within(topPickPanel).getByRole("option", {
        name: /수학 기출 문제 30문제 풀기/,
      }),
    );
    await user.click(within(topPickPanel).getByLabelText("80분"));
    expect(within(topPickPanel).getByText("(필수)")).toBeInTheDocument();
    expect(
      within(topPickPanel).getByRole("button", {
        name: "이 항목을 오늘의 TopPick으로 선택하기",
      }),
    ).toBeDisabled();
    fireEvent.change(within(topPickPanel).getByLabelText(/메모/), {
      target: { value: "3시 30분부터 책상에서 집중하기" },
    });
    await user.click(
      within(topPickPanel).getByRole("button", {
        name: "이 항목을 오늘의 TopPick으로 선택하기",
      }),
    );
    expect(await screen.findByText("오늘의 TopPick을 선택했습니다.")).toBeInTheDocument();
    expect(
      within(topPickPanel).getByRole("button", {
        name: "이 항목의 TopPick 선택 해제하기",
      }),
    ).toBeInTheDocument();

    await user.click(
      within(topPickPanel).getByRole("button", {
        name: "이 항목의 TopPick 선택 해제하기",
      }),
    );
    expect(await screen.findByText("TopPick 선택을 해제했습니다.")).toBeInTheDocument();
  });

  it("shows a newly added MindSweep task before the create API resolves", async () => {
    const user = userEvent.setup();
    setupPlanningHandlers(
      createHomeTodayFixture({
        todayDailyPlan: {
          dailyPlanId: "daily-plan-id",
          morningTasks: [],
          planDate: "2026-04-24",
          tasks: [],
        },
        topPicks: [],
      }),
    );
    server.use(
      http.post(
        "http://localhost:8080/daily-plans/:dailyPlanId/mind-sweeps",
        async ({ request }) => {
          await request.json();
          await delay(300);

          return new HttpResponse(null, { status: 200 });
        },
      ),
    );
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "MindSweep" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("MindSweep 할 일 입력"), {
      target: { value: "즉시 표시되는 할 일" },
    });
    await user.click(screen.getByRole("button", { name: "MindSweep 할 일 추가" }));

    expect(screen.getByText("즉시 표시되는 할 일")).toBeInTheDocument();
    expect(await screen.findByText("MindSweep에 할 일을 추가했습니다.")).toBeInTheDocument();
  });
});
