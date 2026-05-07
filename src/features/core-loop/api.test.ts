import {
  completeMindSweep,
  completeMorningTask,
  createMindSweep,
  createMorningTask,
  deleteMindSweep,
  deleteMorningTask,
  getMindSweeps,
  getTopPicks,
  selectTopPick,
  uncompleteMindSweep,
  uncompleteMorningTask,
  unselectTopPick,
  updateMindSweep,
  updateMorningTask,
} from "./api";

describe("core loop planning api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the documented MindSweep endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              completed: false,
              content: "수학 문제집 풀기",
              taskId: "task-1",
            },
          ]),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getMindSweeps({ dailyPlanId: "daily-plan-id", token: "access-token" }),
    ).resolves.toEqual([
      {
        completed: false,
        content: "수학 문제집 풀기",
        taskId: "task-1",
      },
    ]);
    await createMindSweep({
      content: "영어 단어 외우기",
      dailyPlanId: "daily-plan-id",
      token: "access-token",
    });
    await updateMindSweep({
      content: "영어 단어 30개 외우기",
      dailyPlanId: "daily-plan-id",
      taskId: "task-1",
      token: "access-token",
    });
    await completeMindSweep({
      dailyPlanId: "daily-plan-id",
      taskId: "task-1",
      token: "access-token",
    });
    await uncompleteMindSweep({
      dailyPlanId: "daily-plan-id",
      taskId: "task-1",
      token: "access-token",
    });
    await deleteMindSweep({
      dailyPlanId: "daily-plan-id",
      taskId: "task-1",
      token: "access-token",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8080/daily-plans/daily-plan-id/mind-sweeps",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8080/daily-plans/daily-plan-id/mind-sweeps",
      expect.objectContaining({
        body: JSON.stringify({ content: "영어 단어 외우기" }),
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:8080/daily-plans/daily-plan-id/mind-sweeps/task-1",
      expect.objectContaining({
        body: JSON.stringify({ content: "영어 단어 30개 외우기" }),
        method: "PUT",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:8080/daily-plans/daily-plan-id/mind-sweeps/task-1/complete",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "http://localhost:8080/daily-plans/daily-plan-id/mind-sweeps/task-1/uncomplete",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "http://localhost:8080/daily-plans/daily-plan-id/mind-sweeps/task-1",
      expect.objectContaining({ method: "DELETE" }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });

  it("calls the documented TopPick endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              completed: false,
              content: "영어 독해 모의고사 풀기",
              estimatedMinutes: 80,
              memo: "3시 30분부터 시작",
              taskId: "task-2",
            },
          ]),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getTopPicks({ dailyPlanId: "daily-plan-id", token: "access-token" }),
    ).resolves.toEqual([
      {
        completed: false,
        content: "영어 독해 모의고사 풀기",
        estimatedMinutes: 80,
        memo: "3시 30분부터 시작",
        taskId: "task-2",
      },
    ]);
    await selectTopPick({
      dailyPlanId: "daily-plan-id",
      estimatedMinutes: 80,
      memo: "3시 30분부터 시작",
      taskId: "task-2",
      token: "access-token",
    });
    await unselectTopPick({
      dailyPlanId: "daily-plan-id",
      taskId: "task-2",
      token: "access-token",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8080/daily-plans/daily-plan-id/top-picks",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8080/daily-plans/daily-plan-id/top-picks/task-2",
      expect.objectContaining({
        body: JSON.stringify({
          estimatedMinutes: 80,
          memo: "3시 30분부터 시작",
        }),
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:8080/daily-plans/daily-plan-id/top-picks/task-2",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("calls the documented MorningTask endpoints", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await createMorningTask({
      content: "가방 챙기기",
      targetDate: "2026-04-24",
      token: "access-token",
    });
    await updateMorningTask({
      content: "가방과 필통 챙기기",
      dailyPlanId: "daily-plan-id",
      taskId: "morning-1",
      token: "access-token",
    });
    await completeMorningTask({
      dailyPlanId: "daily-plan-id",
      taskId: "morning-1",
      token: "access-token",
    });
    await uncompleteMorningTask({
      dailyPlanId: "daily-plan-id",
      taskId: "morning-1",
      token: "access-token",
    });
    await deleteMorningTask({
      dailyPlanId: "daily-plan-id",
      taskId: "morning-1",
      token: "access-token",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8080/morning-tasks?targetDate=2026-04-24",
      expect.objectContaining({
        body: JSON.stringify({ content: "가방 챙기기" }),
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8080/morning-tasks/daily-plan-id/morning-1",
      expect.objectContaining({
        body: JSON.stringify({ content: "가방과 필통 챙기기" }),
        method: "PUT",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:8080/morning-tasks/daily-plan-id/morning-1/complete",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:8080/morning-tasks/daily-plan-id/morning-1/uncomplete",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "http://localhost:8080/morning-tasks/daily-plan-id/morning-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
