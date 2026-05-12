import { queryKeys } from "./queryKeys";

describe("queryKeys", () => {
  it("builds stable domain query keys", () => {
    expect(queryKeys.accountabilityFriends()).toEqual([
      "accountability-relations",
      "friends",
    ]);
    expect(queryKeys.accountabilityInviteCodeStatus()).toEqual([
      "accountability-relations",
      "invite-code",
      "status",
    ]);
    expect(queryKeys.accountabilityWatcherSummaries()).toEqual([
      "accountability-relations",
      "watcher",
    ]);
    expect(
      queryKeys.accountabilityWatcherSummary("focus-sessions", {
        date: "2026-04-24",
        mode: "date",
      }),
    ).toEqual([
      "accountability-relations",
      "watcher",
      "focus-sessions",
      { date: "2026-04-24", mode: "date" },
    ]);
    expect(
      queryKeys.accountabilityWatcherSummary("top-picks", {
        from: "2026-04-20",
        mode: "range",
        to: "2026-04-24",
      }),
    ).toEqual([
      "accountability-relations",
      "watcher",
      "top-picks",
      { from: "2026-04-20", mode: "range", to: "2026-04-24" },
    ]);
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
    expect(queryKeys.nextExamSchedule()).toEqual(["exam-schedules", "next"]);
    expect(queryKeys.seasonMode()).toEqual(["exam-schedules", "season-mode"]);
    expect(queryKeys.examSchedule("exam-1")).toEqual([
      "exam-schedules",
      "exam-1",
    ]);
    expect(queryKeys.notificationPreference()).toEqual([
      "notification",
      "preferences",
    ]);
    expect(queryKeys.behaviorProfileMe()).toEqual(["behavior-profile", "me"]);
    expect(queryKeys.studyRooms()).toEqual(["study-rooms"]);
    expect(queryKeys.studyRoom("room-1")).toEqual(["study-rooms", "room-1"]);
    expect(queryKeys.studyRoomParticipants("room-1")).toEqual([
      "study-rooms",
      "room-1",
      "participants",
    ]);
    expect(queryKeys.studyRoomMyParticipations()).toEqual([
      "study-rooms",
      "my-participations",
    ]);
  });
});
