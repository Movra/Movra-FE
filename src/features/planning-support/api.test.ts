import {
  assignTaskSlot,
  assignTopPickSlot,
  createExamSchedule,
  createDirectSlot,
  createFutureVision,
  deleteExamSchedule,
  deleteSlot,
  getExamSchedules,
  getFutureVision,
  getTimetable,
  rescheduleSlot,
  updateExamSchedule,
  updateWeeklyFutureVision,
  updateYearlyFutureVision,
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

  it("calls the documented Future Vision endpoints with FormData fields", async () => {
    const weeklyVisionImage = new File(["weekly"], "weekly.png", {
      type: "image/png",
    });
    const yearlyVisionImage = new File(["yearly"], "yearly.png", {
      type: "image/png",
    });
    const nextWeeklyVisionImage = new File(["next-weekly"], "next-weekly.png", {
      type: "image/png",
    });
    const nextYearlyVisionImage = new File(["next-yearly"], "next-yearly.png", {
      type: "image/png",
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            futureVisionId: "future-vision-id",
            weeklyVisionImageUrl: "https://example.com/weekly.png",
            yearlyVisionCreatedAt: "2026-04-24",
            yearlyVisionDescription: "원하는 미래",
            yearlyVisionImageUrl: "https://example.com/yearly.png",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getFutureVision({ token: "access-token" })).resolves.toEqual({
      futureVisionId: "future-vision-id",
      weeklyVisionImageUrl: "https://example.com/weekly.png",
      yearlyVisionCreatedAt: "2026-04-24",
      yearlyVisionDescription: "원하는 미래",
      yearlyVisionImageUrl: "https://example.com/yearly.png",
    });
    await createFutureVision({
      token: "access-token",
      values: {
        weeklyVisionImage,
        yearlyVisionDescription: "원하는 미래",
        yearlyVisionImage,
      },
    });
    await updateWeeklyFutureVision({
      token: "access-token",
      weeklyVisionImage: nextWeeklyVisionImage,
    });
    await updateYearlyFutureVision({
      token: "access-token",
      yearlyVisionDescription: "수정한 미래",
      yearlyVisionImage: nextYearlyVisionImage,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8080/future-vision",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8080/future-vision",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:8080/future-vision/weekly",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:8080/future-vision/yearly",
      expect.objectContaining({ method: "PATCH" }),
    );

    const createForm = fetchMock.mock.calls[1]?.[1].body as FormData;
    expect(createForm.get("weeklyVisionImageUrl")).toBe(weeklyVisionImage);
    expect(createForm.get("yearlyVisionImageUrl")).toBe(yearlyVisionImage);
    expect(createForm.get("yearlyVisionDescription")).toBe("원하는 미래");

    const weeklyForm = fetchMock.mock.calls[2]?.[1].body as FormData;
    expect(weeklyForm.get("weeklyVisionImageUrl")).toBe(nextWeeklyVisionImage);

    const yearlyForm = fetchMock.mock.calls[3]?.[1].body as FormData;
    expect(yearlyForm.get("yearlyVisionImageUrl")).toBe(nextYearlyVisionImage);
    expect(yearlyForm.get("yearlyVisionDescription")).toBe("수정한 미래");

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });

  it("calls the documented Exam Schedule endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              daysUntil: 21,
              examDate: "2026-06-04",
              examScheduleId: "exam-1",
              examType: "MOPYUNG",
              seasonMode: "MOPYUNG_FOCUSED",
              subject: "수학",
              title: "6월 모의평가",
            },
          ]),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            daysUntil: 21,
            examDate: "2026-06-04",
            examScheduleId: "exam-1",
            examType: "MOPYUNG",
            seasonMode: "MOPYUNG_FOCUSED",
            subject: "수학",
            title: "6월 모의평가",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            daysUntil: 20,
            examDate: "2026-06-05",
            examScheduleId: "exam-1",
            examType: "MOPYUNG",
            seasonMode: "MOPYUNG_FOCUSED",
            subject: "援?뼱",
            title: "6??紐⑥쓽?됯? ?섏젙",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getExamSchedules({ token: "access-token" })).resolves.toEqual([
      {
        daysUntil: 21,
        examDate: "2026-06-04",
        examScheduleId: "exam-1",
        examType: "MOPYUNG",
        seasonMode: "MOPYUNG_FOCUSED",
        subject: "수학",
        title: "6월 모의평가",
      },
    ]);
    await createExamSchedule({
      token: "access-token",
      values: {
        examDate: "2026-06-04",
        examType: "MOPYUNG",
        subject: "수학",
        title: "6월 모의평가",
      },
    });
    await updateExamSchedule({
      examScheduleId: "exam-1",
      token: "access-token",
      values: {
        examDate: "2026-06-05",
        examType: "MOPYUNG",
        subject: "국어",
        title: "6월 모의평가 수정",
      },
    });
    await deleteExamSchedule({
      examScheduleId: "exam-1",
      token: "access-token",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8080/exam-schedules",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8080/exam-schedules",
      expect.objectContaining({
        body: JSON.stringify({
          examDate: "2026-06-04",
          examType: "MOPYUNG",
          subject: "수학",
          title: "6월 모의평가",
        }),
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:8080/exam-schedules/exam-1",
      expect.objectContaining({
        body: JSON.stringify({
          examDate: "2026-06-05",
          examType: "MOPYUNG",
          subject: "국어",
          title: "6월 모의평가 수정",
        }),
        method: "PATCH",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:8080/exam-schedules/exam-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
