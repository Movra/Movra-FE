export const queryKeys = {
  behaviorProfileMe: () => ["behavior-profile", "me"] as const,
  dailyReflection: (targetDate: string) =>
    ["daily-reflection", targetDate] as const,
  examSchedule: (examScheduleId: string) =>
    ["exam-schedules", examScheduleId] as const,
  examSchedules: () => ["exam-schedules"] as const,
  focusSessionsToday: () => ["focus-sessions", "today"] as const,
  homeToday: () => ["home-today"] as const,
  nextExamSchedule: () => ["exam-schedules", "next"] as const,
  notificationPreference: () => ["notification", "preferences"] as const,
  recoveryCard: () => ["focus-sessions", "recovery-card"] as const,
  seasonMode: () => ["exam-schedules", "season-mode"] as const,
  timetable: (dailyPlanId: string) => ["timetable", dailyPlanId] as const,
  tinyWin: (tinyWinId: string) => ["tiny-wins", tinyWinId] as const,
  tinyWins: () => ["tiny-wins"] as const,
  topPicks: (dailyPlanId: string) => ["top-picks", dailyPlanId] as const,
};
