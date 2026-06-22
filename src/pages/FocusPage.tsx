import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, memo, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import characterDefault from "../assets/auth/character-default.webp";
import characterRecovery from "../assets/auth/character-recovery.webp";
import { recordAnalyticsEventSafely } from "../features/analytics/api";
import { useAuth } from "../features/auth/useAuth";
import { AppSidebar } from "../features/core-loop/AppSidebar";
import {
  getHomeToday,
  getRecoveryCard,
  getTodayFocusSessions,
  recordRecoveryCardAction,
  startFocusSession,
  stopFocusSession,
} from "../features/core-loop/api";
import {
  getFriendAccountabilityText,
  getNextExamLabel,
} from "../features/core-loop/displayUtils";
import type {
  FocusSession,
  RecoveryCard,
  RecoveryCardAction,
  TodayFocusSessions,
} from "../features/core-loop/types";
import {
  createDailyReflection,
  getDailyReflection,
  type DailyReflectionRequest,
  updateDailyReflection,
} from "../features/feedback/api";
import { getErrorMessage } from "../shared/api/errors";
import { queryKeys } from "../shared/queryKeys";
import { PageHeader } from "../shared/ui/PageHeader";
import { usePageGate } from "../shared/ui/usePageGate";
import styles from "./FocusPage.module.css";

type FocusPreset = 3 | 5 | 10 | 25;
type FocusMode = FocusPreset | "OPEN";
type RecoveryActionResult =
  | { action: "START"; presetMinutes: FocusPreset; session: FocusSession }
  | { action: "DISMISS" };
type RecoveryReflectionForm = Pick<
  DailyReflectionRequest,
  "ifCondition" | "thenAction" | "whatBrokeDown" | "whatWentWell"
>;

const focusPresetOptions = [3, 5, 10, 25] as const;
const focusModeOptions: FocusMode[] = [...focusPresetOptions, "OPEN"];
const homeTodayKey = queryKeys.homeToday();
const focusSessionsTodayKey = queryKeys.focusSessionsToday();
const recoveryCardKey = queryKeys.recoveryCard();
const recoveryDismissedDateStorageKey = "movra.focus.recoveryDismissedDate";

function readRecoveryDismissedDate() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(recoveryDismissedDateStorageKey);
  } catch {
    return null;
  }
}

function writeRecoveryDismissedDate(targetDate: string) {
  if (!targetDate || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(recoveryDismissedDateStorageKey, targetDate);
  } catch {
    // The server-side dismissal still completes even if local storage is unavailable.
  }
}

const localFocusStartedAtStorageKey = "movra.focus.localFocusStartedAt";

function readLocalFocusStartedAt(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(localFocusStartedAtStorageKey);
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalFocusStartedAt(startedAt: number | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (startedAt === null) {
      window.sessionStorage.removeItem(localFocusStartedAtStorageKey);
    } else {
      window.sessionStorage.setItem(
        localFocusStartedAtStorageKey,
        String(startedAt),
      );
    }
  } catch {
    // Persisting the open focus timer is best-effort; ignore storage errors.
  }
}

function isFocusPreset(value: number): value is FocusPreset {
  return focusPresetOptions.includes(value as FocusPreset);
}

function resolveRecoveryPreset(value: number | null | undefined): FocusPreset {
  return value !== undefined && value !== null && isFocusPreset(value) ? value : 5;
}

function getActiveFocusSession(focusSessions: TodayFocusSessions) {
  return focusSessions.sessions.find((session) => session.inProgress) ?? null;
}

function getElapsedSeconds({
  now,
  queriedAt,
  session,
}: {
  now: number;
  queriedAt: string;
  session: FocusSession;
}) {
  if (!session.inProgress) {
    return session.elapsedSeconds;
  }

  const queriedAtTime = Date.parse(queriedAt);
  if (!Number.isFinite(queriedAtTime)) {
    return session.elapsedSeconds;
  }

  // Client/server clock skew can make `now` precede `queriedAt`; clamp the
  // live extrapolation so the timer never runs below the server-reported value.
  const extraSeconds = Math.max(0, Math.floor((now - queriedAtTime) / 1000));
  return session.elapsedSeconds + extraSeconds;
}

function formatClock(totalSeconds: number) {
  const normalizedSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatCompactFocus(seconds: number) {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function formatKoreanDuration(seconds: number) {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}분`;
  }

  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}

function formatTime(value: string | null) {
  if (!value) {
    return "진행 중";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function formatSessionRange(session: FocusSession) {
  return `${formatTime(session.startedAt)} - ${formatTime(session.endedAt)}`;
}

function getRecoveryTitle(recoveryCard: RecoveryCard) {
  if (recoveryCard.recoveryType === "POST_EXAM_RECOVERY") {
    return "시험 뒤 회복 루틴";
  }

  if (recoveryCard.recoveryType === "LONG_ABSENCE") {
    return "오랜만의 복귀";
  }

  if (recoveryCard.recoveryType === "INCOMPLETE_TOP_PICK") {
    return "TopPick 복귀";
  }

  if (recoveryCard.recoveryType === "BOTH") {
    return "작은 복귀";
  }

  return "다시 시작하기";
}

function getSortedSessions(sessions: FocusSession[]) {
  return [...sessions].sort(
    (left, right) =>
      Date.parse(right.startedAt) - Date.parse(left.startedAt),
  );
}

type FocusTimerStageProps = {
  activeFocusSession: FocusSession | null;
  focusSessionsQueriedAt: string;
  focusing: boolean;
  localFocusStartedAt: number | null;
  onFocusModeChange: (focusMode: FocusMode) => void;
  onStartFocus: () => void;
  onStopFocus: () => void;
  selectedFocusMode: FocusMode;
  startFocusPending: boolean;
  stopFocusPending: boolean;
};

const FocusTimerStage = memo(function FocusTimerStage({
  activeFocusSession,
  focusSessionsQueriedAt,
  focusing,
  localFocusStartedAt,
  onFocusModeChange,
  onStartFocus,
  onStopFocus,
  selectedFocusMode,
  startFocusPending,
  stopFocusPending,
}: FocusTimerStageProps) {
  const [now, setNow] = useState(() => Date.now());
  const [timerOffsetSeconds, setTimerOffsetSeconds] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerPausedSeconds, setTimerPausedSeconds] = useState<number | null>(
    null,
  );
  const localFocusing = localFocusStartedAt !== null;
  const activeContinuous = localFocusing;
  const selectedPreset = selectedFocusMode === "OPEN" ? 5 : selectedFocusMode;
  const activePreset = activeFocusSession?.presetMinutes ?? selectedPreset;
  const activePresetSeconds =
    activeFocusSession?.presetSeconds ?? selectedPreset * 60;
  const localRawElapsedSeconds = localFocusStartedAt
    ? Math.floor(Math.max(0, now - localFocusStartedAt) / 1000)
    : 0;
  const rawElapsedSeconds = localFocusing
    ? localRawElapsedSeconds
    : activeFocusSession
      ? getElapsedSeconds({
          now,
          queriedAt: focusSessionsQueriedAt,
          session: activeFocusSession,
        })
      : 0;
  const elapsedSeconds =
    timerPaused && timerPausedSeconds !== null
      ? timerPausedSeconds
      : Math.max(0, rawElapsedSeconds - timerOffsetSeconds);
  const targetReached =
    focusing && !activeContinuous && elapsedSeconds >= activePresetSeconds;
  const remainingPresetSeconds = Math.max(0, activePresetSeconds - elapsedSeconds);
  const timerSeconds = focusing
    ? activeContinuous
      ? elapsedSeconds
      : remainingPresetSeconds
    : selectedFocusMode === "OPEN"
      ? 0
      : selectedPreset * 60;
  const timerLabel = focusing
    ? activeContinuous
      ? "경과 시간"
      : "남은 시간"
    : selectedFocusMode === "OPEN"
      ? "시작 준비"
      : "설정 시간";
  const progressValue =
    focusing && !activeContinuous
      ? Math.min(100, Math.round((elapsedSeconds / activePresetSeconds) * 100))
      : 0;
  const progressBarWidth = activeContinuous ? 100 : progressValue;

  useEffect(() => {
    if (!focusing) {
      return undefined;
    }

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [focusing]);

  useEffect(() => {
    setTimerOffsetSeconds(0);
    setTimerPaused(false);
    setTimerPausedSeconds(null);
  }, [activeFocusSession?.focusSessionId, localFocusStartedAt]);

  function handlePauseTimer() {
    setTimerPaused(true);
    setTimerPausedSeconds(elapsedSeconds);
  }

  function handleResumeTimer() {
    setTimerOffsetSeconds(
      Math.max(0, rawElapsedSeconds - (timerPausedSeconds ?? elapsedSeconds)),
    );
    setTimerPaused(false);
    setTimerPausedSeconds(null);
  }

  function handleResetTimer() {
    setTimerOffsetSeconds(rawElapsedSeconds);
    setTimerPausedSeconds(0);
  }

  return (
    <section className={styles.timerStage} aria-labelledby="timer-title">
      <div className={styles.timerCopy}>
        <span className={focusing ? styles.liveBadge : styles.readyBadge}>
          {timerPaused ? "잠시 멈춤" : focusing ? "진행 중" : "준비 완료"}
        </span>
        <h2 id="timer-title">
          {focusing
            ? activeContinuous
              ? "계속 Focus가 켜져 있어요"
              : `${activePreset}분 Focus가 켜져 있어요`
            : selectedFocusMode === "OPEN"
              ? "계속 Focus로 시작해요"
              : `${selectedPreset}분만 작게 시작해요`}
        </h2>
        <p>
          {focusing
            ? timerPaused
              ? "타이머를 잠시 세워뒀어요."
              : activeContinuous
                ? "멈출 때까지 00초부터 계속 쌓고 있어요."
                : targetReached
                  ? "목표 시간은 넘겼고, 더 이어가도 좋아요."
                  : "00초부터 차근차근 쌓고 있어요."
            : selectedFocusMode === "OPEN"
              ? "목표 시간 없이 00:00부터 계속 흘러가요."
              : "프리셋을 고르고 00:00부터 시작해요."}
        </p>
      </div>

      <div className={styles.timerFace} aria-live="polite">
        <span>{timerLabel}</span>
        <strong>{formatClock(timerSeconds)}</strong>
      </div>

      <div
        className={`${styles.progressTrack} ${
          activeContinuous ? styles.continuousTrack : ""
        }`}
        role="progressbar"
        aria-label={activeContinuous ? "계속 타이머" : "프리셋 진행률"}
        aria-valuemax={activeContinuous ? undefined : 100}
        aria-valuemin={activeContinuous ? undefined : 0}
        aria-valuenow={activeContinuous ? undefined : progressValue}
      >
        <span style={{ width: `${progressBarWidth}%` }} />
      </div>

      <div
        className={styles.presetGroup}
        role="group"
        aria-label="프리셋 선택"
      >
        {focusModeOptions.map((focusMode) => {
          const selected = focusing
            ? activeContinuous
              ? focusMode === "OPEN"
              : focusMode !== "OPEN" && activePreset === focusMode
            : selectedFocusMode === focusMode;

          return (
            <button
              aria-pressed={selected}
              className={selected ? styles.selectedPreset : styles.presetButton}
              disabled={focusing}
              key={focusMode}
              onClick={() => onFocusModeChange(focusMode)}
              type="button"
            >
              {focusMode === "OPEN" ? "계속" : `${focusMode}분`}
            </button>
          );
        })}
      </div>

      {focusing ? (
        <button
          className={styles.primaryAction}
          disabled={!localFocusing && stopFocusPending}
          onClick={onStopFocus}
          type="button"
        >
          Focus 멈추기
        </button>
      ) : (
        <button
          className={styles.primaryAction}
          disabled={selectedFocusMode !== "OPEN" && startFocusPending}
          onClick={onStartFocus}
          type="button"
        >
          Focus 시작하기
        </button>
      )}
      {activeContinuous ? (
        <div
          className={styles.secondaryTimerActions}
          role="group"
          aria-label="타이머 조정"
        >
          <button
            onClick={timerPaused ? handleResumeTimer : handlePauseTimer}
            type="button"
          >
            {timerPaused ? "다시 흐르게" : "잠시 멈춤"}
          </button>
          <button onClick={handleResetTimer} type="button">
            시간 초기화
          </button>
        </div>
      ) : null}
    </section>
  );
});

export function FocusPage() {
  const { accessToken, logout } = useAuth();
  const token = accessToken ?? "";
  const queryClient = useQueryClient();
  const [selectedFocusMode, setSelectedFocusMode] = useState<FocusMode>(5);
  const [localFocusStartedAt, setLocalFocusStartedAt] = useState<number | null>(
    () => readLocalFocusStartedAt(),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [recoveryFormOpen, setRecoveryFormOpen] = useState(false);
  const [dismissedRecoveryDate, setDismissedRecoveryDate] = useState<string | null>(
    () => readRecoveryDismissedDate(),
  );
  const [showTinyWinPrompt, setShowTinyWinPrompt] = useState(false);
  const [recoveryForm, setRecoveryForm] = useState<RecoveryReflectionForm>({
    ifCondition: "",
    thenAction: "",
    whatBrokeDown: "",
    whatWentWell: "다시 돌아오려고 앱을 열었습니다.",
  });
  const recoveryCardViewedRef = useRef(false);

  const homeQuery = useQuery({
    enabled: Boolean(token),
    queryFn: ({ signal }) => getHomeToday({ signal, token }),
    queryKey: homeTodayKey,
  });
  const home = homeQuery.data;
  const shouldRedirectToOnboarding = usePageGate({
    behaviorProfile: home?.behaviorProfile,
  });
  const focusSessionsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: ({ signal }) => getTodayFocusSessions({ signal, token }),
    queryKey: focusSessionsTodayKey,
  });
  const recoveryCardQuery = useQuery({
    enabled: Boolean(token),
    queryFn: ({ signal }) => getRecoveryCard({ signal, token }),
    queryKey: recoveryCardKey,
  });
  const targetDate = homeQuery.data?.targetDate ?? "";
  const dailyReflectionKey = queryKeys.dailyReflection(targetDate);
  const dailyReflectionQuery = useQuery({
    enabled: Boolean(token && targetDate),
    queryFn: ({ signal }) => getDailyReflection({ signal, targetDate, token }),
    queryKey: dailyReflectionKey,
  });

  const focusSessions = focusSessionsQuery.data;
  const recoveryCard = recoveryCardQuery.data;
  const savedRecoveryReflection = dailyReflectionQuery.data ?? null;
  const activeFocusSession = focusSessions
    ? getActiveFocusSession(focusSessions)
    : null;
  const localFocusing = localFocusStartedAt !== null;
  const serverFocusing = Boolean(activeFocusSession ?? focusSessions?.focusing);
  const focusing = serverFocusing || localFocusing;
  const recentSessions = useMemo(
    () => getSortedSessions(focusSessions?.sessions ?? []).slice(0, 5),
    [focusSessions?.sessions],
  );
  const recoveryDismissedForDate = Boolean(
    targetDate && dismissedRecoveryDate === targetDate,
  );

  useEffect(() => {
    setDismissedRecoveryDate(readRecoveryDismissedDate());
    recoveryCardViewedRef.current = false;
  }, [targetDate]);

  useEffect(() => {
    if (
      !token ||
      !recoveryCard ||
      recoveryDismissedForDate ||
      recoveryCardViewedRef.current
    ) {
      return;
    }

    recoveryCardViewedRef.current = true;
    void recordAnalyticsEventSafely({
      eventType: "RECOVERY_CARD_VIEWED",
      properties: {
        post_exam_mode: recoveryCard.postExamMode,
        recovery_type: recoveryCard.recoveryType,
        source: "focus_page",
      },
      token,
    });
  }, [recoveryCard, recoveryDismissedForDate, token]);

  async function refreshFocusData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: homeTodayKey }),
      queryClient.invalidateQueries({ queryKey: focusSessionsTodayKey }),
      queryClient.invalidateQueries({ queryKey: recoveryCardKey }),
    ]);
  }

  const startFocusMutation = useMutation({
    mutationFn: (presetMinutes: FocusPreset) =>
      startFocusSession({ presetMinutes, token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async (session) => {
      void recordAnalyticsEventSafely({
        eventType: "FOCUS_SESSION_STARTED",
        properties: {
          preset_seconds: session.presetSeconds,
          source: "focus_page",
        },
        token,
      });
      setSelectedFocusMode(session.presetMinutes);
      setActionError(null);
      setActionNotice("집중 세션을 시작했습니다.");
      setShowTinyWinPrompt(false);
      await refreshFocusData();
    },
  });

  const stopFocusMutation = useMutation({
    mutationFn: () => stopFocusSession({ token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async (session) => {
      void recordAnalyticsEventSafely({
        eventType:
          session.presetCompletionRate !== null && session.presetCompletionRate >= 1
            ? "FOCUS_SESSION_COMPLETED"
            : "FOCUS_SESSION_ABANDONED",
        properties: {
          actual_seconds: session.recordedElapsedSeconds ?? session.elapsedSeconds,
          preset_seconds: session.presetSeconds,
          source: "focus_page",
        },
        token,
      });
      setActionError(null);
      setActionNotice("집중 세션을 멈췄습니다.");
      setShowTinyWinPrompt(true);
      await refreshFocusData();
    },
  });

  const recoveryActionMutation = useMutation({
    mutationFn: async (
      action: RecoveryCardAction,
    ): Promise<RecoveryActionResult> => {
      await recordRecoveryCardAction({ action, token });

      if (action === "START") {
        const presetMinutes = resolveRecoveryPreset(
          recoveryCard?.suggestedDurationMinutes,
        );
        const session = await startFocusSession({ presetMinutes, token });
        return { action, presetMinutes, session };
      }

      return { action: "DISMISS" };
    },
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async (result) => {
      void recordAnalyticsEventSafely({
        eventType: "RECOVERY_CARD_ACTIONED",
        properties: {
          action: result.action.toLowerCase(),
          duration_preset_min:
            result.action === "START" ? result.presetMinutes : undefined,
          source: "focus_page",
        },
        token,
      });
      setActionError(null);

      if (result.action === "START") {
        void recordAnalyticsEventSafely({
          eventType: "FOCUS_SESSION_STARTED",
          properties: {
            preset_seconds: result.session.presetSeconds,
            source: "recovery_card",
          },
          token,
        });
        setSelectedFocusMode(result.presetMinutes);
        setRecoveryModalOpen(false);
        setActionNotice("복귀 Focus를 시작했습니다.");
      }

      if (result.action === "DISMISS") {
        writeRecoveryDismissedDate(targetDate);
        setDismissedRecoveryDate(targetDate);
        setRecoveryModalOpen(false);
        setActionNotice("Recovery Card를 오늘은 넘겨두었습니다.");
      }

      await refreshFocusData();
    },
  });

  const recoveryReflectionMutation = useMutation({
    mutationFn: async (values: RecoveryReflectionForm) => {
      await createDailyReflection({
        token,
        values: {
          ...values,
          reflectionDate: homeQuery.data?.targetDate ?? "",
        },
      });
      await recordRecoveryCardAction({ action: "REFLECT", token });
    },
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
      void queryClient.invalidateQueries({ queryKey: dailyReflectionKey });
    },
    onSuccess: async () => {
      void recordAnalyticsEventSafely({
        eventType: "DAILY_REFLECTION_CREATED",
        properties: {
          has_if_then: Boolean(
            recoveryForm.ifCondition.trim() && recoveryForm.thenAction.trim(),
          ),
          source: "focus_page",
          target_date: homeQuery.data?.targetDate,
        },
        token,
      });
      setActionError(null);
      setActionNotice("회복 기록을 저장했습니다.");
      setRecoveryFormOpen(false);
      setRecoveryModalOpen(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dailyReflectionKey }),
        refreshFocusData(),
      ]);
    },
  });

  const updateRecoveryReflectionMutation = useMutation({
    mutationFn: (values: RecoveryReflectionForm) => {
      if (!savedRecoveryReflection) {
        throw new Error("수정할 회복 기록을 찾지 못했습니다.");
      }

      return updateDailyReflection({
        dailyReflectionId: savedRecoveryReflection.dailyReflectionId,
        token,
        values,
      });
    },
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
      void queryClient.invalidateQueries({ queryKey: dailyReflectionKey });
    },
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("회복 기록을 수정했습니다.");
      setRecoveryFormOpen(false);
      setRecoveryModalOpen(true);
      await queryClient.invalidateQueries({ queryKey: dailyReflectionKey });
    },
  });

  if (homeQuery.isLoading || focusSessionsQuery.isLoading) {
    return (
      <section className={styles.centerState} aria-live="polite">
        <img src={characterDefault} alt="" aria-hidden="true" />
        <p>집중 화면을 불러오는 중입니다.</p>
      </section>
    );
  }

  const loadError =
    homeQuery.error ?? focusSessionsQuery.error;
  if (homeQuery.isError || focusSessionsQuery.isError) {
    return (
      <section className={styles.centerState} aria-live="assertive">
        <img src={characterRecovery} alt="" aria-hidden="true" />
        <h1>집중 데이터를 불러오지 못했습니다.</h1>
        <p>{loadError ? getErrorMessage(loadError) : "다시 시도해주세요."}</p>
        <button
          onClick={() => {
            if (homeQuery.isError) {
              homeQuery.refetch();
            }
            if (focusSessionsQuery.isError) {
              focusSessionsQuery.refetch();
            }
          }}
          type="button"
        >
          다시 시도
        </button>
      </section>
    );
  }

  if (!home || !focusSessions) {
    return null;
  }

  if (shouldRedirectToOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  const friendAccountabilityText = getFriendAccountabilityText(
    home.friendAccountability,
  );
  const showRecoveryEntry = Boolean(
    recoveryCard?.needsRecovery && !recoveryDismissedForDate,
  );
  const recoveryPreset = resolveRecoveryPreset(
    recoveryCard?.suggestedDurationMinutes,
  );
  const recoveryReflectionSaving =
    recoveryReflectionMutation.isPending ||
    updateRecoveryReflectionMutation.isPending;

  function updateRecoveryFormField<K extends keyof RecoveryReflectionForm>(
    field: K,
    value: RecoveryReflectionForm[K],
  ) {
    setRecoveryForm((current) => ({ ...current, [field]: value }));
  }

  function handleRecoveryReflectionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = {
      ifCondition: recoveryForm.ifCondition.trim(),
      thenAction: recoveryForm.thenAction.trim(),
      whatBrokeDown: recoveryForm.whatBrokeDown.trim(),
      whatWentWell: recoveryForm.whatWentWell.trim(),
    };

    if (
      !values.ifCondition ||
      !values.thenAction ||
      !values.whatBrokeDown ||
      !values.whatWentWell
    ) {
      setActionNotice(null);
      setActionError("회복 기록을 저장하려면 네 칸을 모두 채워주세요.");
      return;
    }

    if (savedRecoveryReflection) {
      updateRecoveryReflectionMutation.mutate(values);
      return;
    }

    recoveryReflectionMutation.mutate(values);
  }

  function handleStartFocus() {
    if (selectedFocusMode === "OPEN") {
      const startedAt = Date.now();
      setLocalFocusStartedAt(startedAt);
      writeLocalFocusStartedAt(startedAt);
      setActionError(null);
      setActionNotice("계속 Focus를 시작했습니다. 이 타이머는 아직 서버에 기록되지 않습니다.");
      return;
    }

    startFocusMutation.mutate(selectedFocusMode);
  }

  function handleStopFocus() {
    if (localFocusing) {
      setLocalFocusStartedAt(null);
      writeLocalFocusStartedAt(null);
      setActionError(null);
      setActionNotice("계속 Focus를 멈췄습니다.");
      return;
    }

    stopFocusMutation.mutate();
  }

  function openRecoveryEditForm() {
    if (!savedRecoveryReflection) {
      return;
    }

    setRecoveryForm({
      ifCondition: savedRecoveryReflection.ifCondition,
      thenAction: savedRecoveryReflection.thenAction,
      whatBrokeDown: savedRecoveryReflection.whatBrokeDown,
      whatWentWell: savedRecoveryReflection.whatWentWell,
    });
    setRecoveryFormOpen(true);
  }

  return (
    <section className={styles.focusPage} aria-labelledby="focus-title">
      <AppSidebar
        friendText={friendAccountabilityText}
        onLogout={logout}
        profileSubtitle={getNextExamLabel(home)}
      />

      <div className={styles.contentShell}>
        <PageHeader
          className={styles.topHeader}
          description="지금은 한 번에 하나만 켜두면 충분해요."
          eyebrow="Focus"
          title="집중 시간"
          titleId="focus-title"
          actions={
            <div className={styles.headerStats} aria-label="오늘 집중 요약">
              <article>
                <span>총 집중</span>
                <strong>{formatCompactFocus(focusSessions.totalFocusSeconds)}</strong>
              </article>
              <article>
                <span>세션</span>
                <strong>{focusSessions.sessions.length}회</strong>
              </article>
            </div>
          }
        />

        {actionError ? (
          <p className={styles.error} role="alert">
            {actionError}
          </p>
        ) : null}
        {actionNotice ? (
          <p className={styles.success} role="status">
            {actionNotice}
          </p>
        ) : null}
        {showTinyWinPrompt ? (
          <div className={styles.tinyWinPrompt}>
            <Link to="/reflection?focus=new">
              방금 집중을 잘 끝냈어요. 작은 성취 남기기 →
            </Link>
            <button
              onClick={() => setShowTinyWinPrompt(false)}
              type="button"
            >
              닫기
            </button>
          </div>
        ) : null}

        <main className={styles.focusGrid}>
          <FocusTimerStage
            activeFocusSession={activeFocusSession}
            focusSessionsQueriedAt={focusSessions.queriedAt}
            focusing={focusing}
            localFocusStartedAt={localFocusStartedAt}
            onFocusModeChange={setSelectedFocusMode}
            onStartFocus={handleStartFocus}
            onStopFocus={handleStopFocus}
            selectedFocusMode={selectedFocusMode}
            startFocusPending={startFocusMutation.isPending}
            stopFocusPending={stopFocusMutation.isPending}
          />

          <aside className={styles.sidePanels}>
            <section className={styles.recordPanel} aria-labelledby="record-title">
              <div className={styles.panelTitleRow}>
                <div>
                  <span>Today</span>
                  <h2 id="record-title">오늘 기록</h2>
                </div>
                <strong>{formatCompactFocus(focusSessions.totalFocusSeconds)}</strong>
              </div>
              {recentSessions.length === 0 ? (
                <div className={styles.emptyState}>
                  <img src={characterDefault} alt="" aria-hidden="true" />
                  <p>아직 오늘 집중 기록이 없습니다.</p>
                </div>
              ) : (
                <ul className={styles.sessionList}>
                  {recentSessions.map((session) => (
                    <li key={session.focusSessionId}>
                      <div>
                        <strong>
                          {session.inProgress
                            ? "진행 중"
                            : formatKoreanDuration(session.elapsedSeconds)}
                        </strong>
                        <span>{formatSessionRange(session)}</span>
                      </div>
                      <em>{session.presetMinutes}분</em>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {showRecoveryEntry && recoveryCard ? (
              <section
                className={styles.recoveryEntry}
                aria-labelledby="recovery-entry-title"
              >
                <img src={characterRecovery} alt="" aria-hidden="true" />
                <div>
                  <span>Recovery Card</span>
                  <h2 id="recovery-entry-title">{getRecoveryTitle(recoveryCard)}</h2>
                  <p>{recoveryCard.suggestedAction ?? "다시 시작해볼까요?"}</p>
                </div>
                <button
                  onClick={() => {
                    setRecoveryFormOpen(false);
                    setRecoveryModalOpen(true);
                  }}
                  type="button"
                >
                  카드 열기
                </button>
              </section>
            ) : null}
          </aside>
        </main>

        {recoveryModalOpen && recoveryCard ? (
          <div className={styles.modalBackdrop}>
            <section
              aria-labelledby="recovery-modal-title"
              aria-modal="true"
              className={styles.recoveryModal}
              role="dialog"
            >
              <Link
                className={styles.recoveryReflectionLink}
                to="/reflection"
              >
                전체 회고 보기 →
              </Link>
              <button
                aria-label="Recovery Card 닫기"
                className={styles.closeButton}
                onClick={() => setRecoveryModalOpen(false)}
                type="button"
              >
                ×
              </button>
              <div className={styles.modalHeader}>
                <img src={characterRecovery} alt="" aria-hidden="true" />
                <div>
                  <span>Recovery Card</span>
                  <h2 id="recovery-modal-title">{getRecoveryTitle(recoveryCard)}</h2>
                  <p>{recoveryCard.suggestedAction ?? "다시 시작해볼까요?"}</p>
                </div>
              </div>

              <dl className={styles.recoveryMetrics}>
                <div>
                  <dt>어제 집중</dt>
                  <dd>{formatKoreanDuration(recoveryCard.yesterdayFocusSeconds)}</dd>
                </div>
                <div>
                  <dt>TopPick</dt>
                  <dd>
                    {Math.round(recoveryCard.yesterdayTopPickCompletionRate * 100)}
                    %
                  </dd>
                </div>
                <div>
                  <dt>최근 공백</dt>
                  <dd>
                    {recoveryCard.daysSinceLastSession === null
                      ? "기록 없음"
                      : `${recoveryCard.daysSinceLastSession}일`}
                  </dd>
                </div>
              </dl>

              {dailyReflectionQuery.isError ? (
                <p className={styles.modalError} role="alert">
                  저장된 회복 기록을 불러오지 못했습니다.
                </p>
              ) : null}

              {recoveryFormOpen ? (
                <>
                  <form
                    className={styles.recoveryForm}
                    onSubmit={handleRecoveryReflectionSubmit}
                  >
                    <label>
                      오늘 잘한 것
                      <textarea
                        maxLength={500}
                        onChange={(event) =>
                          updateRecoveryFormField("whatWentWell", event.target.value)
                        }
                        value={recoveryForm.whatWentWell}
                      />
                    </label>
                    <label>
                      무너진 지점
                      <textarea
                        maxLength={1000}
                        onChange={(event) =>
                          updateRecoveryFormField("whatBrokeDown", event.target.value)
                        }
                        placeholder="어디에서 흐름이 끊겼나요?"
                        value={recoveryForm.whatBrokeDown}
                      />
                    </label>
                    <label>
                      If
                      <input
                        maxLength={500}
                        onChange={(event) =>
                          updateRecoveryFormField("ifCondition", event.target.value)
                        }
                        placeholder="다음에 이런 상황이면"
                        value={recoveryForm.ifCondition}
                      />
                    </label>
                    <label>
                      Then
                      <input
                        maxLength={500}
                        onChange={(event) =>
                          updateRecoveryFormField("thenAction", event.target.value)
                        }
                        placeholder="이 행동으로 돌아오기"
                        value={recoveryForm.thenAction}
                      />
                    </label>
                    <div className={styles.modalActions}>
                      <button
                        disabled={recoveryReflectionSaving}
                        type="submit"
                      >
                        {savedRecoveryReflection ? "회복 기록 수정" : "회복 기록 저장"}
                      </button>
                      <button
                        disabled={recoveryReflectionSaving}
                        onClick={() => setRecoveryFormOpen(false)}
                        type="button"
                      >
                        뒤로
                      </button>
                    </div>
                  </form>
                </>
              ) : savedRecoveryReflection ? (
                <>
                  <section
                    aria-labelledby="saved-recovery-title"
                    className={styles.savedReflection}
                  >
                    <div>
                      <span>{savedRecoveryReflection.reflectionDate}</span>
                      <h3 id="saved-recovery-title">저장된 회복 기록</h3>
                    </div>
                    <dl>
                      <div>
                        <dt>오늘 잘한 것</dt>
                        <dd>{savedRecoveryReflection.whatWentWell}</dd>
                      </div>
                      <div>
                        <dt>무너진 지점</dt>
                        <dd>{savedRecoveryReflection.whatBrokeDown}</dd>
                      </div>
                      <div>
                        <dt>If</dt>
                        <dd>{savedRecoveryReflection.ifCondition}</dd>
                      </div>
                      <div>
                        <dt>Then</dt>
                        <dd>{savedRecoveryReflection.thenAction}</dd>
                      </div>
                    </dl>
                  </section>
                  <div className={styles.modalActions}>
                    <button
                      disabled={focusing || recoveryActionMutation.isPending}
                      onClick={() => recoveryActionMutation.mutate("START")}
                      type="button"
                    >
                      {recoveryPreset}분으로 복귀 시작
                    </button>
                    <button
                      onClick={openRecoveryEditForm}
                      type="button"
                    >
                      수정하기
                    </button>
                    <button
                      onClick={() => setRecoveryModalOpen(false)}
                      type="button"
                    >
                      닫기
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.modalActions}>
                  <button
                    disabled={focusing || recoveryActionMutation.isPending}
                    onClick={() => recoveryActionMutation.mutate("START")}
                    type="button"
                  >
                    {recoveryPreset}분으로 복귀 시작
                  </button>
                  <button
                    onClick={() => setRecoveryFormOpen(true)}
                    type="button"
                  >
                    회복 기록 남기기
                  </button>
                  <button
                    disabled={recoveryActionMutation.isPending}
                    onClick={() => recoveryActionMutation.mutate("DISMISS")}
                    type="button"
                  >
                    오늘은 넘기기
                  </button>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </section>
  );
}
