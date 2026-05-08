import { queryKeys } from "./queryKeys";

describe("queryKeys", () => {
  it("builds stable domain query keys", () => {
    expect(queryKeys.homeToday()).toEqual(["home-today"]);
    expect(queryKeys.examSchedules()).toEqual(["exam-schedules"]);
    expect(queryKeys.timetable("daily-plan")).toEqual(["timetable", "daily-plan"]);
    expect(queryKeys.topPicks("daily-plan")).toEqual(["top-picks", "daily-plan"]);
  });
});
