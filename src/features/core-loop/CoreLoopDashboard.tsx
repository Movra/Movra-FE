import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Navigate, NavLink } from "react-router-dom";

import characterDefault from "../../assets/auth/character-default.png";
import characterFocus from "../../assets/auth/character-focus.png";
import characterRecovery from "../../assets/auth/character-recovery.png";
import characterSuccess from "../../assets/auth/character-success.png";
import characterTopPick from "../../assets/auth/character-toppick.png";
import { ApiClientError } from "../../shared/api/client";
import { useAuth } from "../auth/useAuth";
import { AppSidebar } from "./AppSidebar";
import { getHomeToday, startFocusSession, stopFocusSession } from "./api";
import type {
  FriendAccountability,
  HomeToday,
  NotificationPreference,
  TimetableSlot,
  TopPick,
} from "./types";
import styles from "./CoreLoopDashboard.module.css";

const homeTodayKey = ["home-today"] as const;
const focusPresetOptions = [3, 5, 10, 25] as const;

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

function getFriendAccountabilityText(
  friendAccountability: FriendAccountability | null,
) {
  if (!friendAccountability?.relationCreated) {
    return "연결된 친구 없음";
  }

  if (friendAccountability.watchedByFriend && friendAccountability.watchingFriend) {
    return "서로 진행 상황 공유 중";
  }

  if (friendAccountability.watchedByFriend) {
    return "친구가 나를 지켜보는 중";
  }

  if (friendAccountability.watchingFriend) {
    return "내가 친구를 지켜보는 중";
  }

  return friendAccountability.inviteCodeStatus ?? "친구 연결 대기 중";
}

function formatExamDistance(daysUntil: number) {
  if (daysUntil === 0) {
    return "D-Day";
  }

  return daysUntil > 0 ? `D-${daysUntil}` : `D+${Math.abs(daysUntil)}`;
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

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "요청 처리에 실패했습니다.";
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

function getSlotStatus(slot: TimetableSlot, index: number) {
  if (slot.topPick && index === 0) {
    return "진행 예정";
  }

  return slot.topPick ? "TopPick" : "예정";
}

export function CoreLoopDashboard() {
  const { accessToken, logout } = useAuth();
  const token = accessToken ?? "";
  const queryClient = useQueryClient();
  const [focusPreset, setFocusPreset] = useState<3 | 5 | 10 | 25>(5);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const homeQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getHomeToday({ token }),
    queryKey: homeTodayKey,
  });

  const startFocusMutation = useMutation({
    mutationFn: () => startFocusSession({ presetMinutes: focusPreset, token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("집중 세션을 시작했습니다.");
      await queryClient.invalidateQueries({ queryKey: homeTodayKey });
    },
  });

  const stopFocusMutation = useMutation({
    mutationFn: () => stopFocusSession({ token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("집중 세션을 종료했습니다.");
      await queryClient.invalidateQueries({ queryKey: homeTodayKey });
    },
  });

  if (homeQuery.isLoading) {
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

  if (homeQuery.isError) {
    return (
      <section className={styles.centerState} aria-live="assertive">
        <img
          className={styles.stateCharacter}
          src={characterRecovery}
          alt=""
          aria-hidden="true"
        />
        <h1 className={styles.stateTitle}>오늘 계획을 불러오지 못했습니다.</h1>
        <p>{getErrorMessage(homeQuery.error)}</p>
        <button
          className={styles.primaryButton}
          onClick={() => homeQuery.refetch()}
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

  if (home.behaviorProfile === null) {
    return <Navigate to="/onboarding" replace />;
  }

  const tasks = home.todayDailyPlan?.tasks ?? [];
  const primaryTopPick = home.topPicks[0] ?? null;
  const futureVision = home.futureVision;
  const nextExamSchedule = home.nextExamSchedule;
  const timetableSlots = getSortedTimetableSlots(
    home.timetable?.slots ?? [],
  ).slice(0, 5);
  const activeFocusSession = home.activeFocusSession ?? null;
  const focusing = Boolean(activeFocusSession ?? home.focusSessions.focusing);
  const completedTaskCount = tasks.filter((task) => task.completed).length;
  const completedTopPicks = home.topPicks.filter(
    (topPick) => topPick.completed,
  ).length;
  const topPickCompletionRate =
    home.topPicks.length === 0
      ? 0
      : Math.round((completedTopPicks / home.topPicks.length) * 100);
  const focusGoalHours = getFocusGoalHours(
    home.behaviorProfile.preferredFocusStartHour,
    home.behaviorProfile.preferredFocusEndHour,
  );
  const focusTotalSeconds = home.focusSessions.totalFocusSeconds;
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

  return (
    <section className={styles.dashboard} aria-labelledby="home-title">
      <AppSidebar
        friendText={friendAccountabilityText}
        onLogout={logout}
        profileSubtitle={nextExamLabel}
      />

      <div className={styles.contentShell}>
        <header className={styles.topHeader}>
          <div>
            <h1 id="home-title">안녕하세요, 김모브라님!</h1>
            <p>오늘도 한 걸음씩, 나답게 성장해요.</p>
          </div>
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
        </header>

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

        <main className={styles.homeGrid}>
          <section className={styles.topPickBoard} aria-labelledby="toppick-title">
            <div className={styles.boardHeader}>
              <div>
                <span className={styles.sectionIcon} aria-hidden="true">
                  <DashboardIcon type="star" />
                </span>
                <h2 id="toppick-title">오늘의 TopPick</h2>
              </div>
              <p>오늘 반드시 지킬 핵심 행동</p>
            </div>

            <div className={styles.topPickCards}>
              {primaryTopPick ? (
                <article className={`${styles.topPickCard} ${styles.topPickGreen}`}>
                  <div className={styles.cardNumber}>
                    <span aria-hidden="true">
                      <DashboardIcon type="star" />
                    </span>
                    <strong aria-label={primaryTopPick.completed ? "완료" : "진행 중"}>
                      <DashboardIcon
                        type={primaryTopPick.completed ? "check" : "square"}
                      />
                    </strong>
                  </div>
                  <h3>{primaryTopPick.content}</h3>
                  <p>예상 {primaryTopPick.estimatedMinutes}분</p>
                  <div className={styles.progressLine} aria-hidden="true">
                    <span
                      style={{ width: `${getTopPickProgress(primaryTopPick, 0)}%` }}
                    />
                  </div>
                  <NavLink className={styles.topPickActionLink} to="/planning">
                    계획에서 변경하기
                  </NavLink>
                </article>
              ) : (
                <NavLink className={styles.emptyTopPickCard} to="/planning">
                  <img src={characterTopPick} alt="" aria-hidden="true" />
                  <strong>TopPick 선택하기</strong>
                  <span>오늘 반드시 지킬 한 가지를 계획 페이지에서 골라요.</span>
                </NavLink>
              )}
            </div>
          </section>

          <section className={styles.visionPanel} aria-labelledby="vision-title">
            <div className={styles.panelTitleRow}>
              <div>
                <span className={styles.sectionIcon} aria-hidden="true">
                  <DashboardIcon type="vision" />
                </span>
                <h2 id="vision-title">Future Vision</h2>
              </div>
              <NavLink to="/future-vision">
                {futureVision ? "수정하기" : "그리기"}
              </NavLink>
            </div>
            {futureVision ? (
              <div className={styles.visionPreview}>
                <img
                  alt=""
                  aria-hidden="true"
                  src={futureVision.weeklyVisionImageUrl}
                />
                <div>
                  <strong>{futureVision.yearlyVisionDescription}</strong>
                  <span>오늘의 목표가 흐려질 때 다시 볼 이미지</span>
                </div>
              </div>
            ) : (
              <NavLink className={styles.emptyVisionLink} to="/future-vision">
                <strong>자주 보고 싶은 목표 이미지를 걸어둘래요?</strong>
                <span>연간 목표와 주간 목표를 직접 그려 홈에 연결해요.</span>
              </NavLink>
            )}
          </section>

          <section className={styles.examPanel} aria-labelledby="exam-title">
            <div className={styles.panelTitleRow}>
              <div>
                <span className={styles.sectionIcon} aria-hidden="true">
                  <DashboardIcon type="exam" />
                </span>
                <h2 id="exam-title">다음 시험</h2>
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

          <section className={styles.focusBanner} aria-labelledby="focus-title">
            <div className={styles.focusCopy}>
              <span className={styles.focusMark} aria-hidden="true">
                <DashboardIcon type="target" />
              </span>
              <div>
                <p>{focusPreset}분 집중으로 시작해요</p>
                <h2 id="focus-title">지금 바로 시작</h2>
              </div>
            </div>

            <label className={styles.focusPreset}>
              프리셋
              <select
                disabled={focusing}
                onChange={(event) =>
                  setFocusPreset(Number(event.target.value) as 3 | 5 | 10 | 25)
                }
                value={focusPreset}
              >
                {focusPresetOptions.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}분
                  </option>
                ))}
              </select>
            </label>

            {focusing ? (
              <button
                aria-label="종료"
                className={styles.focusButton}
                onClick={() => stopFocusMutation.mutate()}
                type="button"
              >
                Focus 종료하기
              </button>
            ) : (
              <button
                aria-label="시작"
                className={styles.focusButton}
                onClick={() => startFocusMutation.mutate()}
                type="button"
              >
                지금 바로 {focusPreset}분 Focus 시작하기
                <span aria-hidden="true">
                  <DashboardIcon type="chevron" />
                </span>
              </button>
            )}

            <div className={styles.timerScene} aria-hidden="true">
              <img src={characterFocus} alt="" />
              <strong>{focusPreset}:00</strong>
            </div>
          </section>

          <section className={styles.timetablePanel} aria-labelledby="timetable-title">
            <div className={styles.panelTitleRow}>
              <div>
                <span className={styles.sectionIcon} aria-hidden="true">
                  <DashboardIcon type="table" />
                </span>
                <h2 id="timetable-title">오늘의 시간표</h2>
              </div>
              <NavLink to="/timetable">전체 보기</NavLink>
            </div>

            {timetableSlots.length === 0 ? (
              <div className={styles.compactEmpty}>
                <img src={characterDefault} alt="" aria-hidden="true" />
                <p>아직 배정된 시간 블록이 없습니다.</p>
              </div>
            ) : (
              <ul className={styles.timetableList}>
                {timetableSlots.map((slot, index) => (
                  <li
                    className={slot.topPick ? styles.activeSlot : styles.slotRow}
                    key={slot.slotId}
                  >
                    <span aria-hidden="true" />
                    <time>{formatSlotRange(slot)}</time>
                    <strong>{slot.content}</strong>
                    <em>{getSlotStatus(slot, index)}</em>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.recoveryPanel} aria-labelledby="recovery-title">
            <img src={characterRecovery} alt="" aria-hidden="true" />
            <div>
              <p>오늘 계획대로 되지 않았나요?</p>
              <h2 id="recovery-title">괜찮아요, 다시 시작하면 돼요.</h2>
              <span>
                {home.recoveryCard.suggestedAction ??
                  "완벽하지 않아도, 다시 하는 것만으로도 충분해요."}
              </span>
            </div>
            <NavLink className={styles.recoveryLink} to="/reflection">
              복귀 루틴 보기
              <span aria-hidden="true">
                <DashboardIcon type="chevron" />
              </span>
            </NavLink>
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
                <strong>{home.focusSessions.sessions.length}회</strong>
                <small>목표 5회</small>
                <div className={styles.progressLine} aria-hidden="true">
                  <span
                    style={{
                      width: `${Math.min(
                        100,
                        home.focusSessions.sessions.length * 20,
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
        </main>
      </div>
    </section>
  );
}
