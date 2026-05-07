import {
  assignTaskSlot,
  assignTopPickSlot,
  createDirectSlot,
  deleteSlot,
  getTimetable,
  rescheduleSlot,
} from "./api";

describe("planning support timetable api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the documented Timetable endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
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
            topPickTotal: 1,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getTimetable({ dailyPlanId: "daily-plan-id", token: "access-token" }),
    ).resolves.toEqual({
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
      topPickTotal: 1,
    });
    await assignTopPickSlot({
      endTime: "10:30:00",
      startTime: "09:00:00",
      taskId: "task-1",
      timetableId: "timetable-id",
      token: "access-token",
    });
    await assignTaskSlot({
      endTime: "12:00:00",
      startTime: "11:00:00",
      taskId: "task-2",
      timetableId: "timetable-id",
      token: "access-token",
    });
    await createDirectSlot({
      content: "정리 및 내일 준비",
      dailyPlanId: "daily-plan-id",
      endTime: "21:30:00",
      startTime: "21:00:00",
      timetableId: "timetable-id",
      token: "access-token",
    });
    await rescheduleSlot({
      endTime: "10:45:00",
      slotId: "slot-1",
      startTime: "09:15:00",
      timetableId: "timetable-id",
      token: "access-token",
    });
    await deleteSlot({
      slotId: "slot-1",
      timetableId: "timetable-id",
      token: "access-token",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8080/timetables?dailyPlanId=daily-plan-id",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8080/timetables/timetable-id/slots/tasks/task-1/top-picks",
      expect.objectContaining({
        body: JSON.stringify({
          endTime: "10:30:00",
          startTime: "09:00:00",
        }),
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:8080/timetables/timetable-id/slots/tasks/task-2",
      expect.objectContaining({
        body: JSON.stringify({
          endTime: "12:00:00",
          startTime: "11:00:00",
        }),
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:8080/timetables/timetable-id/slots/daily-plans/daily-plan-id/direct",
      expect.objectContaining({
        body: JSON.stringify({
          content: "정리 및 내일 준비",
          endTime: "21:30:00",
          startTime: "21:00:00",
        }),
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "http://localhost:8080/timetables/timetable-id/slots/slot-1/reschedule",
      expect.objectContaining({
        body: JSON.stringify({
          endTime: "10:45:00",
          startTime: "09:15:00",
        }),
        method: "PATCH",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "http://localhost:8080/timetables/timetable-id/slots/slot-1",
      expect.objectContaining({ method: "DELETE" }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });
});
