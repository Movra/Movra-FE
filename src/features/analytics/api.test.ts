import {
  getAnalyticsEvents,
  recordAnalyticsEvent,
  recordAnalyticsEventSafely,
} from "./api";

describe("analytics api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records analytics events", async () => {
    const response = {
      analyticsEventId: "event-1",
      eventType: "ACCOUNTABILITY_INVITE_SENT",
      occurredAt: "2026-04-24T01:00:00Z",
      properties: {},
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(response), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      recordAnalyticsEvent({
        eventType: "FOCUS_SESSION_STARTED",
        properties: { preset_seconds: 300, source: "focus_page" },
        token: "access-token",
      }),
    ).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/analytics/events",
      expect.objectContaining({
        body: JSON.stringify({
          eventType: "FOCUS_SESSION_STARTED",
          properties: { preset_seconds: 300, source: "focus_page" },
        }),
        method: "POST",
      }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });

  it("gets analytics events with filters", async () => {
    const response = [
      {
        analyticsEventId: "event-1",
        eventType: "EXAM_REGISTERED",
        occurredAt: "2026-04-24T01:00:00Z",
        properties: { exam_type: "MOPYUNG" },
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(response), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getAnalyticsEvents({
        eventType: "EXAM_REGISTERED",
        from: "2026-04-01",
        to: "2026-04-30",
        token: "access-token",
      }),
    ).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/analytics/events?from=2026-04-01&to=2026-04-30&eventType=EXAM_REGISTERED",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("ignores analytics errors in the safe helper", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Invalid analytics event" }), {
        headers: { "content-type": "application/json" },
        status: 400,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      recordAnalyticsEventSafely({
        eventType: "ACCOUNTABILITY_FRIEND_JOINED",
        token: "access-token",
      }),
    ).resolves.toBeUndefined();
  });
});
