export type ExecutionDifficulty = "LOW" | "MEDIUM" | "HIGH";

export type SocialPreference = "LOW" | "MEDIUM" | "HIGH";

export type RecoveryStyle =
  | "QUICK_RESTART"
  | "NEEDS_REFLECTION"
  | "SLOW_REBUILDER";

export type ExamTrack = "UNDECIDED" | "NAESIN" | "MOPYUNG_SUNUNG" | "BOTH";

export type CoachingMode = "GENTLE" | "NEUTRAL" | "STRICT";

export type BehaviorProfileRequest = {
  executionDifficulty: ExecutionDifficulty;
  socialPreference: SocialPreference;
  recoveryStyle: RecoveryStyle;
  examTrack: ExamTrack;
  preferredFocusStartHour: number;
  preferredFocusEndHour: number;
  coachingMode: CoachingMode;
};

export type BehaviorProfile = BehaviorProfileRequest & {
  behaviorProfileId: string;
};

export type OnboardingContext = {
  pendingSchoolHours: boolean;
};
