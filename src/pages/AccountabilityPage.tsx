import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";

import characterDefault from "../assets/auth/character-default.webp";
import {
  createAccountabilityRelation,
  disconnectWatcher,
  disconnectWatching,
  getAccountabilityFriends,
  getInviteCodeStatus,
  getWatcherDateSummary,
  getWatcherRangeSummary,
  joinAccountabilityRelation,
  reissueInviteCode,
  updateVisibilityPolicy,
} from "../features/accountability/api";
import type {
  AccountabilityRelation,
  MonitoringTarget,
  SummaryMode,
  SummaryTarget,
  WatcherSummary,
} from "../features/accountability/types";
import { recordAnalyticsEventSafely } from "../features/analytics/api";
import { useAuth } from "../features/auth/useAuth";
import { AppSidebar } from "../features/core-loop/AppSidebar";
import { getErrorMessage } from "../shared/api/errors";
import { queryKeys } from "../shared/queryKeys";
import { PageHeader } from "../shared/ui/PageHeader";
import { useToast } from "../shared/ui/useToast";
import styles from "./AccountabilityPage.module.css";

type AccountabilityView = "overview" | "share" | "watch";

const actionToastVisibleMs = 3000;
const actionToastFadeMs = 220;

type SummaryRequest =
  | {
      date: string;
      mode: "date";
      target: MonitoringTarget;
    }
  | {
      from: string;
      mode: "range";
      target: MonitoringTarget;
      to: string;
    };

const monitoringTargets: MonitoringTarget[] = [
  "FOCUS_SESSION",
  "TOP_PICKS",
  "TIMETABLE_TASK",
];

const targetLabels: Record<MonitoringTarget, string> = {
  FOCUS_SESSION: "집중 기록",
  TIMETABLE_TASK: "시간표",
  TOP_PICKS: "TopPick",
};

const summaryTargets: Record<MonitoringTarget, SummaryTarget> = {
  FOCUS_SESSION: "focus-sessions",
  TIMETABLE_TASK: "timetable-tasks",
  TOP_PICKS: "top-picks",
};

const viewNavItems: {
  label: string;
  to: string;
  view: AccountabilityView;
}[] = [
  {
    label: "홈",
    to: "/accountability",
    view: "overview",
  },
  {
    label: "내 공유",
    to: "/accountability/share",
    view: "share",
  },
  {
    label: "친구 보기",
    to: "/accountability/watch",
    view: "watch",
  },
];

const summaryKeyLabels: Record<string, string> = {
  completed: "완료 여부",
  completedCount: "완료 수",
  completedTopPickCount: "완료한 TopPick 수",
  content: "내용",
  count: "개수",
  date: "날짜",
  days: "일별 요약",
  durationSeconds: "진행 시간(초)",
  endedAt: "종료 시간",
  focusSessionCount: "집중 기록 수",
  memo: "메모",
  status: "상태",
  startedAt: "시작 시간",
  targetDate: "조회 날짜",
  task: "작업",
  timetableTasks: "시간표 항목",
  title: "제목",
  topPicks: "TopPick",
  totalFocusMinutes: "총 집중 시간(분)",
  totalFocusSeconds: "총 집중 시간(초)",
  totalTopPickCount: "TopPick 수",
};

const emptyRelations: AccountabilityRelation[] = [];

function getTodayInputDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getAccountabilityView(pathname: string): AccountabilityView | null {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/accountability";

  if (normalizedPath === "/accountability" || normalizedPath === "/accountability/join") {
    return "overview";
  }

  if (normalizedPath === "/accountability/share") {
    return "share";
  }

  if (normalizedPath === "/accountability/watch") {
    return "watch";
  }

  return null;
}

function areSummaryRequestsEqual(
  first: SummaryRequest | null,
  second: SummaryRequest | null,
) {
  if (!first || !second || first.mode !== second.mode || first.target !== second.target) {
    return first === second;
  }

  if (first.mode === "date" && second.mode === "date") {
    return first.date === second.date;
  }

  if (first.mode === "range" && second.mode === "range") {
    return first.from === second.from && first.to === second.to;
  }

  return false;
}

function getRelationStatusText(relation: AccountabilityRelation | null) {
  if (!relation) {
    return "연결 전";
  }

  return relation.watcherConnected ? "연결됨" : "초대 대기";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "없음";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}

function formatTargets(targets: MonitoringTarget[]) {
  if (targets.length === 0) {
    return "선택 없음";
  }

  return targets.map((target) => targetLabels[target]).join(", ");
}

function formatSummaryLabel(key: string) {
  if (summaryKeyLabels[key]) {
    return summaryKeyLabels[key];
  }

  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .trim();
}

function formatSummaryValue(value: unknown): string {
  const sanitizedValue = sanitizeSummaryValue(value);

  if (sanitizedValue === undefined) {
    return "숨김";
  }

  return formatSanitizedSummaryValue(sanitizedValue);
}

function formatSanitizedSummaryValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "없음";
  }

  if (typeof value === "boolean") {
    return value ? "예" : "아니오";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatSanitizedSummaryValue(item)).join(" / ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(
        ([key, nestedValue]) =>
          `${formatSummaryLabel(key)}: ${formatSanitizedSummaryValue(nestedValue)}`,
      )
      .join(", ");
  }

  return "표시할 수 없는 값";
}

function isSensitiveIdentifierKey(key: string) {
  const normalizedKey = key.toLowerCase();
  const idLikeSuffix =
    normalizedKey.endsWith("id") &&
    normalizedKey !== "valid" &&
    normalizedKey !== "invalid";

  return (
    normalizedKey === "id" ||
    idLikeSuffix ||
    normalizedKey.endsWith("ids") ||
    normalizedKey.includes("uuid") ||
    normalizedKey.includes("token") ||
    normalizedKey.includes("code")
  );
}

function sanitizeSummaryValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => sanitizeSummaryValue(item))
      .filter((item) => item !== undefined);

    return items.length > 0 ? items : undefined;
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
      .filter(([key]) => !isSensitiveIdentifierKey(key))
      .map(([key, nestedValue]) => [key, sanitizeSummaryValue(nestedValue)] as const)
      .filter(([, nestedValue]) => nestedValue !== undefined);

    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  return value;
}

function getSummaryEntries(summary: WatcherSummary) {
  return Object.entries(summary).filter(
    ([key, value]) =>
      !isSensitiveIdentifierKey(key) && sanitizeSummaryValue(value) !== undefined,
  );
}

function SummaryDetails({ summary }: { summary: WatcherSummary }) {
  const entries = getSummaryEntries(summary);

  if (entries.length === 0) {
    return <p className={styles.emptyText}>표시할 요약 항목이 없습니다.</p>;
  }

  return (
    <dl className={styles.summaryList}>
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt>{formatSummaryLabel(key)}</dt>
          <dd>{formatSummaryValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AccountabilityPage() {
  const { accessToken, logout } = useAuth();
  const token = accessToken ?? "";
  const location = useLocation();
  const navigate = useNavigate();
  const activeView = getAccountabilityView(location.pathname);
  const queryClient = useQueryClient();
  const [selectedTargets, setSelectedTargets] = useState<MonitoringTarget[]>([
    "FOCUS_SESSION",
  ]);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteCodeModalOpen, setInviteCodeModalOpen] = useState(false);
  const [shareInviteModalOpen, setShareInviteModalOpen] = useState(false);
  const [summaryTarget, setSummaryTarget] =
    useState<MonitoringTarget>("FOCUS_SESSION");
  const [summaryMode, setSummaryMode] = useState<SummaryMode>("date");
  const [summaryDate, setSummaryDate] = useState(getTodayInputDate);
  const [summaryFrom, setSummaryFrom] = useState(getTodayInputDate);
  const [summaryTo, setSummaryTo] = useState(getTodayInputDate);
  const [summaryRequest, setSummaryRequest] = useState<SummaryRequest | null>(
    null,
  );
  const { actionError, actionNotice, setActionError, setActionNotice, toastLeaving } =
    useToast({ visibleMs: actionToastVisibleMs, fadeMs: actionToastFadeMs });

  const friendsKey = queryKeys.accountabilityFriends();
  const inviteStatusKey = queryKeys.accountabilityInviteCodeStatus();
  const summariesKey = queryKeys.accountabilityWatcherSummaries();
  const homeTodayKey = queryKeys.homeToday();

  const friendsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: ({ signal }) => getAccountabilityFriends({ signal, token }),
    queryKey: friendsKey,
  });

  const watchedByFriends =
    friendsQuery.data?.watchedByFriends ?? emptyRelations;
  const watchingFriends = friendsQuery.data?.watchingFriends ?? emptyRelations;
  const subjectRelation = watchedByFriends[0] ?? null;
  const watchingRelation = watchingFriends[0] ?? null;
  const hasWatchingFriends = watchingFriends.length > 0;
  const allowedSummaryTargets = useMemo(
    () => watchingRelation?.allowedTargets ?? [],
    [watchingRelation?.allowedTargets],
  );
  const blockedSummaryTargets = monitoringTargets.filter(
    (target) => !allowedSummaryTargets.includes(target),
  );
  const summaryTargetAllowed = allowedSummaryTargets.includes(summaryTarget);
  const currentSummaryRequest = useMemo<SummaryRequest | null>(() => {
    if (!summaryTargetAllowed) {
      return null;
    }

    if (summaryMode === "date") {
      return summaryDate
        ? {
            date: summaryDate,
            mode: "date",
            target: summaryTarget,
          }
        : null;
    }

    if (!summaryFrom || !summaryTo || summaryFrom > summaryTo) {
      return null;
    }

    return {
      from: summaryFrom,
      mode: "range",
      target: summaryTarget,
      to: summaryTo,
    };
  }, [
    summaryDate,
    summaryFrom,
    summaryMode,
    summaryTarget,
    summaryTargetAllowed,
    summaryTo,
  ]);

  const inviteStatusQuery = useQuery({
    enabled: Boolean(token && subjectRelation),
    queryFn: ({ signal }) => getInviteCodeStatus({ signal, token }),
    queryKey: inviteStatusKey,
  });

  useEffect(() => {
    if (subjectRelation?.allowedTargets.length) {
      setSelectedTargets(subjectRelation.allowedTargets);
    }
  }, [subjectRelation]);

  useEffect(() => {
    if (!watchingRelation || allowedSummaryTargets.includes(summaryTarget)) {
      return;
    }

    const firstAllowedTarget = allowedSummaryTargets[0];
    if (firstAllowedTarget) {
      setSummaryTarget(firstAllowedTarget);
    }
  }, [allowedSummaryTargets, summaryTarget, watchingRelation]);

  useEffect(() => {
    if (!watchingRelation || !currentSummaryRequest) {
      return;
    }

    if (currentSummaryRequest.mode !== "date") {
      return;
    }

    setSummaryRequest((current) =>
      areSummaryRequestsEqual(current, currentSummaryRequest)
        ? current
        : currentSummaryRequest,
    );
  }, [currentSummaryRequest, watchingRelation]);

  useEffect(() => {
    if (location.pathname !== "/accountability/join" || !friendsQuery.isSuccess) {
      return;
    }

    navigate("/accountability", { replace: true });
    if (!hasWatchingFriends) {
      setInviteCodeModalOpen(true);
    }
  }, [friendsQuery.isSuccess, hasWatchingFriends, location.pathname, navigate]);

  const summaryKey = useMemo(() => {
    if (!summaryRequest) {
      return summariesKey;
    }

    const target = summaryTargets[summaryRequest.target];

    return summaryRequest.mode === "date"
      ? queryKeys.accountabilityWatcherSummary(target, {
          date: summaryRequest.date,
          mode: "date",
        })
      : queryKeys.accountabilityWatcherSummary(target, {
          from: summaryRequest.from,
          mode: "range",
          to: summaryRequest.to,
        });
  }, [summariesKey, summaryRequest]);

  const summaryQuery = useQuery({
    enabled: Boolean(
      token &&
        watchingRelation &&
        summaryRequest &&
        allowedSummaryTargets.includes(summaryRequest.target),
    ),
    queryFn: ({ signal }) => {
      if (!summaryRequest) {
        return Promise.resolve(undefined);
      }

      const target = summaryTargets[summaryRequest.target];

      return summaryRequest.mode === "date"
        ? getWatcherDateSummary({
            date: summaryRequest.date,
            signal,
            target,
            token,
          })
        : getWatcherRangeSummary({
            from: summaryRequest.from,
            signal,
            target,
            to: summaryRequest.to,
            token,
          });
    },
    queryKey: summaryKey,
  });

  async function refreshAccountability() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: friendsKey }),
      queryClient.invalidateQueries({ queryKey: inviteStatusKey }),
      queryClient.invalidateQueries({ queryKey: homeTodayKey }),
      queryClient.invalidateQueries({ queryKey: summariesKey }),
    ]);
  }

  const createRelationMutation = useMutation({
    mutationFn: (targets: MonitoringTarget[]) =>
      createAccountabilityRelation({ targets, token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async (_response, targets) => {
      setActionError(null);
      setActionNotice("공유 관계를 만들었어요. 홈에서 초대 코드를 확인해 주세요.");
      await recordAnalyticsEventSafely({
        eventType: "ACCOUNTABILITY_INVITE_SENT",
        properties: { targets },
        token,
      });
      await refreshAccountability();
    },
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: (targets: MonitoringTarget[]) =>
      updateVisibilityPolicy({ targets, token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("공개 범위를 수정했어요.");
      await refreshAccountability();
    },
  });

  const reissueInviteMutation = useMutation({
    mutationFn: () => reissueInviteCode({ token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("초대 코드를 다시 발급했어요.");
      await recordAnalyticsEventSafely({
        eventType: "ACCOUNTABILITY_INVITE_SENT",
        properties: { targets: selectedTargets },
        token,
      });
      await refreshAccountability();
    },
  });

  const joinRelationMutation = useMutation({
    mutationFn: (code: string) =>
      joinAccountabilityRelation({ inviteCode: code, token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("친구 동행 참여가 완료됐어요.");
      setInviteCode("");
      setInviteCodeModalOpen(false);
      await recordAnalyticsEventSafely({
        eventType: "ACCOUNTABILITY_FRIEND_JOINED",
        properties: { targets: allowedSummaryTargets },
        token,
      });
      await refreshAccountability();
      navigate("/accountability/watch");
    },
  });

  const disconnectWatcherMutation = useMutation({
    mutationFn: () => disconnectWatcher({ token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("연결된 친구를 해제했어요.");
      await refreshAccountability();
    },
  });

  const disconnectWatchingMutation = useMutation({
    mutationFn: () => disconnectWatching({ token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("보는 관계를 해제했어요.");
      setSummaryRequest(null);
      await refreshAccountability();
    },
  });

  function openInviteCodeModal() {
    setActionError(null);
    setActionNotice(null);
    setInviteCodeModalOpen(true);
  }

  function closeInviteCodeModal() {
    setInviteCodeModalOpen(false);
    setInviteCode("");
    setActionError(null);
  }

  function openShareInviteModal() {
    if (!subjectRelation) {
      setActionNotice(null);
      setActionError("먼저 내 진행 공유를 시작해 주세요.");
      return;
    }

    setActionError(null);
    setActionNotice(null);
    setShareInviteModalOpen(true);
  }

  function closeShareInviteModal() {
    setShareInviteModalOpen(false);
    setActionError(null);
  }

  function toggleTarget(target: MonitoringTarget) {
    setSelectedTargets((current) =>
      current.includes(target)
        ? current.filter((item) => item !== target)
        : [...current, target],
    );
  }

  function submitTargets(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedTargets.length === 0) {
      setActionNotice(null);
      setActionError("공개할 범위를 하나 이상 선택해 주세요.");
      return;
    }

    if (subjectRelation) {
      updateVisibilityMutation.mutate(selectedTargets);
      return;
    }

    createRelationMutation.mutate(selectedTargets);
  }

  function submitInviteCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = inviteCode.trim();

    if (!code) {
      setActionNotice(null);
      setActionError("친구 초대 코드를 입력해 주세요.");
      return;
    }

    joinRelationMutation.mutate(code);
  }

  function submitSummary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!watchingRelation) {
      setActionNotice(null);
      setActionError("먼저 친구 초대 코드로 참여해 주세요.");
      return;
    }

    if (!summaryTargetAllowed) {
      setActionNotice(null);
      setActionError("친구가 공개하지 않은 요약입니다.");
      return;
    }

    if (summaryMode === "date" && !summaryDate) {
      setActionNotice(null);
      setActionError("조회 날짜를 선택해 주세요.");
      return;
    }

    if (summaryMode === "range") {
      if (!summaryFrom || !summaryTo) {
        setActionNotice(null);
        setActionError("조회 기간을 선택해 주세요.");
        return;
      }

      if (summaryFrom > summaryTo) {
        setActionNotice(null);
        setActionError("시작 날짜는 종료 날짜보다 늦을 수 없습니다.");
        return;
      }
    }

    setActionError(null);
    setSummaryRequest(currentSummaryRequest);
  }

  function selectSummaryTarget(target: MonitoringTarget) {
    setSummaryTarget(target);
    setSummaryRequest(null);
  }

  function selectSummaryMode(mode: SummaryMode) {
    setSummaryMode(mode);
    setSummaryRequest(null);
  }

  if (friendsQuery.isLoading) {
    return (
      <section
        className={styles.accountabilityPage}
        aria-labelledby="accountability-title"
      >
        <AppSidebar
          friendText="친구 동행 정보를 불러오는 중입니다."
          onLogout={logout}
          profileSubtitle="친구 동행"
        />
        <div className={styles.contentShell}>
          <section className={styles.centerState} aria-live="polite">
            <img src={characterDefault} alt="" aria-hidden="true" />
            <h1 id="accountability-title">
              친구 동행 정보를 불러오는 중입니다.
            </h1>
          </section>
        </div>
      </section>
    );
  }

  if (friendsQuery.isError) {
    return (
      <section
        className={styles.accountabilityPage}
        aria-labelledby="accountability-title"
      >
        <AppSidebar
          friendText="친구 동행 정보를 다시 확인해 주세요."
          onLogout={logout}
          profileSubtitle="친구 동행"
        />
        <div className={styles.contentShell}>
          <section className={styles.centerState} aria-live="assertive">
            <img src={characterDefault} alt="" aria-hidden="true" />
            <h1 id="accountability-title">
              친구 동행 정보를 불러오지 못했어요.
            </h1>
            <p>{getErrorMessage(friendsQuery.error)}</p>
            <button onClick={() => friendsQuery.refetch()} type="button">
              다시 시도
            </button>
          </section>
        </div>
      </section>
    );
  }

  if (!activeView) {
    return <Navigate replace to="/accountability" />;
  }

  const inviteStatus = inviteStatusQuery.data;
  const inviteStatusError =
    inviteStatusQuery.isError && subjectRelation
      ? getErrorMessage(inviteStatusQuery.error)
      : null;
  const inviteStatusText = inviteStatus
    ? inviteStatus.expired
      ? "만료됨"
      : "사용 가능"
    : subjectRelation
      ? "확인 중"
      : "공유 시작 후 표시";
  const overviewPrimaryCta = hasWatchingFriends
    ? { label: "친구 진행 보기", to: "/accountability/watch" }
    : subjectRelation
      ? { label: "내 공유 관리", to: "/accountability/share" }
      : { label: "내 진행 공유 시작", to: "/accountability/share" };
  const overviewHeadline = hasWatchingFriends
    ? "연결된 친구의 진행을 확인할 수 있어요."
    : subjectRelation
      ? "초대 코드와 공개 범위를 관리하세요."
      : "내 진행을 공유하거나 친구 코드로 참여하세요.";

  return (
    <section
      className={styles.accountabilityPage}
      aria-labelledby="accountability-title"
    >
      <AppSidebar
        friendText={getRelationStatusText(subjectRelation)}
        onLogout={logout}
        profileSubtitle={getRelationStatusText(watchingRelation)}
      />

      <div className={styles.contentShell}>
        <PageHeader
          className={styles.pageHeader}
          eyebrow="Accountability"
          title="친구 동행"
          titleId="accountability-title"
        />

        <nav className={styles.routeTabs} aria-label="친구 동행 화면">
          {viewNavItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                isActive ? styles.activeRouteTab : styles.routeTab
              }
              end={item.view === "overview"}
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {actionError && !inviteCodeModalOpen && !shareInviteModalOpen ? (
          <p
            className={`${styles.error} ${toastLeaving ? styles.toastLeaving : ""}`}
            role="alert"
          >
            {actionError}
          </p>
        ) : null}
        {actionNotice ? (
          <p
            className={`${styles.success} ${
              toastLeaving ? styles.toastLeaving : ""
            }`}
            role="status"
          >
            {actionNotice}
          </p>
        ) : null}

        <main className={styles.pageBody}>
          {activeView === "overview" ? (
            <section className={styles.homeView} aria-labelledby="overview-title">
              <div className={styles.homeLead}>
                <div className={styles.homeLeadCopy}>
                  <span className={styles.sectionLabel}>오늘 할 일</span>
                  <h2 id="overview-title">{overviewHeadline}</h2>
                  <p>
                    필요한 진행만 선택해서 공유하고, 연결 상태를 가볍게 확인해요.
                  </p>
                  <ul className={styles.homeHighlights} aria-label="친구 동행 핵심 상태">
                    <li>선택 공유</li>
                    <li>친구 연결</li>
                    <li>요약 확인</li>
                  </ul>
                  <div className={styles.homeActions}>
                    <NavLink className={styles.primaryButtonLink} to={overviewPrimaryCta.to}>
                      {overviewPrimaryCta.label}
                    </NavLink>
                    {subjectRelation ? (
                      <button
                        className={styles.secondaryButton}
                        onClick={openShareInviteModal}
                        type="button"
                      >
                        초대 코드 조회/생성
                      </button>
                    ) : null}
                    {!hasWatchingFriends ? (
                      <button
                        className={styles.secondaryButton}
                        onClick={openInviteCodeModal}
                        type="button"
                      >
                        친구 코드 입력
                      </button>
                    ) : null}
                  </div>
                </div>
                <img
                  className={styles.homeLeadArt}
                  src={characterDefault}
                  alt=""
                  aria-hidden="true"
                />
              </div>

              <section
                className={styles.homeStatus}
                aria-labelledby="home-status-title"
              >
                <h3 id="home-status-title">현재 공유 상태</h3>
                <dl className={styles.statusTable} aria-label="현재 공유 상태">
                  <div>
                    <dt>공유 허용 범위</dt>
                    <dd>{formatTargets(subjectRelation?.allowedTargets ?? [])}</dd>
                  </div>
                  <div>
                    <dt>나를 보는 친구</dt>
                    <dd>
                      {subjectRelation?.watcherConnected
                        ? "연결됨"
                        : subjectRelation
                          ? "아직 없음"
                          : "공유 시작 전"}
                    </dd>
                    {subjectRelation?.watcherConnected ? (
                      <dd>
                        <button
                          disabled={disconnectWatcherMutation.isPending}
                          onClick={() => disconnectWatcherMutation.mutate()}
                          type="button"
                        >
                          보는 친구 해제
                        </button>
                      </dd>
                    ) : null}
                  </div>
                  <div>
                    <dt>내가 보는 친구</dt>
                    <dd>
                      {hasWatchingFriends
                        ? formatTargets(watchingRelation?.allowedTargets ?? [])
                        : "연결 전"}
                    </dd>
                  </div>
                </dl>
              </section>
            </section>
          ) : null}

          {activeView === "share" ? (
            <section className={styles.shareView} aria-labelledby="share-title">
              <header className={styles.viewHeader}>
                <div>
                  <span className={styles.sectionLabel}>내 공유</span>
                  <h2 id="share-title">공개 범위</h2>
                </div>
                <dl className={styles.statusInline} aria-label="내 공유 상태">
                  <div>
                    <dt>상태</dt>
                    <dd>{getRelationStatusText(subjectRelation)}</dd>
                  </div>
                  <div>
                    <dt>공개</dt>
                    <dd>{formatTargets(subjectRelation?.allowedTargets ?? [])}</dd>
                  </div>
                </dl>
              </header>

              <div className={styles.shareGrid}>
                <form className={styles.shareForm} onSubmit={submitTargets}>
                  <fieldset className={styles.scopeList}>
                    <legend>친구에게 보여줄 요약</legend>
                    {monitoringTargets.map((target) => (
                      <label className={styles.scopeRow} key={target}>
                        <span>{targetLabels[target]}</span>
                        <input
                          checked={selectedTargets.includes(target)}
                          onChange={() => toggleTarget(target)}
                          type="checkbox"
                        />
                      </label>
                    ))}
                  </fieldset>
                  <button
                    className={styles.primaryButton}
                    disabled={
                      createRelationMutation.isPending ||
                      updateVisibilityMutation.isPending
                    }
                    type="submit"
                  >
                    {subjectRelation ? "공개 범위 저장" : "공유 시작"}
                  </button>
                </form>
              </div>
            </section>
          ) : null}

          {activeView === "watch" ? (
            <section className={styles.watchView} aria-labelledby="watching-title">
              <header className={styles.viewHeader}>
                <div>
                  <span className={styles.sectionLabel}>친구 보기</span>
                  <h2 id="watching-title">친구 진행 보기</h2>
                </div>
                <strong className={styles.connectionCount}>
                  {watchingFriends.length}명 연결
                </strong>
              </header>

              {watchingFriends.length === 0 ? (
                <section className={styles.watchEmpty} aria-live="polite">
                  <div>
                    <span className={styles.sectionLabel}>연결 전</span>
                    <strong>아직 연결된 친구가 없어요.</strong>
                  </div>
                  <p>친구 코드를 입력하면 허용된 진행 요약만 조회할 수 있어요.</p>
                  {!hasWatchingFriends ? (
                    <button
                      className={styles.secondaryButton}
                      onClick={openInviteCodeModal}
                      type="button"
                    >
                      친구 코드 입력
                    </button>
                  ) : null}
                </section>
              ) : (
                <div className={styles.watchWorkspace}>
                  <aside
                    className={styles.watchRail}
                    aria-labelledby="watch-connection-title"
                  >
                    <div className={styles.railHeader}>
                      <span className={styles.sectionLabel}>연결 상태</span>
                      <h3 id="watch-connection-title">내가 보는 친구</h3>
                    </div>
                    <ul className={styles.friendRows}>
                      {watchingFriends.map((relation, index) => (
                        <li key={relation.accountabilityRelationId}>
                          <div>
                            <strong>연결된 친구 {index + 1}</strong>
                            <span>{formatTargets(relation.allowedTargets)}</span>
                          </div>
                          <button
                            disabled={disconnectWatchingMutation.isPending}
                            onClick={() => disconnectWatchingMutation.mutate()}
                            type="button"
                          >
                            해제
                          </button>
                        </li>
                      ))}
                    </ul>
                  </aside>

                  <section
                    className={styles.summaryArea}
                    aria-labelledby="summary-title"
                  >
                    <div className={styles.summaryHeader}>
                      <div>
                        <span className={styles.sectionLabel}>요약 조회</span>
                        <h2 id="summary-title">허용된 정보만 확인</h2>
                      </div>
                      {blockedSummaryTargets.length > 0 ? (
                        <p id="summary-privacy-note">미공개 항목</p>
                      ) : null}
                    </div>

                    <div className={styles.allowedStrip} aria-label="공개된 요약">
                      <span>공개된 요약</span>
                      <strong>{formatTargets(allowedSummaryTargets)}</strong>
                    </div>

                    <form className={styles.summaryControls} onSubmit={submitSummary}>
                      <div
                        className={styles.targetTabs}
                        role="group"
                        aria-label="요약 대상"
                      >
                        {monitoringTargets.map((target) => {
                          const allowed = allowedSummaryTargets.includes(target);

                          return (
                            <button
                              aria-describedby={
                                allowed ? undefined : "summary-privacy-note"
                              }
                              aria-label={targetLabels[target]}
                              aria-pressed={summaryTarget === target}
                              disabled={!allowed}
                              key={target}
                              onClick={() => selectSummaryTarget(target)}
                              type="button"
                            >
                              <span>{targetLabels[target]}</span>
                              <small>{allowed ? "공개됨" : "미공개"}</small>
                            </button>
                          );
                        })}
                      </div>

                      <div
                        className={styles.segmentedControl}
                        role="group"
                        aria-label="요약 조회 방식"
                      >
                        <button
                          aria-pressed={summaryMode === "date"}
                          onClick={() => selectSummaryMode("date")}
                          type="button"
                        >
                          하루
                        </button>
                        <button
                          aria-pressed={summaryMode === "range"}
                          onClick={() => selectSummaryMode("range")}
                          type="button"
                        >
                          기간
                        </button>
                      </div>

                      {summaryMode === "date" ? (
                        <label>
                          조회 날짜
                          <input
                            onChange={(event) => setSummaryDate(event.target.value)}
                            required
                            type="date"
                            value={summaryDate}
                          />
                        </label>
                      ) : (
                        <div className={styles.dateRange}>
                          <label>
                            시작 날짜
                            <input
                              onChange={(event) =>
                                setSummaryFrom(event.target.value)
                              }
                              required
                              type="date"
                              value={summaryFrom}
                            />
                          </label>
                          <label>
                            종료 날짜
                            <input
                              onChange={(event) => setSummaryTo(event.target.value)}
                              required
                              type="date"
                              value={summaryTo}
                            />
                          </label>
                        </div>
                      )}

                      <button
                        className={styles.primaryButton}
                        disabled={!summaryTargetAllowed || summaryQuery.isFetching}
                        type="submit"
                      >
                        요약 조회
                      </button>
                    </form>

                    <div className={styles.summaryResult} aria-live="polite">
                      {summaryQuery.isFetching ? (
                        <p className={styles.emptyText}>
                          친구 요약을 불러오는 중입니다.
                        </p>
                      ) : summaryQuery.isError ? (
                        <p className={styles.inlineError} role="alert">
                          {getErrorMessage(summaryQuery.error)}
                        </p>
                      ) : summaryQuery.data ? (
                        <SummaryDetails summary={summaryQuery.data} />
                      ) : (
                        <p className={styles.emptyText}>
                          요약 데이터가 없습니다.
                        </p>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </section>
          ) : null}
        </main>
      </div>

      {shareInviteModalOpen ? (
        <div className={styles.modalBackdrop}>
          <section
            aria-labelledby="share-invite-modal-title"
            aria-modal="true"
            className={styles.inviteModal}
            role="dialog"
          >
            <div className={styles.modalHeader}>
              <h2 id="share-invite-modal-title">초대 코드 조회/생성</h2>
              <button onClick={closeShareInviteModal} type="button">
                닫기
              </button>
            </div>
            <p className={styles.modalDescription}>
              이 코드를 친구에게 전달하면, 친구가 내가 허용한 진행 요약만 볼 수
              있어요.
            </p>
            {inviteStatusError || actionError ? (
              <p className={styles.inlineError} role="alert">
                {inviteStatusError ?? actionError}
              </p>
            ) : null}
            <div className={styles.codeLine} aria-live="polite">
              <span>{inviteStatusText}</span>
              <strong>{inviteStatus?.inviteCode ?? "공유 시작 후 표시"}</strong>
              <small>{formatDateTime(inviteStatus?.expiredAt ?? null)}</small>
            </div>
            <div className={styles.actionRow}>
              <button
                disabled={
                  !subjectRelation ||
                  !inviteStatus?.reissuable ||
                  Boolean(inviteStatus?.watcherConnected) ||
                  reissueInviteMutation.isPending
                }
                onClick={() => reissueInviteMutation.mutate()}
                type="button"
              >
                초대 코드 재생성
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {inviteCodeModalOpen && !hasWatchingFriends ? (
        <div className={styles.modalBackdrop}>
          <section
            aria-labelledby="invite-modal-title"
            aria-modal="true"
            className={styles.inviteModal}
            role="dialog"
          >
            <div className={styles.modalHeader}>
              <h2 id="invite-modal-title">친구 코드 입력</h2>
              <button onClick={closeInviteCodeModal} type="button">
                닫기
              </button>
            </div>
            <p className={styles.modalDescription}>
              이 코드를 입력하면 내가 감시자가 되어 친구가 허용한 진행 요약을
              볼 수 있어요.
            </p>
            {actionError ? (
              <p className={styles.inlineError} role="alert">
                {actionError}
              </p>
            ) : null}
            <form className={styles.form} onSubmit={submitInviteCode}>
              <label>
                친구 초대 코드
                <input
                  autoFocus
                  maxLength={10}
                  onChange={(event) => setInviteCode(event.target.value)}
                  placeholder="초대 코드 입력"
                  value={inviteCode}
                />
              </label>
              <button
                className={styles.primaryButton}
                disabled={joinRelationMutation.isPending}
                type="submit"
              >
                코드로 참여
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
