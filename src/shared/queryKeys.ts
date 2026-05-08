export const queryKeys = {
  examSchedules: () => ["exam-schedules"] as const,
  homeToday: () => ["home-today"] as const,
  timetable: (dailyPlanId: string) => ["timetable", dailyPlanId] as const,
  topPicks: (dailyPlanId: string) => ["top-picks", dailyPlanId] as const,
};
