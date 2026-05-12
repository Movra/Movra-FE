import type { HttpHandler } from "msw";
import { HttpResponse, http } from "msw";

export const handlers: HttpHandler[] = [
  http.post("http://localhost:8080/analytics/events", () =>
    HttpResponse.json({
      analyticsEventId: "analytics-event-id",
      eventType: "SIGNUP",
      occurredAt: "2026-04-24T01:00:00Z",
      properties: {},
    }),
  ),
  http.get("http://localhost:8080/analytics/events", () => HttpResponse.json([])),
  http.get("http://localhost:8080/exam-schedules", () => HttpResponse.json([])),
];
