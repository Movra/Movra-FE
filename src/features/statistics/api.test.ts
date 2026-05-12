import { ApiClientError } from "../../shared/api/client";
import {
  getDailyFocusStatistics,
  getFocusTimingRecommendation,
  getMonthlyFocusStatistics,
  getTimeOfDayFocusStatistics,
  getWeeklyFocusStatistics,
} from "./api";

describe("focus statistics api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the documented daily, weekly, and monthly summary endpoints", async () => {
    const summary = {
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
    };
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(summary), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getDailyFocusStatistics({
        targetDate: "2026-04-24",
        token: "access-token",
      }),
    ).resolves.toEqual(summary);
    await getWeeklyFocusStatistics({
      targetDate: "2026-04-24",
      token: "access-token",
    });
    await getMonthlyFocusStatistics({
      targetDate: "2026-04-24",
      token: "access-token",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8080/focus-statistics/daily?targetDate=2026-04-24",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8080/focus-statistics/weekly?targetDate=2026-04-24",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:8080/focus-statistics/monthly?targetDate=2026-04-24",
      expect.objectContaining({ method: "GET" }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });

  it("encodes targetDate for time-of-day statistics", async () => {
    const response = {
      dataSource: "RAW",
      hourlyBuckets: [
        { focusSeconds: 1800, hourOfDay: 9 },
        { focusSeconds: 1800, hourOfDay: 10 },
      ],
      queriedAt: "2026-04-24T03:00:00Z",
      status: "PARTIAL",
      targetDate: "2026-04-24",
      totalFocusSeconds: 3600,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getTimeOfDayFocusStatistics({
        targetDate: "2026-04-24+09:00",
        token: "access-token",
      }),
    ).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/focus-statistics/time-of-day?targetDate=2026-04-24%2B09%3A00",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("calls the documented timing recommendation endpoint", async () => {
    const recommendation = {
      basedOnData: true,
      queriedAt: "2026-04-24T01:00:00Z",
      reason: "최근 2주 평일 데이터 기준 집중 시간이 가장 길었던 시간대입니다.",
      recommendedHours: [
        { averageFocusSeconds: 1200, hourOfDay: 9 },
        { averageFocusSeconds: 900, hourOfDay: 14 },
      ],
      targetDate: "2026-04-24",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(recommendation), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getFocusTimingRecommendation({ token: "access-token" }),
    ).resolves.toEqual(recommendation);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/focus-statistics/timing-recommendation",
      expect.objectContaining({ method: "GET" }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });

  it("propagates a focus statistics 400 via ApiClientError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "잘못된 기준일입니다.",
          statusCode: 400,
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 400,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const promise = getDailyFocusStatistics({
      targetDate: "bad-date",
      token: "access-token",
    });

    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
    await expect(promise).rejects.toMatchObject({ status: 400 });
  });
});
