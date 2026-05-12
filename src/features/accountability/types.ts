export type MonitoringTarget =
  | "FOCUS_SESSION"
  | "TOP_PICKS"
  | "TIMETABLE_TASK";

export type AccountabilityRelation = {
  accountabilityRelationId: string;
  subjectUserId: string;
  watcherUserId: string | null;
  watcherConnected: boolean;
  allowedTargets: MonitoringTarget[];
};

export type AccountabilityFriends = {
  watchedByFriends: AccountabilityRelation[];
  watchingFriends: AccountabilityRelation[];
};

export type InviteCodeStatus = {
  inviteCode: string | null;
  expiredAt: string | null;
  expired: boolean;
  reissuable: boolean;
  watcherConnected: boolean;
};

export type ReissueInviteCodeResponse = {
  inviteCode: string;
  expiresAt: string;
};

export type WatcherSummary = Record<string, unknown>;

export type SummaryTarget = "focus-sessions" | "top-picks" | "timetable-tasks";

export type SummaryMode = "date" | "range";
