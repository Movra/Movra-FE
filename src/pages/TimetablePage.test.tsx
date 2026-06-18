import { HttpResponse, http } from "msw";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../app/App";
import type {
  HomeToday,
  Timetable,
  TimetableSlot,
} from "../features/core-loop/types";
import { createHomeTodayFixture } from "../test/fixtures";
import { server } from "../test/server";

function authenticate(path = "/timetable") {
  window.localStorage.setItem("movra.accessToken", "access-token");
  window.localStorage.setItem("movra.refreshToken", "refresh-token");
  window.history.pushState({}, "", path);
}

function createSlotId(slots: TimetableSlot[]) {
  return `slot-${slots.length + 1}`;
}

function dispatchPointer(
  target: EventTarget,
  type: "pointerdown" | "pointermove" | "pointerup",
  clientY: number,
) {
  const event = new Event(type, { bubbles: true, cancelable: true });

  Object.defineProperty(event, "clientY", { value: clientY });
  act(() => {
    target.dispatchEvent(event);
  });
}

function setupTimetableHandlers(initialHome: HomeToday) {
  let home = initialHome;
  let timetable = initialHome.timetable as Timetable;
  let directSlotRequestCount = 0;
  let topPickSlotRequestCount = 0;
  let taskSlotRequestCount = 0;

  function syncTimetable(nextTimetable: Timetable) {
    timetable = nextTimetable;
    home = {
      ...home,
      timetable,
    };
  }

  function findTaskContent(taskId: string) {
    return (
      home.topPicks.find((topPick) => topPick.taskId === taskId)?.content ??
      home.todayDailyPlan?.tasks.find((task) => task.taskId === taskId)?.content ??
      "시간 블록"
    );
  }

  function updateTaskContent(taskId: string, content: string) {
    home = {
      ...home,
      todayDailyPlan: home.todayDailyPlan
        ? {
            ...home.todayDailyPlan,
            morningTasks: home.todayDailyPlan.morningTasks.map((task) =>
              task.taskId === taskId ? { ...task, content } : task,
            ),
            tasks: home.todayDailyPlan.tasks.map((task) =>
              task.taskId === taskId ? { ...task, content } : task,
            ),
          }
        : home.todayDailyPlan,
      topPicks: home.topPicks.map((topPick) =>
        topPick.taskId === taskId ? { ...topPick, content } : topPick,
      ),
    };
    syncTimetable({
      ...timetable,
      slots: timetable.slots.map((slot) =>
        slot.taskId === taskId ? { ...slot, content } : slot,
      ),
    });
  }

  function getTodayTopPicks() {
    const todayTasks = home.todayDailyPlan?.tasks ?? [];

    if (todayTasks.length === 0) {
      return home.topPicks;
    }

    const todayTaskIds = new Set(todayTasks.map((task) => task.taskId));

    return home.topPicks.filter((topPick) => todayTaskIds.has(topPick.taskId));
  }

  function getAssignedTopPickCount() {
    const todayTopPicks = getTodayTopPicks();

    return new Set(
      todayTopPicks
        .filter((topPick) =>
          timetable.slots.some(
            (slot) =>
              slot.taskId === topPick.taskId ||
              (slot.topPick && slot.content.trim() === topPick.content.trim()),
          ),
        )
        .map((topPick) => topPick.taskId),
    ).size;
  }

  server.use(
    http.get("http://localhost:8080/home/today", () => HttpResponse.json(home)),
    http.get("http://localhost:8080/daily-plans/today", () =>
      HttpResponse.json(home.todayDailyPlan),
    ),
    http.get("http://localhost:8080/behavior-profiles/me", () =>
      HttpResponse.json(home.behaviorProfile),
    ),
    http.get("http://localhost:8080/daily-plans/:dailyPlanId/top-picks", () =>
      HttpResponse.json(home.topPicks),
    ),
    http.get("http://localhost:8080/timetables", () =>
      HttpResponse.json(timetable),
    ),
    http.post(
      "http://localhost:8080/timetables/:timetableId/slots/tasks/:taskId/top-picks",
      async ({ params, request }) => {
        topPickSlotRequestCount += 1;
        const body = (await request.json()) as {
          endTime: string;
          startTime: string;
        };
        const taskId = String(params.taskId);
        const slot: TimetableSlot = {
          content: findTaskContent(taskId),
          endTime: body.endTime,
          slotId: createSlotId(timetable.slots),
          startTime: body.startTime,
          taskId,
          topPick: true,
        };
        syncTimetable({
          ...timetable,
          slots: [...timetable.slots, slot],
        });

        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.post(
      "http://localhost:8080/timetables/:timetableId/slots/tasks/:taskId",
      async ({ params, request }) => {
        taskSlotRequestCount += 1;
        const assignedTopPickCount = getAssignedTopPickCount();

        if (assignedTopPickCount < getTodayTopPicks().length) {
          return HttpResponse.json(
            { message: "모든 상위 선택 작업을 먼저 배정해야 합니다." },
            { status: 400 },
          );
        }

        const body = (await request.json()) as {
          endTime: string;
          startTime: string;
        };
        const taskId = String(params.taskId);
        const slot: TimetableSlot = {
          content: findTaskContent(taskId),
          endTime: body.endTime,
          slotId: createSlotId(timetable.slots),
          startTime: body.startTime,
          taskId,
          topPick: false,
        };
        syncTimetable({ ...timetable, slots: [...timetable.slots, slot] });

        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.post(
      "http://localhost:8080/timetables/:timetableId/slots/daily-plans/:dailyPlanId/direct",
      async ({ request }) => {
        directSlotRequestCount += 1;
        const body = (await request.json()) as {
          content: string;
          endTime: string;
          startTime: string;
        };
        const slot: TimetableSlot = {
          content: body.content,
          endTime: body.endTime,
          slotId: createSlotId(timetable.slots),
          startTime: body.startTime,
          taskId: null,
          topPick: false,
        };
        syncTimetable({ ...timetable, slots: [...timetable.slots, slot] });

        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.put(
      "http://localhost:8080/daily-plans/:dailyPlanId/mind-sweeps/:taskId",
      async ({ params, request }) => {
        const taskId = String(params.taskId);
        const body = (await request.json()) as { content: string };

        updateTaskContent(taskId, body.content);

        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.put(
      "http://localhost:8080/morning-tasks/:dailyPlanId/:taskId",
      async ({ params, request }) => {
        const taskId = String(params.taskId);
        const body = (await request.json()) as { content: string };

        updateTaskContent(taskId, body.content);

        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.patch(
      "http://localhost:8080/daily-plans/:dailyPlanId/mind-sweeps/:taskId/complete",
      ({ params }) => {
        const taskId = String(params.taskId);
        home = {
          ...home,
          todayDailyPlan: home.todayDailyPlan
            ? {
                ...home.todayDailyPlan,
                tasks: home.todayDailyPlan.tasks.map((task) =>
                  task.taskId === taskId ? { ...task, completed: true } : task,
                ),
              }
            : home.todayDailyPlan,
          topPicks: home.topPicks.map((topPick) =>
            topPick.taskId === taskId ? { ...topPick, completed: true } : topPick,
          ),
        };

        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.patch(
      "http://localhost:8080/daily-plans/:dailyPlanId/mind-sweeps/:taskId/uncomplete",
      ({ params }) => {
        const taskId = String(params.taskId);
        home = {
          ...home,
          todayDailyPlan: home.todayDailyPlan
            ? {
                ...home.todayDailyPlan,
                tasks: home.todayDailyPlan.tasks.map((task) =>
                  task.taskId === taskId ? { ...task, completed: false } : task,
                ),
              }
            : home.todayDailyPlan,
          topPicks: home.topPicks.map((topPick) =>
            topPick.taskId === taskId ? { ...topPick, completed: false } : topPick,
          ),
        };

        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.patch(
      "http://localhost:8080/timetables/:timetableId/slots/:slotId/reschedule",
      async ({ params, request }) => {
        const slotId = String(params.slotId);
        const body = (await request.json()) as {
          endTime: string;
          startTime: string;
        };
        syncTimetable({
          ...timetable,
          slots: timetable.slots.map((slot) =>
            slot.slotId === slotId
              ? { ...slot, endTime: body.endTime, startTime: body.startTime }
              : slot,
          ),
        });

        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.delete(
      "http://localhost:8080/timetables/:timetableId/slots/:slotId",
      ({ params }) => {
        const slotId = String(params.slotId);
        syncTimetable({
          ...timetable,
          slots: timetable.slots.filter((slot) => slot.slotId !== slotId),
        });

        return new HttpResponse(null, { status: 200 });
      },
    ),
  );

  return {
    getDirectSlotRequestCount: () => directSlotRequestCount,
    getTopPickSlotRequestCount: () => topPickSlotRequestCount,
    getTaskSlotRequestCount: () => taskSlotRequestCount,
  };
}

describe("TimetablePage", () => {
  it("lets users place planned tasks on the timeline and resize slots without overlap", async () => {
    const user = userEvent.setup();
    setupTimetableHandlers(
      createHomeTodayFixture({
        timetable: {
          dailyPlanId: "daily-plan-id",
          slots: [],
          timetableId: "timetable-id",
          topPickTotal: 1,
        },
        todayDailyPlan: {
          dailyPlanId: "daily-plan-id",
          morningTasks: [],
          planDate: "2026-04-24",
          tasks: [
            {
              completed: false,
              content: "수학 개념 정리",
              taskId: "task-1",
              taskType: "GENERAL",
              topPicked: false,
            },
            {
              completed: false,
              content: "영어 독해 복습",
              taskId: "task-2",
              taskType: "GENERAL",
              topPicked: false,
            },
          ],
        },
        topPicks: [
          {
            completed: false,
            content: "수학 개념 정리",
            estimatedMinutes: 90,
            memo: "미적분",
            taskId: "task-1",
          },
          {
            completed: false,
            content: "이전 계획 TopPick",
            estimatedMinutes: 45,
            memo: "다른 날짜",
            taskId: "old-task",
          },
        ],
      }),
    );
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "시간표" },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("작업을 원하는 시간대에 놓아 주세요."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "배치할 작업" }),
    ).toBeInTheDocument();
    const dock = screen.getByRole("complementary", { name: "배치할 작업" });
    const mathDrafts = within(dock).getAllByRole("button", {
      name: /수학 개념 정리/,
    });
    expect(mathDrafts).toHaveLength(1);
    expect(within(mathDrafts[0]).getByText("TopPick")).toBeInTheDocument();
    expect(screen.queryByText("이전 계획 TopPick")).not.toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.getByText("24:00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /수학 개념 정리/ }));
    fireEvent.click(screen.getByLabelText("시간표 배치 영역"), {
      clientY: 576,
    });

    expect(
      await screen.findByText("TopPick을 시간 블록에 배정했습니다."),
    ).toBeInTheDocument();
    await waitForElementToBeRemoved(
      () => screen.queryByText("TopPick을 시간 블록에 배정했습니다."),
      { timeout: 2500 },
    );
    expect(await screen.findByText("수학 개념 정리")).toBeInTheDocument();
    expect(await screen.findByText("09:00 - 10:30")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "메모 보기" }));
    expect(
      await screen.findByRole("dialog", { name: "수학 개념 정리" }),
    ).toBeInTheDocument();
    expect(screen.getByText("미적분")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "TopPick 메모 닫기" }));

    await user.click(screen.getByRole("button", { name: "시간 블록 추가" }));
    const firstDialog = screen.getByRole("dialog", { name: "시간 블록 만들기" });
    await user.click(within(firstDialog).getByRole("button", { name: "일반 할 일" }));
    expect(
      within(firstDialog).queryByText(
        "TopPick을 먼저 시간표에 배정하면 일반 할 일을 이어 붙일 수 있어요.",
      ),
    ).not.toBeInTheDocument();
    await user.click(
      within(firstDialog).getByRole("button", {
        name: "시간 블록 만들기 닫기",
      }),
    );

    await user.click(screen.getByRole("button", { name: /영어 독해 복습/ }));
    fireEvent.click(screen.getByLabelText("시간표 배치 영역"), {
      clientY: 592,
    });
    expect(
      await screen.findByText("이미 배치된 시간과 겹칩니다. 빈 시간대에 놓아 주세요."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("시간표 배치 영역"), {
      clientY: 704,
    });

    expect(
      await screen.findByText("할 일을 시간 블록에 배정했습니다."),
    ).toBeInTheDocument();
    expect(await screen.findByText("영어 독해 복습")).toBeInTheDocument();

    await user.click(screen.getByLabelText("영어 독해 복습 완료"));
    expect(
      await screen.findByText("시간표 할 일 완료 상태를 바꿨습니다."),
    ).toBeInTheDocument();
    await user.click(await screen.findByLabelText("영어 독해 복습 완료 취소"));
    expect(
      await screen.findByText("시간표 할 일 완료 상태를 바꿨습니다."),
    ).toBeInTheDocument();
    await user.click(await screen.findByLabelText("영어 독해 복습 재배정"));
    expect(
      await screen.findByText("시간 블록을 재배정 대기 상태로 돌렸습니다."),
    ).toBeInTheDocument();

    const resizeHandle = screen.getByLabelText("수학 개념 정리 종료 시간 조절");
    dispatchPointer(resizeHandle, "pointerdown", 672);
    dispatchPointer(window, "pointermove", 704);
    dispatchPointer(window, "pointerup", 704);

    expect(await screen.findByText("09:00 - 11:00")).toBeInTheDocument();
    expect(await screen.findByText("시간 블록을 수정했습니다.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "시간 블록 추가" }));
    const addDialog = screen.getByRole("dialog", { name: "시간 블록 만들기" });
    await user.click(within(addDialog).getByRole("button", { name: "직접 입력" }));
    fireEvent.change(within(addDialog).getByLabelText("블록 내용"), {
      target: { value: "정리 및 내일 준비" },
    });
    fireEvent.change(within(addDialog).getByLabelText("시작"), {
      target: { value: "21:00" },
    });
    fireEvent.change(within(addDialog).getByLabelText("종료"), {
      target: { value: "21:30" },
    });
    await user.click(within(addDialog).getByRole("button", { name: "블록 저장" }));

    expect(await screen.findByText("직접 시간 블록을 추가했습니다.")).toBeInTheDocument();
    expect(await screen.findByText("정리 및 내일 준비")).toBeInTheDocument();

    await user.click(screen.getByLabelText("정리 및 내일 준비 삭제"));
    expect(await screen.findByText("시간 블록을 삭제했습니다.")).toBeInTheDocument();
    expect(screen.queryByText("정리 및 내일 준비")).not.toBeInTheDocument();
  });

  it("keeps regular tasks draggable but blocks placement until visible TopPicks are assigned", async () => {
    const user = userEvent.setup();

    setupTimetableHandlers(
      createHomeTodayFixture({
        timetable: {
          dailyPlanId: "daily-plan-id",
          slots: [
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
          topPickTotal: 2,
        },
        todayDailyPlan: {
          dailyPlanId: "daily-plan-id",
          morningTasks: [],
          planDate: "2026-04-24",
          tasks: [
            {
              completed: false,
              content: "수학 개념 정리",
              taskId: "task-1",
              taskType: "GENERAL",
              topPicked: false,
            },
            {
              completed: false,
              content: "영어 독해 복습",
              taskId: "task-2",
              taskType: "GENERAL",
              topPicked: false,
            },
            {
              completed: false,
              content: "과학 문제 풀이",
              taskId: "task-3",
              taskType: "GENERAL",
              topPicked: false,
            },
          ],
        },
        topPicks: [
          {
            completed: false,
            content: "수학 개념 정리",
            estimatedMinutes: 90,
            memo: "미적분",
            taskId: "task-1",
          },
          {
            completed: false,
            content: "영어 독해 복습",
            estimatedMinutes: 60,
            memo: "지문",
            taskId: "task-2",
          },
        ],
      }),
    );
    authenticate();

    render(<App />);

    expect(await screen.findByText("영어 독해 복습")).toBeInTheDocument();
    const regularTaskButton = screen.getByRole("button", {
      name: /과학 문제 풀이/,
    });

    expect(regularTaskButton).not.toBeDisabled();

    await user.click(regularTaskButton);
    fireEvent.click(screen.getByLabelText("시간표 배치 영역"), {
      clientY: 704,
    });

    expect(
      await screen.findByText(
        "시간표에 배정되지 않은 TopPick이 있습니다. TopPick을 모두 배정한 뒤 일반 할 일을 넣어 주세요.",
      ),
    ).toBeInTheDocument();
  });

  it("refreshes stale TopPick totals before posting a regular task", async () => {
    const user = userEvent.setup();
    const staleTimetable: Timetable = {
      dailyPlanId: "daily-plan-id",
      slots: [
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
      topPickTotal: 2,
    };
    const freshTimetable: Timetable = {
      ...staleTimetable,
      topPickTotal: 1,
    };
    let currentTimetable = staleTimetable;
    let timetableRequestCount = 0;
    let taskSlotRequestCount = 0;
    const home = createHomeTodayFixture({
      timetable: staleTimetable,
      todayDailyPlan: {
        dailyPlanId: "daily-plan-id",
        morningTasks: [],
        planDate: "2026-04-24",
        tasks: [
          {
            completed: false,
            content: "수학 개념 정리",
            taskId: "task-1",
            taskType: "GENERAL",
            topPicked: false,
          },
          {
            completed: false,
            content: "과학 문제 풀이",
            taskId: "task-3",
            taskType: "GENERAL",
            topPicked: false,
          },
        ],
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
    });

    server.use(
      http.get("http://localhost:8080/home/today", () =>
        HttpResponse.json({ ...home, timetable: currentTimetable }),
      ),
      http.get("http://localhost:8080/daily-plans/today", () =>
        HttpResponse.json(home.todayDailyPlan),
      ),
      http.get("http://localhost:8080/behavior-profiles/me", () =>
        HttpResponse.json(home.behaviorProfile),
      ),
      http.get("http://localhost:8080/daily-plans/:dailyPlanId/top-picks", () =>
        HttpResponse.json(home.topPicks),
      ),
      http.get("http://localhost:8080/timetables", () => {
        timetableRequestCount += 1;
        currentTimetable =
          timetableRequestCount === 1 ? staleTimetable : freshTimetable;

        return HttpResponse.json(currentTimetable);
      }),
      http.post(
        "http://localhost:8080/timetables/:timetableId/slots/tasks/:taskId",
        async ({ params, request }) => {
          taskSlotRequestCount += 1;
          const assignedTopPickCount = new Set(
            currentTimetable.slots
              .filter((slot) => slot.topPick)
              .map((slot) => slot.taskId)
              .filter(Boolean),
          ).size;

          if (assignedTopPickCount < currentTimetable.topPickTotal) {
            return HttpResponse.json(
              { message: "모든 상위 선택 작업을 먼저 배정해야 합니다." },
              { status: 400 },
            );
          }

          const body = (await request.json()) as {
            endTime: string;
            startTime: string;
          };
          const taskId = String(params.taskId);
          currentTimetable = {
            ...currentTimetable,
            slots: [
              ...currentTimetable.slots,
              {
                content: "과학 문제 풀이",
                endTime: body.endTime,
                slotId: "slot-2",
                startTime: body.startTime,
                taskId,
                topPick: false,
              },
            ],
          };

          return new HttpResponse(null, { status: 200 });
        },
      ),
    );
    authenticate();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /과학 문제 풀이/ }));
    fireEvent.click(screen.getByLabelText("시간표 배치 영역"), {
      clientY: 704,
    });

    expect(
      await screen.findByText("할 일을 시간 블록에 배정했습니다."),
    ).toBeInTheDocument();
    expect(taskSlotRequestCount).toBe(1);
    expect(timetableRequestCount).toBeGreaterThan(1);
  });

  it("places a regular MindSweep task through the task slot API when no TopPicks exist", async () => {
    const user = userEvent.setup();
    const handlers = setupTimetableHandlers(
      createHomeTodayFixture({
        timetable: {
          dailyPlanId: "daily-plan-id",
          slots: [],
          timetableId: "timetable-id",
          topPickTotal: 0,
        },
        todayDailyPlan: {
          dailyPlanId: "daily-plan-id",
          morningTasks: [],
          planDate: "2026-05-06",
          tasks: [
            {
              completed: false,
              content: "Interview prep",
              taskId: "task-regular",
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

    await user.click(await screen.findByRole("button", { name: /Interview prep/ }));
    fireEvent.click(screen.getByLabelText(/\uc2dc\uac04\ud45c \ubc30\uce58 \uc601\uc5ed/), {
      clientY: 704,
    });

    await waitFor(() => expect(handlers.getTaskSlotRequestCount()).toBe(1));
    expect(handlers.getDirectSlotRequestCount()).toBe(0);
    expect(handlers.getTopPickSlotRequestCount()).toBe(0);
    expect(
      await screen.findByRole("article", { name: /Interview prep/ }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        within(
          screen.getByRole("complementary", {
            name: /\ubc30\uce58\ud560 \uc791\uc5c5/,
          }),
        ).queryByRole("button", { name: /Interview prep/ }),
      ).not.toBeInTheDocument();
    });
  });

  it("places a regular task when no TopPicks exist even if the timetable total is stale", async () => {
    const user = userEvent.setup();
    const handlers = setupTimetableHandlers(
      createHomeTodayFixture({
        timetable: {
          dailyPlanId: "daily-plan-id",
          slots: [],
          timetableId: "timetable-id",
          topPickTotal: 2,
        },
        todayDailyPlan: {
          dailyPlanId: "daily-plan-id",
          morningTasks: [],
          planDate: "2026-05-06",
          tasks: [
            {
              completed: false,
              content: "Regular only task",
              taskId: "task-regular",
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

    await user.click(
      await screen.findByRole("button", { name: /Regular only task/ }),
    );
    fireEvent.click(screen.getByLabelText("시간표 배치 영역"), {
      clientY: 704,
    });

    expect(
      await screen.findByText("할 일을 시간 블록에 배정했습니다."),
    ).toBeInTheDocument();
    expect(handlers.getTaskSlotRequestCount()).toBe(1);
    expect(handlers.getTopPickSlotRequestCount()).toBe(0);
  });

  it("ignores stale topPicked flags when the TopPick endpoint is empty", async () => {
    const user = userEvent.setup();
    const handlers = setupTimetableHandlers(
      createHomeTodayFixture({
        timetable: {
          dailyPlanId: "daily-plan-id",
          slots: [],
          timetableId: "timetable-id",
          topPickTotal: 0,
        },
        todayDailyPlan: {
          dailyPlanId: "daily-plan-id",
          morningTasks: [],
          planDate: "2026-05-06",
          tasks: [
            {
              completed: false,
              content: "Stale flagged task",
              taskId: "task-stale",
              taskType: "GENERAL",
              topPickDetail: { estimatedMinutes: 30, memo: "" },
              topPicked: true,
            },
            {
              completed: false,
              content: "Plain regular task",
              taskId: "task-regular",
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

    await user.click(
      await screen.findByRole("button", { name: /Plain regular task/ }),
    );
    fireEvent.click(screen.getByLabelText("시간표 배치 영역"), {
      clientY: 704,
    });

    expect(
      await screen.findByText("할 일을 시간 블록에 배정했습니다."),
    ).toBeInTheDocument();
    expect(handlers.getTaskSlotRequestCount()).toBe(1);
    expect(handlers.getTopPickSlotRequestCount()).toBe(0);
  });

  it("treats a TopPick as assigned when its slot is missing the topPick flag", async () => {
    const user = userEvent.setup();
    const handlers = setupTimetableHandlers(
      createHomeTodayFixture({
        timetable: {
          dailyPlanId: "daily-plan-id",
          slots: [
            {
              content: "TopPick task",
              endTime: "10:00:00",
              slotId: "slot-top",
              startTime: "09:00:00",
              taskId: "task-top",
              topPick: false,
            },
          ],
          timetableId: "timetable-id",
          topPickTotal: 1,
        },
        todayDailyPlan: {
          dailyPlanId: "daily-plan-id",
          morningTasks: [],
          planDate: "2026-05-06",
          tasks: [
            {
              completed: false,
              content: "TopPick task",
              taskId: "task-top",
              taskType: "GENERAL",
              topPicked: true,
              topPickDetail: { estimatedMinutes: 60, memo: "" },
            },
            {
              completed: false,
              content: "Regular task",
              taskId: "task-regular",
              taskType: "GENERAL",
              topPicked: false,
            },
          ],
        },
        topPicks: [
          {
            completed: false,
            content: "TopPick task",
            estimatedMinutes: 60,
            memo: "",
            taskId: "task-top",
          },
        ],
      }),
    );
    authenticate();

    render(<App />);

    await user.click(
      await screen.findByRole("button", { name: /Regular task/ }),
    );
    fireEvent.click(screen.getByLabelText("시간표 배치 영역"), {
      clientY: 704,
    });

    expect(
      await screen.findByText("할 일을 시간 블록에 배정했습니다."),
    ).toBeInTheDocument();
    expect(handlers.getTaskSlotRequestCount()).toBe(1);
  });

  it("treats a TopPick as assigned when its slot is missing taskId but has matching content", async () => {
    const user = userEvent.setup();
    const handlers = setupTimetableHandlers(
      createHomeTodayFixture({
        timetable: {
          dailyPlanId: "daily-plan-id",
          slots: [
            {
              content: "TopPick task",
              endTime: "10:00:00",
              slotId: "slot-top",
              startTime: "09:00:00",
              taskId: null,
              topPick: true,
            },
          ],
          timetableId: "timetable-id",
          topPickTotal: 1,
        },
        todayDailyPlan: {
          dailyPlanId: "daily-plan-id",
          morningTasks: [],
          planDate: "2026-05-06",
          tasks: [
            {
              completed: false,
              content: "TopPick task",
              taskId: "task-top",
              taskType: "GENERAL",
              topPicked: true,
              topPickDetail: { estimatedMinutes: 60, memo: "" },
            },
            {
              completed: false,
              content: "Regular task",
              taskId: "task-regular",
              taskType: "GENERAL",
              topPicked: false,
            },
          ],
        },
        topPicks: [
          {
            completed: false,
            content: "TopPick task",
            estimatedMinutes: 60,
            memo: "",
            taskId: "task-top",
          },
        ],
      }),
    );
    authenticate();

    render(<App />);

    await user.click(
      await screen.findByRole("button", { name: /Regular task/ }),
    );
    fireEvent.click(screen.getByLabelText("시간표 배치 영역"), {
      clientY: 704,
    });

    expect(
      await screen.findByText("할 일을 시간 블록에 배정했습니다."),
    ).toBeInTheDocument();
    expect(handlers.getTaskSlotRequestCount()).toBe(1);
  });

  it("lets users move an already placed regular task while TopPicks remain unassigned", async () => {
    setupTimetableHandlers(
      createHomeTodayFixture({
        timetable: {
          dailyPlanId: "daily-plan-id",
          slots: [
            {
              content: "Already placed",
              endTime: "09:00:00",
              slotId: "slot-regular",
              startTime: "08:00:00",
              taskId: "task-regular",
              topPick: false,
            },
          ],
          timetableId: "timetable-id",
          topPickTotal: 1,
        },
        todayDailyPlan: {
          dailyPlanId: "daily-plan-id",
          morningTasks: [],
          planDate: "2026-05-06",
          tasks: [
            {
              completed: false,
              content: "Priority task",
              taskId: "task-top",
              taskType: "GENERAL",
              topPicked: false,
            },
            {
              completed: false,
              content: "Already placed",
              taskId: "task-regular",
              taskType: "GENERAL",
              topPicked: false,
            },
          ],
        },
        topPicks: [
          {
            completed: false,
            content: "Priority task",
            estimatedMinutes: 60,
            memo: "",
            taskId: "task-top",
          },
        ],
      }),
    );
    authenticate();

    render(<App />);

    const slot = await screen.findByRole("article", {
      name: /Already placed 08:00 - 09:00/,
    });

    dispatchPointer(slot, "pointerdown", 512);
    dispatchPointer(window, "pointermove", 576);
    dispatchPointer(window, "pointerup", 576);

    expect(
      await screen.findByRole("article", {
        name: /Already placed 09:00 - 10:00/,
      }),
    ).toBeInTheDocument();
  });

  it("keeps a regular task regular after TopPicks are assigned", async () => {
    const user = userEvent.setup();

    const handlers = setupTimetableHandlers(
      createHomeTodayFixture({
        timetable: {
          dailyPlanId: "daily-plan-id",
          slots: [
            {
              content: "JVM Heap Area에 대해서 공부하기",
              endTime: "01:30:00",
              slotId: "slot-1",
              startTime: "00:15:00",
              taskId: "task-1",
              topPick: true,
            },
          ],
          timetableId: "timetable-id",
          topPickTotal: 1,
        },
        todayDailyPlan: {
          dailyPlanId: "daily-plan-id",
          morningTasks: [],
          planDate: "2026-05-06",
          tasks: [
            {
              completed: false,
              content: "JVM Heap Area에 대해서 공부하기",
              taskId: "task-1",
              taskType: "GENERAL",
              topPicked: false,
            },
            {
              completed: false,
              content: "면접 준비하기",
              taskId: "task-2",
              taskType: "GENERAL",
              topPicked: false,
            },
          ],
        },
        topPicks: [
          {
            completed: false,
            content: "JVM Heap Area에 대해서 공부하기",
            estimatedMinutes: 75,
            memo: "",
            taskId: "task-1",
          },
        ],
      }),
    );
    authenticate();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /면접 준비하기/ }));
    fireEvent.click(screen.getByLabelText("시간표 배치 영역"), {
      clientY: 704,
    });

    expect(
      await screen.findByText("할 일을 시간 블록에 배정했습니다."),
    ).toBeInTheDocument();
    expect(handlers.getTaskSlotRequestCount()).toBe(1);
    expect(handlers.getDirectSlotRequestCount()).toBe(0);
    expect(handlers.getTopPickSlotRequestCount()).toBe(0);
  });

  it("uses the daily plan TopPick endpoint when Home Today has a stale TopPick summary", async () => {
    const user = userEvent.setup();

    setupTimetableHandlers(
      createHomeTodayFixture({
        timetable: {
          dailyPlanId: "daily-plan-id",
          slots: [
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
          topPickTotal: 2,
        },
        todayDailyPlan: {
          dailyPlanId: "daily-plan-id",
          morningTasks: [],
          planDate: "2026-04-24",
          tasks: [
            {
              completed: false,
              content: "수학 개념 정리",
              taskId: "task-1",
              taskType: "GENERAL",
              topPicked: false,
            },
            {
              completed: false,
              content: "영어 독해 복습",
              taskId: "task-2",
              taskType: "GENERAL",
              topPicked: false,
            },
            {
              completed: false,
              content: "과학 문제 풀이",
              taskId: "task-3",
              taskType: "GENERAL",
              topPicked: false,
            },
          ],
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
    server.use(
      http.get("http://localhost:8080/daily-plans/:dailyPlanId/top-picks", () =>
        HttpResponse.json([
          {
            completed: false,
            content: "수학 개념 정리",
            estimatedMinutes: 90,
            memo: "미적분",
            taskId: "task-1",
          },
          {
            completed: false,
            content: "영어 독해 복습",
            estimatedMinutes: 60,
            memo: "지문",
            taskId: "task-2",
          },
        ]),
      ),
    );
    authenticate();

    render(<App />);

    const dock = await screen.findByRole("complementary", {
      name: "배치할 작업",
    });
    const englishDrafts = within(dock).getAllByRole("button", {
      name: /영어 독해 복습/,
    });

    expect(englishDrafts).toHaveLength(1);
    expect(within(englishDrafts[0]).getByText("TopPick")).toBeInTheDocument();

    await user.click(englishDrafts[0]);
    fireEvent.click(screen.getByLabelText("시간표 배치 영역"), {
      clientY: 704,
    });
    expect(
      await screen.findByText("TopPick을 시간 블록에 배정했습니다."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /과학 문제 풀이/ }));
    fireEvent.click(screen.getByLabelText("시간표 배치 영역"), {
      clientY: 832,
    });

    expect(
      await screen.findByText("할 일을 시간 블록에 배정했습니다."),
    ).toBeInTheDocument();
  });

  it("lets users edit incomplete task content from timetable cards", async () => {
    const user = userEvent.setup();

    setupTimetableHandlers(
      createHomeTodayFixture({
        timetable: {
          dailyPlanId: "daily-plan-id",
          slots: [
            {
              content: "Edit me",
              endTime: "09:30:00",
              slotId: "slot-1",
              startTime: "09:00:00",
              taskId: "task-1",
              topPick: false,
            },
          ],
          timetableId: "timetable-id",
          topPickTotal: 0,
        },
        todayDailyPlan: {
          dailyPlanId: "daily-plan-id",
          morningTasks: [],
          planDate: "2026-04-24",
          tasks: [
            {
              completed: false,
              content: "Edit me",
              taskId: "task-1",
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

    await user.click(await screen.findByLabelText("Edit me 수정"));
    const editDialog = screen.getByRole("dialog", { name: "Task 수정" });

    fireEvent.change(within(editDialog).getByLabelText("내용"), {
      target: { value: "Edited task" },
    });
    await user.click(
      within(editDialog).getByRole("button", { name: "수정 저장" }),
    );

    expect(await screen.findByText("Task 내용을 수정했습니다.")).toBeInTheDocument();
    expect(await screen.findByText("Edited task")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Edited task 완료"));

    expect(
      await screen.findByText("시간표 할 일 완료 상태를 바꿨습니다."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Edited task 수정")).not.toBeInTheDocument();
  });

  it("uses compact one-line layout for visually short one-hour slots", async () => {
    setupTimetableHandlers(
      createHomeTodayFixture({
        timetable: {
          dailyPlanId: "daily-plan-id",
          slots: [
            {
              content: "Compact TopPick",
              endTime: "03:15:00",
              slotId: "slot-1",
              startTime: "02:15:00",
              taskId: "task-1",
              topPick: true,
            },
          ],
          timetableId: "timetable-id",
          topPickTotal: 1,
        },
        todayDailyPlan: {
          dailyPlanId: "daily-plan-id",
          morningTasks: [],
          planDate: "2026-04-24",
          tasks: [
            {
              completed: false,
              content: "Compact TopPick",
              taskId: "task-1",
              taskType: "GENERAL",
              topPicked: true,
            },
          ],
        },
        topPicks: [
          {
            completed: false,
            content: "Compact TopPick",
            estimatedMinutes: 60,
            memo: "Review the important notes",
            taskId: "task-1",
          },
        ],
      }),
    );
    authenticate();

    render(<App />);

    const slot = await screen.findByRole("article", {
      name: "Compact TopPick 02:15 - 03:15",
    });

    expect(slot.className).toContain("slotBlockCompact");
    expect(within(slot).getByText("TopPick")).toBeInTheDocument();
    expect(within(slot).getAllByText("02:15 - 03:15")).toHaveLength(2);
    expect(within(slot).queryByRole("button", { name: "메모 보기" })).toBeNull();

    const slotButtons = within(slot).getAllByRole("button");
    const resizeEndHandle = slotButtons[slotButtons.length - 1];

    dispatchPointer(resizeEndHandle, "pointerdown", 200);
    dispatchPointer(window, "pointermove", 248);
    dispatchPointer(window, "pointerup", 248);

    const resizedSlot = await screen.findByRole("article", {
      name: "Compact TopPick 02:15 - 04:00",
    });

    expect(resizedSlot.className).not.toContain("slotBlockCompact");
    expect(within(resizedSlot).getAllByText("02:15 - 04:00")).toHaveLength(1);
  });

  it("shows a backend contract message when DailyPlan exists but timetable is missing", async () => {
    const home = createHomeTodayFixture({
      timetable: null,
      todayDailyPlan: {
        dailyPlanId: "daily-plan-id",
        morningTasks: [],
        planDate: "2026-04-24",
        tasks: [],
      },
    });

    server.use(
      http.get("http://localhost:8080/home/today", () => HttpResponse.json(home)),
      http.get("http://localhost:8080/daily-plans/today", () =>
        HttpResponse.json(home.todayDailyPlan),
      ),
      http.get("http://localhost:8080/behavior-profiles/me", () =>
        HttpResponse.json(home.behaviorProfile),
      ),
      http.get("http://localhost:8080/daily-plans/:dailyPlanId/top-picks", () =>
        HttpResponse.json(home.topPicks),
      ),
      http.get("http://localhost:8080/timetables", () =>
        HttpResponse.json({ message: "Timetable not found" }, { status: 404 }),
      ),
    );
    authenticate();

    render(<App />);

    expect(
      await screen.findByText(
        "오늘 DailyPlan은 있지만 시간표가 아직 준비되지 않았습니다.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "DailyPlan 생성 시 Timetable이 함께 생성되는 백엔드 계약을 확인해야 합니다.",
      ),
    ).toBeInTheDocument();
  });
});
