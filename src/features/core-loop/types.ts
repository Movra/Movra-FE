import type { BehaviorProfile } from "../onboarding/types";

export type TaskType = "GENERAL" | "MORNING";

export type TopPickDetail = {
  estimatedMinutes: number;
  memo: string;
};

export type DailyPlanTask = {
  taskId: string;
  content: string;
  completed: boolean;
  taskType?: TaskType;
  topPicked?: boolean;
  topPickDetail?: TopPickDetail | null;
};

export type DailyPlan = {
  dailyPlanId: string;
  planDate: string;
  tasks: DailyPlanTask[];
  morningTasks: DailyPlanTask[];
};

export type TopPick = {
  taskId: string;
  content: string;
  completed: boolean;
  estimatedMinutes: number;
  memo: string;
};

export type FocusSession = {
  focusSessionId: string;
  startedAt: string;
  endedAt: string | null;
  recordedElapsedSeconds: number | null;
  elapsedSeconds: number;
  inProgress: boolean;
  presetMinutes: 3 | 5 | 10 | 25;
  presetSeconds: number;
  presetCompletionRate: number | null;
};

export type TodayFocusSessions = {
  targetDate: string;
  queriedAt: string;
  totalFocusSeconds: number;
  focusing: boolean;
  sessions: FocusSession[];
};

export type RecoveryType =
  | "POST_EXAM_RECOVERY"
  | "LONG_ABSENCE"
  | "MISSED_FOCUS"
  | "INCOMPLETE_TOP_PICK"
  | "BOTH"
  | "NONE";

export type RecoveryCard = {
  needsRecovery: boolean;
  recoveryType: RecoveryType;
  suggestedAction: string | null;
  suggestedDurationMinutes: number | null;
  yesterdayFocusSeconds: number;
  yesterdayTopPickCompletionRate: number;
  postExamMode: boolean;
  recentExamScheduleId: string | null;
  recentExamType: string | null;
  recentExamTitle: string | null;
  recentExamDate: string | null;
  recentExamSubject: string | null;
  daysSinceRecentExam: number | null;
  daysSinceLastSession: number | null;
};

export type RecoveryCardAction = "START" | "REFLECT" | "DISMISS";

export type FutureVision = {
  futureVisionId: string;
  weeklyVisionImageUrl: string;
  yearlyVisionImageUrl: string;
  yearlyVisionDescription: string;
  yearlyVisionCreatedAt: string;
};

export type TimetableSlot = {
  slotId: string;
  taskId: string | null;
  content: string;
  startTime: string;
  endTime: string;
  topPick: boolean;
};

export type Timetable = {
  timetableId: string;
  dailyPlanId: string;
  topPickTotal: number;
  slots: TimetableSlot[];
};

export type ExamType = "NAESIN" | "MOPYUNG" | "HAKPYUNG" | "SUNUNG" | "OTHER";

export type ExamSchedule = {
  examScheduleId: string;
  examType: ExamType;
  title: string;
  examDate: string;
  subject: string;
  daysUntil: number;
  seasonMode: string;
};

export type SeasonMode =
  | "SUNUNG_INTENSIVE"
  | "NAESIN_INTENSIVE"
  | "MOPYUNG_FOCUSED"
  | "BASELINE_MODE";

export type SeasonModeResponse = {
  seasonMode: SeasonMode;
  nextExamSchedule: ExamSchedule | null;
};

export type NotificationPreference = {
  notificationPreferenceId: string;
  dailyFocusEnabled: boolean;
  dailyTopPicksEnabled: boolean;
  dailyTimetableEnabled: boolean;
  accountabilityEnabled: boolean;
  schoolHoursQuietEnabled: boolean;
  schoolHoursStart: string;
  schoolHoursEnd: string;
  weekendSchoolQuietEnabled: boolean;
  sleepHoursQuietEnabled: boolean;
  maxDailyPushCount: number;
};

export type FriendAccountabilityInviteCodeStatus = {
  inviteCode: string | null;
  expiredAt: string | null;
  expired: boolean;
  reissuable: boolean;
  watcherConnected: boolean;
};

export type FriendAccountability = {
  relationCreated: boolean;
  watchedByFriend: boolean;
  watchingFriend: boolean;
  inviteCodeStatus: FriendAccountabilityInviteCodeStatus | string | null;
};

export type HomeToday = {
  targetDate: string;
  futureVision: FutureVision | null;
  behaviorProfile: BehaviorProfile | null;
  todayDailyPlan: DailyPlan | null;
  morningTasks: DailyPlanTask[];
  topPicks: TopPick[];
  timetable: Timetable | null;
  focusSessions: TodayFocusSessions;
  activeFocusSession: FocusSession | null;
  recoveryCard: RecoveryCard;
  seasonMode: string;
  nextExamSchedule: ExamSchedule | null;
  notificationPreference: NotificationPreference | null;
  friendAccountability: FriendAccountability | null;
  showFocusTimingCard: boolean;
};
