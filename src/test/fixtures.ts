import type { HomeToday } from "../features/core-loop/types";
import type { BehaviorProfile } from "../features/onboarding/types";

export function createBehaviorProfileFixture(
  override: Partial<BehaviorProfile> = {},
): BehaviorProfile {
  return {
    behaviorProfileId: "behavior-profile-id",
    coachingMode: "GENTLE",
    examTrack: "NAESIN",
    executionDifficulty: "MEDIUM",
    preferredFocusEndHour: 21,
    preferredFocusStartHour: 9,
    recoveryStyle: "QUICK_RESTART",
    socialPreference: "LOW",
    ...override,
  };
}

export function createHomeTodayFixture(
  override: Partial<HomeToday> = {},
): HomeToday {
  return {
    activeFocusSession: null,
    behaviorProfile: createBehaviorProfileFixture(),
    focusSessions: {
      focusing: false,
      queriedAt: "2026-04-24T03:00:00Z",
      sessions: [],
      targetDate: "2026-04-24",
      totalFocusSeconds: 0,
    },
    futureVision: null,
    friendAccountability: {
      inviteCodeStatus: null,
      relationCreated: false,
      watchedByFriend: false,
      watchingFriend: false,
    },
    morningTasks: [],
    nextExamSchedule: null,
    notificationPreference: {
      accountabilityEnabled: false,
      dailyFocusEnabled: true,
      dailyTimetableEnabled: true,
      dailyTopPicksEnabled: true,
      maxDailyPushCount: 3,
      notificationPreferenceId: "notification-preference-id",
      schoolHoursEnd: "15:30",
      schoolHoursQuietEnabled: true,
      schoolHoursStart: "08:00",
      sleepHoursQuietEnabled: true,
      weekendSchoolQuietEnabled: false,
    },
    recoveryCard: {
      daysSinceLastSession: null,
      daysSinceRecentExam: null,
      needsRecovery: false,
      postExamMode: false,
      recentExamDate: null,
      recentExamScheduleId: null,
      recentExamSubject: null,
      recentExamTitle: null,
      recentExamType: null,
      recoveryType: "NONE",
      suggestedAction: null,
      suggestedDurationMinutes: null,
      yesterdayFocusSeconds: 0,
      yesterdayTopPickCompletionRate: 0,
    },
    seasonMode: "BASELINE_MODE",
    showFocusTimingCard: false,
    targetDate: "2026-04-24",
    timetable: {
      dailyPlanId: "daily-plan-id",
      slots: [],
      timetableId: "timetable-id",
      topPickTotal: 0,
    },
    todayDailyPlan: {
      dailyPlanId: "daily-plan-id",
      morningTasks: [],
      planDate: "2026-04-24",
      tasks: [],
    },
    topPicks: [],
    ...override,
  };
}
