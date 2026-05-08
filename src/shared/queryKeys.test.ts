import { queryKeys } from "./queryKeys";

describe("queryKeys", () => {
  it("builds stable domain query keys", () => {
    expect(queryKeys.homeToday()).toEqual(["home-today"]);
    expect(queryKeys.dailyReflection("2026-04-24")).toEqual([
      "daily-reflection",
      "2026-04-24",
    ]);
    expect(queryKeys.examSchedules()).toEqual(["exam-schedules"]);
    expect(queryKeys.focusSessionsToday()).toEqual(["focus-sessions", "today"]);
    expect(queryKeys.recoveryCard()).toEqual([
      "focus-sessions",
      "recovery-card",
    ]);
    expect(queryKeys.timetable("daily-plan")).toEqual(["timetable", "daily-plan"]);
    expect(queryKeys.topPicks("daily-plan")).toEqual(["top-picks", "daily-plan"]);
    expect(queryKeys.tinyWins()).toEqual(["tiny-wins"]);
    expect(queryKeys.tinyWin("tiny-win-id")).toEqual(["tiny-wins", "tiny-win-id"]);
  });
});
