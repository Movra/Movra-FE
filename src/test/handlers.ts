import type { HttpHandler } from "msw";
import { HttpResponse, http } from "msw";

export const handlers: HttpHandler[] = [
  http.get("http://localhost:8080/exam-schedules", () => HttpResponse.json([])),
];
