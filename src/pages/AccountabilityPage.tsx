import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import characterDefault from "../assets/auth/character-default.png";
import { useAuth } from "../features/auth/useAuth";
import { AppSidebar } from "../features/core-loop/AppSidebar";
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
import { getErrorMessage } from "../shared/api/errors";
import { queryKeys } from "../shared/queryKeys";
import { PageHeader } from "../shared/ui/PageHeader";
import styles from "./AccountabilityPage.module.css";

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

const emptyRelations: AccountabilityRelation[] = [];

function getTodayInputDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getRelationStatusText(relation: AccountabilityRelation | null) {
  if (!relation) {
    return "친구 연결 전";
  }

  return relation.watcherConnected ? "연결된 친구" : "친구 연결 대기 중";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "만료 정보 없음";
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
    return "공개 범위 없음";
  }

  return targets.map((target) => targetLabels[target]).join(", ");
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

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "표시할 수 없는 값";
  }
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
          <dt>{key}</dt>
          <dd>{formatSummaryValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AccountabilityPage() {
  const { accessToken, logout } = useAuth();
  const token = accessToken ?? "";
  const queryClient = useQueryClient();
  const [selectedTargets, setSelectedTargets] = useState<MonitoringTarget[]>([
    "FOCUS_SESSION",
  ]);
  const [inviteCode, setInviteCode] = useState("");
  const [summaryTarget, setSummaryTarget] =
    useState<MonitoringTarget>("FOCUS_SESSION");
  const [summaryMode, setSummaryMode] = useState<SummaryMode>("date");
  const [summaryDate, setSummaryDate] = useState(getTodayInputDate);
  const [summaryFrom, setSummaryFrom] = useState(getTodayInputDate);
  const [summaryTo, setSummaryTo] = useState(getTodayInputDate);
  const [summaryRequest, setSummaryRequest] = useState<SummaryRequest | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const friendsKey = queryKeys.accountabilityFriends();
  const inviteStatusKey = queryKeys.accountabilityInviteCodeStatus();
  const summariesKey = queryKeys.accountabilityWatcherSummaries();
  const homeTodayKey = queryKeys.homeToday();

  const friendsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getAccountabilityFriends({ token }),
    queryKey: friendsKey,
  });

  const watchedByFriends =
    friendsQuery.data?.watchedByFriends ?? emptyRelations;
  const watchingFriends = friendsQuery.data?.watchingFriends ?? emptyRelations;
  const subjectRelation = watchedByFriends[0] ?? null;
  const watchingRelation = watchingFriends[0] ?? null;
  const allowedSummaryTargets = useMemo(
    () => watchingRelation?.allowedTargets ?? [],
    [watchingRelation?.allowedTargets],
  );
  const summaryTargetAllowed = allowedSummaryTargets.includes(summaryTarget);

  const inviteStatusQuery = useQuery({
    enabled: Boolean(token && subjectRelation),
    queryFn: () => getInviteCodeStatus({ token }),
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
    enabled: Boolean(token && watchingRelation && summaryRequest),
    queryFn: () => {
      if (!summaryRequest) {
        return Promise.resolve(undefined);
      }

      const target = summaryTargets[summaryRequest.target];

      return summaryRequest.mode === "date"
        ? getWatcherDateSummary({
            date: summaryRequest.date,
            target,
            token,
          })
        : getWatcherRangeSummary({
            from: summaryRequest.from,
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
      setActionNotice("공유 관계를 만들었어요. 초대 코드를 확인해 주세요.");
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
      setActionNotice("친구 감시 참여가 완료됐어요.");
      setInviteCode("");
      await recordAnalyticsEventSafely({
        eventType: "ACCOUNTABILITY_FRIEND_JOINED",
        properties: { targets: allowedSummaryTargets },
        token,
      });
      await refreshAccountability();
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
      setActionNotice("보고 있던 친구 연결을 해제했어요.");
      setSummaryRequest(null);
      await refreshAccountability();
    },
  });

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
    setSummaryRequest(
      summaryMode === "date"
        ? {
            date: summaryDate,
            mode: "date",
            target: summaryTarget,
          }
        : {
            from: summaryFrom,
            mode: "range",
            target: summaryTarget,
            to: summaryTo,
          },
    );
  }

  if (friendsQuery.isLoading) {
    return (
      <section
        className={styles.accountabilityPage}
        aria-labelledby="accountability-title"
      >
        <AppSidebar
          friendText="친구 감시 정보를 불러오는 중입니다."
          onLogout={logout}
          profileSubtitle="친구 감시"
        />
        <div className={styles.contentShell}>
          <section className={styles.centerState} aria-live="polite">
            <img src={characterDefault} alt="" aria-hidden="true" />
            <h1 id="accountability-title">친구 감시 정보를 불러오는 중입니다.</h1>
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
          friendText="친구 감시 정보를 다시 확인해 주세요."
          onLogout={logout}
          profileSubtitle="친구 감시"
        />
        <div className={styles.contentShell}>
          <section className={styles.centerState} aria-live="assertive">
            <img src={characterDefault} alt="" aria-hidden="true" />
            <h1 id="accountability-title">친구 감시 정보를 불러오지 못했습니다.</h1>
            <p>{getErrorMessage(friendsQuery.error)}</p>
            <button onClick={() => friendsQuery.refetch()} type="button">
              다시 시도
            </button>
          </section>
        </div>
      </section>
    );
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
      ? "초대 코드 확인 중"
      : "관계 생성 후 발급";

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
          description="동의한 친구에게 선택한 진행 요약만 보여주고, 랭킹 없이 서로 확인해요."
          eyebrow="Accountability"
          title="친구 감시"
          titleId="accountability-title"
          actions={
            <div className={styles.headerStats} aria-label="친구 감시 요약">
              <article>
                <span>내 공유 상태</span>
                <strong>{getRelationStatusText(subjectRelation)}</strong>
              </article>
              <article>
                <span>내가 보는 친구</span>
                <strong>{watchingFriends.length > 0 ? "연결됨" : "없음"}</strong>
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

        <main className={styles.accountabilityGrid}>
          <section className={styles.panel} aria-labelledby="share-title">
            <div className={styles.panelHeader}>
              <div>
                <p>내 진행 공유</p>
                <h2 id="share-title">공개 범위와 초대 코드</h2>
              </div>
              <span className={styles.statusBadge}>
                {getRelationStatusText(subjectRelation)}
              </span>
            </div>

            <form className={styles.form} onSubmit={submitTargets}>
              <fieldset className={styles.checkboxGroup}>
                <legend>공개 범위</legend>
                {monitoringTargets.map((target) => (
                  <label key={target}>
                    <input
                      checked={selectedTargets.includes(target)}
                      onChange={() => toggleTarget(target)}
                      type="checkbox"
                    />
                    <span>{targetLabels[target]}</span>
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
                {subjectRelation ? "공개 범위 수정" : "공유 관계 만들기"}
              </button>
            </form>

            <div className={styles.inviteBox} aria-live="polite">
              <strong>초대 코드 상태</strong>
              {inviteStatusError ? (
                <p className={styles.inlineError}>{inviteStatusError}</p>
              ) : null}
              <dl>
                <div>
                  <dt>상태</dt>
                  <dd>{inviteStatusText}</dd>
                </div>
                <div>
                  <dt>초대 코드</dt>
                  <dd>{inviteStatus?.inviteCode ?? "아직 발급되지 않았습니다."}</dd>
                </div>
                <div>
                  <dt>만료 시간</dt>
                  <dd>{formatDateTime(inviteStatus?.expiredAt ?? null)}</dd>
                </div>
                <div>
                  <dt>공개 중인 요약</dt>
                  <dd>{formatTargets(subjectRelation?.allowedTargets ?? [])}</dd>
                </div>
              </dl>
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
                  초대 코드 재발급
                </button>
                <button
                  disabled={
                    !subjectRelation?.watcherConnected ||
                    disconnectWatcherMutation.isPending
                  }
                  onClick={() => disconnectWatcherMutation.mutate()}
                  type="button"
                >
                  연결된 친구 해제
                </button>
              </div>
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="join-title">
            <div className={styles.panelHeader}>
              <div>
                <p>친구 코드로 참여</p>
                <h2 id="join-title">친구 진행 보기</h2>
              </div>
            </div>
            <form className={styles.form} onSubmit={submitInviteCode}>
              <label>
                친구 초대 코드
                <input
                  maxLength={10}
                  onChange={(event) => setInviteCode(event.target.value)}
                  placeholder="초대 코드 입력"
                  value={inviteCode}
                />
              </label>
              <button
                className={styles.secondaryButton}
                disabled={joinRelationMutation.isPending}
                type="submit"
              >
                코드로 참여
              </button>
            </form>
          </section>

          <section className={styles.panel} aria-labelledby="watching-title">
            <div className={styles.panelHeader}>
              <div>
                <p>내가 보고 있는 친구</p>
                <h2 id="watching-title">연결 상태</h2>
              </div>
            </div>
            {watchingFriends.length === 0 ? (
              <p className={styles.emptyText}>보고 있는 친구가 없습니다.</p>
            ) : (
              <ul className={styles.relationList}>
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
                      보는 관계 해제
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.summaryPanel} aria-labelledby="summary-title">
            <div className={styles.panelHeader}>
              <div>
                <p>친구 요약 보기</p>
                <h2 id="summary-title">허용된 요약 조회</h2>
              </div>
            </div>

            {!watchingRelation ? (
              <p className={styles.emptyText}>
                친구 초대 코드로 참여하면 요약을 조회할 수 있습니다.
              </p>
            ) : (
              <>
                <div className={styles.targetTabs} role="group" aria-label="요약 대상">
                  {monitoringTargets.map((target) => {
                    const allowed = allowedSummaryTargets.includes(target);

                    return (
                      <button
                        aria-pressed={summaryTarget === target}
                        disabled={!allowed}
                        key={target}
                        onClick={() => setSummaryTarget(target)}
                        type="button"
                      >
                        {targetLabels[target]}
                      </button>
                    );
                  })}
                </div>

                <form className={styles.summaryForm} onSubmit={submitSummary}>
                  <div
                    className={styles.segmentedControl}
                    role="group"
                    aria-label="요약 조회 방식"
                  >
                    <button
                      aria-pressed={summaryMode === "date"}
                      onClick={() => setSummaryMode("date")}
                      type="button"
                    >
                      하루
                    </button>
                    <button
                      aria-pressed={summaryMode === "range"}
                      onClick={() => setSummaryMode("range")}
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
                          onChange={(event) => setSummaryFrom(event.target.value)}
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
                  {!summaryRequest ? (
                    <p className={styles.emptyText}>조회할 날짜를 선택해 주세요.</p>
                  ) : summaryQuery.isFetching ? (
                    <p className={styles.emptyText}>친구 요약을 불러오는 중입니다.</p>
                  ) : summaryQuery.isError ? (
                    <p className={styles.inlineError} role="alert">
                      {getErrorMessage(summaryQuery.error)}
                    </p>
                  ) : summaryQuery.data ? (
                    <SummaryDetails summary={summaryQuery.data} />
                  ) : (
                    <p className={styles.emptyText}>요약 데이터가 없습니다.</p>
                  )}
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </section>
  );
}
