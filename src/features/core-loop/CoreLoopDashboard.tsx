import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Navigate, NavLink } from "react-router-dom";

import characterDefault from "../../assets/auth/character-default.webp";
import characterFocus from "../../assets/auth/character-focus.webp";
import characterRecovery from "../../assets/auth/character-recovery.webp";
import characterSuccess from "../../assets/auth/character-success.webp";
import { getErrorMessage } from "../../shared/api/errors";
import { queryKeys } from "../../shared/queryKeys";
import { PageHeader } from "../../shared/ui/PageHeader";
import { recordAnalyticsEventSafely } from "../analytics/api";
import { useAuth } from "../auth/useAuth";
import { getBehaviorProfile } from "../onboarding/api";
import { AppSidebar } from "./AppSidebar";
import {
  getHomeToday,
  getTodayFocusSessions,
  startFocusSession,
  stopFocusSession,
} from "./api";
import { formatExamDistance, getFriendAccountabilityText } from "./displayUtils";
import type {
  HomeToday,
  NotificationPreference,
  TimetableSlot,
  TopPick,
} from "./types";
import styles from "./CoreLoopDashboard.module.css";

const homeTodayKey = queryKeys.homeToday();
const behaviorProfileKey = queryKeys.behaviorProfileMe();
const focusSessionsTodayKey = queryKeys.focusSessionsToday();
type FocusPreset = 3 | 5 | 10 | 25;

const defaultFocusPreset: FocusPreset = 5;
const supportedFocusPresets: FocusPreset[] = [3, 5, 10, 25];

function HeaderIcon({ type }: { type: "bell" | "calendar" }) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {type === "bell" ? (
        <>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </>
      ) : (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </>
      )}
    </svg>
  );
}

type DashboardIconType =
  | "check"
  | "chevron"
  | "exam"
  | "friends"
  | "plus"
  | "square"
  | "star"
  | "summary"
  | "table"
  | "target"
  | "vision"
  | "win";

function DashboardIcon({ type }: { type: DashboardIconType }) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {type === "check" ? <path d="m5 12 4 4L19 6" /> : null}
      {type === "chevron" ? <path d="m9 18 6-6-6-6" /> : null}
      {type === "friends" ? (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M16 11a3 3 0 0 0 0-6" />
          <path d="M17 20a5 5 0 0 0-3-4.5" />
        </>
      ) : null}
      {type === "exam" ? (
        <>
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M9 8h6M9 12h6M9 16h3" />
          <path d="m15 16 1 1 2-3" />
        </>
      ) : null}
      {type === "plus" ? <path d="M12 5v14M5 12h14" /> : null}
      {type === "square" ? <rect x="6" y="6" width="12" height="12" rx="3" /> : null}
      {type === "star" ? (
        <path d="m12 3 2.4 5 5.5.8-4 3.9.9 5.5L12 15.6 7.2 18.2l.9-5.5-4-3.9 5.5-.8L12 3Z" />
      ) : null}
      {type === "summary" ? (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 15V9M12 15v-3M16 15v-5" />
        </>
      ) : null}
      {type === "table" ? (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M4 10h16M9 5v14" />
        </>
      ) : null}
      {type === "target" ? (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </>
      ) : null}
      {type === "vision" ? (
        <>
          <path d="M12 19V8" />
          <path d="M8 12c-2.5 0-4-1.8-4-4 2.6-.2 4.3.8 5 3" />
          <path d="M16 12c2.5 0 4-1.8 4-4-2.6-.2-4.3.8-5 3" />
          <path d="M7 20h10" />
        </>
      ) : null}
      {type === "win" ? (
        <>
          <path d="M6 8h12v4a6 6 0 0 1-12 0V8Z" />
          <path d="M8 8V5h8v3M6 10H4a3 3 0 0 0 3 3M18 10h2a3 3 0 0 1-3 3M12 18v3M9 21h6" />
        </>
      ) : null}
    </svg>
  );
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

function formatDisplayDate(targetDate: string) {
  const [year, month, day] = targetDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(
    2,
    "0",
  )} (${weekdays[date.getDay()]})`;
}

function getDisplayDateParts(targetDate: string) {
  const [year, month, day] = targetDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const validDate =
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!validDate) {
    return {
      compactDate: "날짜 확인 필요",
      fullDate: targetDate || "날짜 없음",
      isoDate: targetDate,
      weekday: "",
    };
  }

  const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const compactDate = `${String(month).padStart(2, "0")}.${String(day).padStart(
    2,
    "0",
  )}`;

  return {
    compactDate,
    fullDate: formatDisplayDate(targetDate),
    isoDate: targetDate,
    weekday: weekdays[date.getDay()],
  };
}

function getEnabledNotificationItems(
  notificationPreference: NotificationPreference | null,
) {
  if (!notificationPreference) {
    return [];
  }

  return [
    notificationPreference.dailyFocusEnabled ? "집중" : null,
    notificationPreference.dailyTopPicksEnabled ? "TopPick" : null,
    notificationPreference.dailyTimetableEnabled ? "시간표" : null,
    notificationPreference.accountabilityEnabled ? "친구" : null,
  ].filter((item): item is string => Boolean(item));
}

function getQuietPolicyText(
  notificationPreference: NotificationPreference | null,
) {
  if (!notificationPreference) {
    return "알림 설정을 아직 불러오지 못했습니다.";
  }

  const quietRules = [
    notificationPreference.schoolHoursQuietEnabled
      ? `학교 시간 ${notificationPreference.schoolHoursStart}-${notificationPreference.schoolHoursEnd} 무음`
      : null,
    notificationPreference.sleepHoursQuietEnabled ? "수면 시간 무음" : null,
  ].filter((item): item is string => Boolean(item));

  return quietRules.length > 0 ? quietRules.join(", ") : "무음 정책 꺼짐";
}

function getNotificationSummary(home: HomeToday) {
  const enabledItems = getEnabledNotificationItems(home.notificationPreference);

  if (!home.notificationPreference) {
    return {
      count: 0,
      label: "알림 설정 없음",
      quietPolicy: getQuietPolicyText(null),
      title: "알림 설정 확인 필요",
    };
  }

  return {
    count: enabledItems.length,
    label:
      enabledItems.length > 0
        ? `${enabledItems.join(", ")} 알림 켜짐`
        : "모든 알림 꺼짐",
    quietPolicy: getQuietPolicyText(home.notificationPreference),
    title: "오늘의 알림",
  };
}

function formatSlotTime(time: string) {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

function formatSlotRange(slot: TimetableSlot) {
  return `${formatSlotTime(slot.startTime)} - ${formatSlotTime(slot.endTime)}`;
}

function parseSlotTimeToMinutes(time: string) {
  const [hour, minute] = formatSlotTime(time).split(":").map(Number);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return hour * 60 + minute;
}

function getSortedTimetableSlots(slots: TimetableSlot[]) {
  return [...slots].sort((left, right) => {
    const startDifference =
      parseSlotTimeToMinutes(left.startTime) -
      parseSlotTimeToMinutes(right.startTime);

    if (startDifference !== 0) {
      return startDifference;
    }

    return (
      parseSlotTimeToMinutes(left.endTime) -
      parseSlotTimeToMinutes(right.endTime)
    );
  });
}

function getTopPickProgress(topPick: TopPick, index: number) {
  if (topPick.completed) {
    return 100;
  }

  return Math.min(88, Math.max(42, topPick.estimatedMinutes + 18 + index * 8));
}

function getFocusGoalHours(startHour?: number, endHour?: number) {
  if (startHour === undefined || endHour === undefined) {
    return 5;
  }

  return Math.min(6, Math.max(1, endHour - startHour));
}

function getSupportedFocusPreset(minutes: number | null | undefined) {
  return supportedFocusPresets.includes(minutes as FocusPreset)
    ? (minutes as FocusPreset)
    : defaultFocusPreset;
}

export function CoreLoopDashboard() {
  const { accessToken, logout } = useAuth();
  const token = accessToken ?? "";
  const queryClient = useQueryClient();
  const focusPreset = defaultFocusPreset;
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const homeQuery = useQuery({
    enabled: Boolean(token),
    queryFn: ({ signal }) => getHomeToday({ signal, token }),
    queryKey: homeTodayKey,
  });
  const behaviorProfileQuery = useQuery({
    enabled: Boolean(token),
    queryFn: ({ signal }) => getBehaviorProfile({ signal, token }),
    queryKey: behaviorProfileKey,
    retry: false,
  });
  const focusSessionsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: ({ signal }) => getTodayFocusSessions({ signal, token }),
    queryKey: focusSessionsTodayKey,
  });

  const startFocusMutation = useMutation({
    mutationFn: (presetMinutes: FocusPreset = focusPreset) =>
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
          source: "core_loop_dashboard",
        },
        token,
      });
      setActionError(null);
      setActionNotice("집중 세션을 시작했습니다.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: homeTodayKey }),
        queryClient.invalidateQueries({ queryKey: focusSessionsTodayKey }),
      ]);
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
          source: "core_loop_dashboard",
        },
        token,
      });
      setActionError(null);
      setActionNotice("집중 세션을 멈췄습니다.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: homeTodayKey }),
        queryClient.invalidateQueries({ queryKey: focusSessionsTodayKey }),
      ]);
    },
  });

  if (homeQuery.isLoading || focusSessionsQuery.isLoading) {
    return (
      <section className={styles.centerState} aria-live="polite">
        <img
          className={styles.stateCharacter}
          src={characterDefault}
          alt=""
          aria-hidden="true"
        />
        <p>오늘 계획을 불러오는 중입니다.</p>
      </section>
    );
  }

  if (homeQuery.isError || focusSessionsQuery.isError) {
    return (
      <section className={styles.centerState} aria-live="assertive">
        <img
          className={styles.stateCharacter}
          src={characterRecovery}
          alt=""
          aria-hidden="true"
        />
        <h1 className={styles.stateTitle}>오늘 계획을 불러오지 못했습니다.</h1>
        <p>{getErrorMessage(homeQuery.error ?? focusSessionsQuery.error)}</p>
        <button
          className={styles.primaryButton}
          onClick={() => {
            homeQuery.refetch();
            focusSessionsQuery.refetch();
          }}
          type="button"
        >
          다시 시도
        </button>
      </section>
    );
  }

  const home = homeQuery.data;

  if (!home) {
    return null;
  }

  if (home.behaviorProfile === null || behaviorProfileQuery.isError) {
    return <Navigate to="/onboarding" replace />;
  }

  const behaviorProfile = behaviorProfileQuery.data ?? home.behaviorProfile;
  const focusSessions = focusSessionsQuery.data;
  const tasks = home.todayDailyPlan?.tasks ?? [];
  const primaryTopPick = home.topPicks[0] ?? null;
  const hasActionableTopPick = Boolean(primaryTopPick && !primaryTopPick.completed);
  const futureVision = home.futureVision;
  const nextExamSchedule = home.nextExamSchedule;
  const recoveryCard = home.recoveryCard;
  const needsRecovery = Boolean(recoveryCard?.needsRecovery);
  const recoveryPreset = getSupportedFocusPreset(
    recoveryCard?.suggestedDurationMinutes,
  );
  const allTimetableSlots = getSortedTimetableSlots(home.timetable?.slots ?? []);
  const timetableSlots = allTimetableSlots.slice(0, 5);
  const activeFocusSession =
    focusSessions?.sessions.find((session) => session.inProgress) ?? null;
  const focusing = Boolean(activeFocusSession ?? focusSessions?.focusing);
  const completedTaskCount = tasks.filter((task) => task.completed).length;
  const completedTopPicks = home.topPicks.filter(
    (topPick) => topPick.completed,
  ).length;
  const topPickCompletionRate =
    home.topPicks.length === 0
      ? 0
      : Math.round((completedTopPicks / home.topPicks.length) * 100);
  const focusGoalHours = getFocusGoalHours(
    behaviorProfile?.preferredFocusStartHour,
    behaviorProfile?.preferredFocusEndHour,
  );
  const focusTotalSeconds = focusSessions?.totalFocusSeconds ?? 0;
  const tinyWinCount = completedTaskCount + completedTopPicks;
  const nextExamLabel = nextExamSchedule
    ? `${nextExamSchedule.title} ${formatExamDistance(
        nextExamSchedule.daysUntil,
      )}`
    : "목표 설정 전";
  const dateParts = getDisplayDateParts(home.targetDate);
  const notificationSummary = getNotificationSummary(home);
  const friendAccountabilityText = getFriendAccountabilityText(
    home.friendAccountability,
  );
  const homeGridClassName = [
    styles.homeGrid,
    needsRecovery ? styles.homeGridWithRecovery : null,
  ]
    .filter(Boolean)
    .join(" ");
  const flowSteps = [
    {
      detail: tasks.length > 0 ? `${tasks.length}개 정리` : "계획 적기",
      label: "비우기",
      state: primaryTopPick || tasks.length > 0 ? "done" : "active",
    },
    {
      detail: primaryTopPick ? "TopPick 확정" : "1개 선택",
      label: "고르기",
      state: primaryTopPick ? "done" : tasks.length > 0 ? "active" : "pending",
    },
    {
      detail: focusing ? "진행 중" : `${focusPreset}분 집중`,
      label: "시작",
      state: focusing ? "done" : hasActionableTopPick ? "active" : "pending",
    },
  ];

  return (
    <section className={styles.dashboard} aria-labelledby="home-title">
      <AppSidebar
        friendText={friendAccountabilityText}
        onLogout={logout}
        profileSubtitle={nextExamLabel}
      />

      <div className={styles.contentShell}>
        <PageHeader
          className={styles.topHeader}
          description="머릿속 계획을 비우고, 하나를 고른 뒤, 짧게 시작하세요."
          title="오늘은 TopPick 하나만 끝내요"
          titleId="home-title"
          actions={
            <div className={styles.headerMeta} aria-label="오늘 정보">
              <button
                aria-controls="notification-summary"
                aria-expanded={notificationOpen}
                aria-label={notificationSummary.label}
                className={styles.headerIconButton}
                onClick={() => setNotificationOpen((current) => !current)}
                type="button"
              >
                <HeaderIcon type="bell" />
                {notificationSummary.count > 0 ? (
                  <span className={styles.notificationBadge}>
                    {notificationSummary.count}
                  </span>
                ) : null}
              </button>
              <div className={styles.dateCard} aria-label="오늘 날짜">
                <HeaderIcon type="calendar" />
                <time dateTime={dateParts.isoDate}>
                  <strong>{dateParts.compactDate}</strong>
                  <span>{dateParts.weekday}</span>
                </time>
              </div>
              {notificationOpen ? (
                <div
                  className={styles.notificationPanel}
                  id="notification-summary"
                  role="status"
                >
                  <strong>{notificationSummary.title}</strong>
                  <span>{notificationSummary.label}</span>
                  <small>{notificationSummary.quietPolicy}</small>
                  <small>기준일 {dateParts.fullDate}</small>
                </div>
              ) : null}
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

        <main className={homeGridClassName}>
          <section className={styles.topPickBoard} aria-label="오늘의 TopPick">
            <div className={styles.topPickContent}>
              <span className={styles.eyebrow}>
                <DashboardIcon type="star" />
                오늘의 핵심 행동
              </span>
              <h2 id="toppick-title">
                {primaryTopPick
                  ? primaryTopPick.content
                  : "머릿속 계획을 먼저 비워볼까요?"}
              </h2>
              <p>
                {primaryTopPick
                  ? primaryTopPick.completed
                    ? "이미 한 가지를 끝냈어요. 다음 행동은 새 TopPick을 고르거나 짧게 회고하는 것입니다."
                    : "지금 해야 할 일은 하나입니다. 준비된 집중 세션으로 바로 이어가요."
                  : "떠오르는 일을 모두 적고 오늘 반드시 지킬 한 가지를 골라요."}
              </p>

              <ol className={styles.flowRail} aria-label="오늘 행동 흐름">
                {flowSteps.map((step) => (
                  <li
                    aria-current={step.state === "active" ? "step" : undefined}
                    className={[
                      styles.flowStep,
                      step.state === "done" ? styles.flowStepDone : null,
                      step.state === "active" ? styles.flowStepActive : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={step.label}
                  >
                    <span>{step.label}</span>
                    <strong>{step.detail}</strong>
                  </li>
                ))}
              </ol>

              {primaryTopPick ? (
                <div className={styles.topPickStatusCard}>
                  <div className={styles.topPickMeta}>
                    <span>{primaryTopPick.completed ? "완료" : "진행 준비"}</span>
                    <strong>예상 {primaryTopPick.estimatedMinutes}분</strong>
                  </div>
                  <div className={styles.progressLine} aria-hidden="true">
                    <span
                      style={{ width: `${getTopPickProgress(primaryTopPick, 0)}%` }}
                    />
                  </div>
                  <small>
                    {primaryTopPick.memo.trim() ||
                      "집중을 시작하면 오늘의 진행률이 쌓입니다."}
                  </small>
                </div>
              ) : (
                <p className={styles.topPickHint}>
                  아직 TopPick이 없어요. 오늘 반드시 지킬 한 가지를 먼저 골라보세요.
                </p>
              )}

              <div className={styles.actionRow}>
                {hasActionableTopPick ? (
                  focusing ? (
                    <button
                      aria-label="집중 멈추기"
                      className={styles.primaryAction}
                      onClick={() => stopFocusMutation.mutate()}
                      type="button"
                    >
                      집중 멈추기
                    </button>
                  ) : (
                    <button
                      aria-label={`${focusPreset}분 집중 시작하기`}
                      className={styles.primaryAction}
                      onClick={() => startFocusMutation.mutate(focusPreset)}
                      type="button"
                    >
                      {focusPreset}분 집중 시작
                      <span aria-hidden="true">
                        <DashboardIcon type="chevron" />
                      </span>
                    </button>
                  )
                ) : (
                  <NavLink className={styles.primaryAction} to="/planning">
                    {primaryTopPick ? "다음 TopPick 정하기" : "MindSweep로 TopPick 정하기"}
                    <span aria-hidden="true">
                      <DashboardIcon type="chevron" />
                    </span>
                  </NavLink>
                )}
                {primaryTopPick ? (
                  <NavLink
                    className={styles.secondaryAction}
                    to={primaryTopPick.completed ? "/reflection" : "/planning"}
                  >
                    {primaryTopPick.completed ? "오늘 회고" : "TopPick 수정"}
                  </NavLink>
                ) : null}
              </div>
            </div>
          </section>

          {needsRecovery ? (
            <section
              className={styles.recoveryPanel}
              aria-labelledby="recovery-title"
            >
              <img src={characterRecovery} alt="" aria-hidden="true" />
              <div>
                <span>회복 제안</span>
                <h2 id="recovery-title">
                  어제는 어제고, 오늘 다시 시작하면 돼요.
                </h2>
                <p>
                  {recoveryCard?.suggestedAction ||
                    `${recoveryPreset}분만 집중하고 감각을 되찾아보세요.`}
                </p>
              </div>
              <div className={styles.recoveryActions}>
                <button
                  className={styles.recoveryPrimary}
                  onClick={() => startFocusMutation.mutate(recoveryPreset)}
                  type="button"
                >
                  {recoveryPreset}분 회복 집중
                </button>
                <NavLink className={styles.recoverySecondary} to="/reflection">
                  짧게 회고
                </NavLink>
              </div>
            </section>
          ) : null}

          <div className={styles.tileGrid}>
          <section className={styles.timetablePanel} aria-labelledby="timetable-title">
            <div className={styles.panelTitleRow}>
              <div>
                <span className={styles.sectionIcon} aria-hidden="true">
                  <DashboardIcon type="table" />
                </span>
                <h2 id="timetable-title">오늘의 시간표</h2>
              </div>
              <NavLink to="/timetable">
                {allTimetableSlots.length > 0 ? "전체 보기" : "시간표 계획하기"}
              </NavLink>
            </div>

            {timetableSlots.length === 0 ? (
              <div className={styles.compactEmpty}>
                <img src={characterDefault} alt="" aria-hidden="true" />
                <div>
                  <strong>아직 계획된 시간 블록이 없어요.</strong>
                  <p>시간표를 계획해서 하루를 더 효율적으로 보내보세요.</p>
                </div>
                <NavLink className={styles.secondaryAction} to="/timetable">
                  시간표 계획하기
                </NavLink>
              </div>
            ) : (
              <ul className={styles.timetableList} aria-label="오늘 시간표 블록">
                {timetableSlots.map((slot) => (
                  <li className={styles.slotRow} key={slot.slotId}>
                    <time>{formatSlotRange(slot)}</time>
                    <strong>{slot.content}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.visionPanel} aria-labelledby="vision-title">
            <div className={styles.panelTitleRow}>
              <div>
                <span className={styles.sectionIcon} aria-hidden="true">
                  <DashboardIcon type="vision" />
                </span>
                <h2 id="vision-title">주간 목표 시각화</h2>
              </div>
              <NavLink to="/future-vision">
                {futureVision ? "수정하기" : "목표 그리기"}
              </NavLink>
            </div>
            <div className={styles.weeklyGoalCard}>
              {futureVision ? (
                <img
                  className={styles.weeklyGoalImage}
                  alt=""
                  aria-hidden="true"
                  src={futureVision.weeklyVisionImageUrl}
                />
              ) : (
                <div className={styles.goalFlow} aria-label="이번 주 목표 단계">
                  <div>
                    <span aria-hidden="true">
                      <DashboardIcon type="vision" />
                    </span>
                    <strong>개념 완벽 이해</strong>
                    <small>어법 2개</small>
                  </div>
                  <div>
                    <span aria-hidden="true">
                      <DashboardIcon type="target" />
                    </span>
                    <strong>기출 문제</strong>
                    <small>정확히!</small>
                  </div>
                  <div>
                    <span aria-hidden="true">
                      <DashboardIcon type="win" />
                    </span>
                    <strong>나만의 속도로</strong>
                    <small>꾸준히!</small>
                  </div>
                  <div>
                    <span aria-hidden="true">
                      <DashboardIcon type="star" />
                    </span>
                    <strong>6월 모의고사</strong>
                    <small>성공하기</small>
                  </div>
                </div>
              )}
              {futureVision ? (
                <div className={styles.annualGoalCopy}>
                  <span>연간 목표</span>
                  <strong>{futureVision.yearlyVisionDescription}</strong>
                </div>
              ) : (
                <div className={styles.weeklyGoalCopy}>
                  <strong>나는 내가 빛나는 법을 알아요</strong>
                  <span>이번 주 목표 흐름</span>
                  <div className={styles.goalKeywords} aria-label="이번 주 목표 흐름">
                    <em>이해</em>
                    <em>반복</em>
                    <em>성장</em>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className={styles.examPanel} aria-labelledby="exam-title">
            <div className={styles.panelTitleRow}>
              <div>
                <span className={styles.sectionIcon} aria-hidden="true">
                  <DashboardIcon type="exam" />
                </span>
                <h2 id="exam-title">다음 시험 일정</h2>
              </div>
              <NavLink to="/exam-schedules">전체 보기</NavLink>
            </div>
            {nextExamSchedule ? (
              <NavLink className={styles.nextExamCard} to="/exam-schedules">
                <span>{formatExamDistance(nextExamSchedule.daysUntil)}</span>
                <strong>{nextExamSchedule.title}</strong>
                <small>
                  {nextExamSchedule.subject} · {nextExamSchedule.examDate}
                </small>
              </NavLink>
            ) : (
              <NavLink className={styles.emptyExamLink} to="/exam-schedules">
                시험 일정을 추가하고 D-Day를 확인해요.
              </NavLink>
            )}
          </section>

          <section className={styles.focusPanel} aria-labelledby="home-focus-title">
            <div className={styles.focusPanelCopy}>
              <span className={styles.sectionIcon} aria-hidden="true">
                <DashboardIcon type="target" />
              </span>
              <div>
                <h2 id="home-focus-title">Focus</h2>
                <p>오늘의 TopPick을 집중 세션으로 이어가요.</p>
              </div>
            </div>
            <NavLink className={styles.focusPageLink} to="/focus">
              자세히 보기
              <span aria-hidden="true">
                <DashboardIcon type="chevron" />
              </span>
            </NavLink>
            <img src={characterFocus} alt="" aria-hidden="true" />
          </section>

          <section className={styles.summaryPanel} aria-labelledby="summary-title">
            <div className={styles.panelTitleRow}>
              <div>
                <span className={styles.sectionIcon} aria-hidden="true">
                  <DashboardIcon type="summary" />
                </span>
                <h2 id="summary-title">오늘의 요약</h2>
              </div>
            </div>
            <div className={styles.summaryCards} aria-label="오늘 요약">
              <article>
                <img src={characterFocus} alt="" aria-hidden="true" />
                <span>집중 시간</span>
                <strong>{formatCompactFocus(focusTotalSeconds)}</strong>
                <small>목표 {focusGoalHours}h</small>
                <div className={styles.progressLine} aria-hidden="true">
                  <span
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (focusTotalSeconds / (focusGoalHours * 60 * 60)) * 100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
              </article>
              <article>
                <span className={styles.metricIcon} aria-hidden="true">
                  <DashboardIcon type="target" />
                </span>
                <span>집중 세션</span>
                <strong>{focusSessions?.sessions.length ?? 0}회</strong>
                <small>목표 5회</small>
                <div className={styles.progressLine} aria-hidden="true">
                  <span
                    style={{
                      width: `${Math.min(
                        100,
                        (focusSessions?.sessions.length ?? 0) * 20,
                      )}%`,
                    }}
                  />
                </div>
              </article>
              <article>
                <img src={characterSuccess} alt="" aria-hidden="true" />
                <span>TopPick 달성률</span>
                <strong>{topPickCompletionRate}%</strong>
                <small>
                  {completedTopPicks} / {Math.max(home.topPicks.length, 1)} 완료
                </small>
                <div className={styles.progressLine} aria-hidden="true">
                  <span style={{ width: `${topPickCompletionRate}%` }} />
                </div>
              </article>
              <article>
                <span className={styles.metricIcon} aria-hidden="true">
                  <DashboardIcon type="win" />
                </span>
                <span>Tiny Win</span>
                <strong>{tinyWinCount}개</strong>
                <small>오늘 +{completedTaskCount}</small>
                <div className={styles.progressLine} aria-hidden="true">
                  <span style={{ width: `${Math.min(100, tinyWinCount * 12)}%` }} />
                </div>
              </article>
            </div>
          </section>
          </div>
        </main>

        <div className={styles.mobileStickyAction}>
          {hasActionableTopPick ? (
            focusing ? (
              <button
                aria-label="모바일 하단 집중 멈추기"
                className={styles.primaryAction}
                onClick={() => stopFocusMutation.mutate()}
                type="button"
              >
                집중 멈추기
              </button>
            ) : (
              <button
                aria-label={`모바일 하단 ${focusPreset}분 집중 시작하기`}
                className={styles.primaryAction}
                onClick={() => startFocusMutation.mutate(focusPreset)}
                type="button"
              >
                {focusPreset}분 집중 시작
              </button>
            )
          ) : (
            <NavLink
              aria-label="모바일 하단 MindSweep로 TopPick 정하기"
              className={styles.primaryAction}
              to="/planning"
            >
              {primaryTopPick ? "다음 TopPick 정하기" : "MindSweep로 TopPick 정하기"}
            </NavLink>
          )}
        </div>
      </div>
    </section>
  );
}
