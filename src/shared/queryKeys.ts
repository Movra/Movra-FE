export const queryKeys = {
  dailyReflection: (targetDate: string) =>
    ["daily-reflection", targetDate] as const,
  examSchedules: () => ["exam-schedules"] as const,
  focusSessionsToday: () => ["focus-sessions", "today"] as const,
  homeToday: () => ["home-today"] as const,
  recoveryCard: () => ["focus-sessions", "recovery-card"] as const,
  timetable: (dailyPlanId: string) => ["timetable", dailyPlanId] as const,
  tinyWin: (tinyWinId: string) => ["tiny-wins", tinyWinId] as const,
  tinyWins: () => ["tiny-wins"] as const,
  topPicks: (dailyPlanId: string) => ["top-picks", dailyPlanId] as const,
};
