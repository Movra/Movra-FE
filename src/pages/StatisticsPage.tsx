import { useQuery } from "@tanstack/react-query";
import { type ChangeEvent, useEffect, useState } from "react";
import { Navigate, NavLink } from "react-router-dom";

import characterDefault from "../assets/auth/character-default.webp";
import characterFocus from "../assets/auth/character-focus.webp";
import { useAuth } from "../features/auth/useAuth";
import { AppSidebar } from "../features/core-loop/AppSidebar";
import { getHomeToday } from "../features/core-loop/api";
import {
  getFriendAccountabilityText,
  getNextExamLabel,
} from "../features/core-loop/displayUtils";
import type { NotificationPreference } from "../features/core-loop/types";
import {
  getDailyFocusStatistics,
  getFocusTimingRecommendation,
  getMonthlyFocusStatistics,
  getTimeOfDayFocusStatistics,
  getWeeklyFocusStatistics,
  type FocusStatisticsDataSource,
  type FocusStatisticsStatus,
  type FocusStatisticsSummary,
  type FocusTimingRecommendation,
  type HourlyFocusBucket,
  type RecommendedFocusHour,
  type TimeOfDayFocusStatistics,
} from "../features/statistics/api";
import { getErrorMessage } from "../shared/api/errors";
import { queryKeys } from "../shared/queryKeys";
import { PageHeader } from "../shared/ui/PageHeader";
import styles from "./StatisticsPage.module.css";

const homeTodayKey = queryKeys.homeToday();
const defaultSchoolStart = "08:00";
const defaultSchoolEnd = "15:00";

const statusLabels: Record<FocusStatisticsStatus, string> = {
  FINAL: "마감 완료",
  FUTURE_EMPTY: "예정 없음",
  PARTIAL: "진행 중",
};

const dataSourceLabels: Record<FocusStatisticsDataSource, string> = {
  MIXED: "요약+원본",
  NONE: "데이터 없음",
  RAW: "원본 기록",
  SUMMARY: "요약 기록",
};

type SummaryCardProps = {
  data?: FocusStatisticsSummary;
  isLoading: boolean;
  title: string;
};

type TimeOfDaySectionProps = {
  data?: TimeOfDayFocusStatistics;
  isLoading: boolean;
  recommendedHours: RecommendedFocusHour[];
};

type RecommendationSectionProps = {
  behaviorProfileHours: string;
  data?: FocusTimingRecommendation;
  fallbackReason: string;
  isLoading: boolean;
  notificationPreference: NotificationPreference | null;
};

function formatFocusDuration(seconds: number) {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}분`;
  }

  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}

function formatDateLabel(date: string) {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${year}.${month}.${day}`;
}

function formatPeriod(data: FocusStatisticsSummary) {
  if (data.periodStartDate === data.periodEndDate) {
    return formatDateLabel(data.periodStartDate);
  }

  return `${formatDateLabel(data.periodStartDate)} - ${formatDateLabel(
    data.periodEndDate,
  )}`;
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatHourRange(hour: number) {
  return `${formatHour(hour)} - ${formatHour((hour + 1) % 24)}`;
}

function getMinuteOfDay(time: string | undefined, fallback: string) {
  const [hour, minute] = (time ?? fallback).split(":").map(Number);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    const [fallbackHour, fallbackMinute] = fallback.split(":").map(Number);
    return fallbackHour * 60 + fallbackMinute;
  }

  return hour * 60 + minute;
}

function doRangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
) {
  return startA < endB && startB < endA;
}

function isHourInQuietRange(hour: number, startMinute: number, endMinute: number) {
  const bucketStart = hour * 60;
  const bucketEnd = bucketStart + 60;

  if (startMinute < endMinute) {
    return doRangesOverlap(bucketStart, bucketEnd, startMinute, endMinute);
  }

  return (
    doRangesOverlap(bucketStart, bucketEnd, startMinute, 24 * 60) ||
    doRangesOverlap(bucketStart, bucketEnd, 0, endMinute)
  );
}

function getSchoolQuietRange(preference: NotificationPreference | null) {
  if (preference?.schoolHoursQuietEnabled) {
    return {
      end: preference.schoolHoursEnd,
      start: preference.schoolHoursStart,
    };
  }

  return {
    end: defaultSchoolEnd,
    start: defaultSchoolStart,
  };
}

function isPolicyConflict(
  hour: number,
  preference: NotificationPreference | null,
) {
  if (hour >= 22) {
    return true;
  }

  const schoolRange = getSchoolQuietRange(preference);
  return isHourInQuietRange(
    hour,
    getMinuteOfDay(schoolRange.start, defaultSchoolStart),
    getMinuteOfDay(schoolRange.end, defaultSchoolEnd),
  );
}

function getPolicyLabel(preference: NotificationPreference | null) {
  const schoolRange = getSchoolQuietRange(preference);
  return `학교 시간 ${schoolRange.start}-${schoolRange.end}, 22시 이후 추천은 숨겨요.`;
}

function getVisibleRecommendations(
  recommendation: FocusTimingRecommendation | undefined,
  preference: NotificationPreference | null,
) {
  return (recommendation?.recommendedHours ?? []).filter(
    (hour) => !isPolicyConflict(hour.hourOfDay, preference),
  );
}

function getBehaviorProfileHours(startHour?: number, endHour?: number) {
  if (startHour === undefined || endHour === undefined) {
    return "선호 시간 없음";
  }

  return `${formatHour(startHour)} - ${formatHour(endHour)}`;
}

function getTopBucket(data?: TimeOfDayFocusStatistics) {
  const buckets = (data?.hourlyBuckets ?? []).filter(
    (bucket) => bucket.focusSeconds > 0,
  );

  return buckets.reduce<HourlyFocusBucket | null>((topBucket, bucket) => {
    if (!topBucket || bucket.focusSeconds > topBucket.focusSeconds) {
      return bucket;
    }

    return topBucket;
  }, null);
}

function getVisibleHours(buckets: HourlyFocusBucket[]) {
  const studyHours = Array.from({ length: 18 }, (_, index) => index + 6);
  const extraRecordedHours = buckets
    .filter((bucket) => bucket.focusSeconds > 0)
    .map((bucket) => bucket.hourOfDay)
    .filter((hour) => hour < 6 || hour > 23);

  return [...new Set([...studyHours, ...extraRecordedHours])].sort(
    (left, right) => left - right,
  );
}

function getBarFillPercent(focusSeconds: number, maxFocusSeconds: number) {
  if (focusSeconds <= 0 || maxFocusSeconds <= 0) {
    return 0;
  }

  const ratio = focusSeconds / maxFocusSeconds;
  return Math.max(6, Math.min(100, Math.round(ratio * 100)));
}

function getInsightCopy({
  primaryRecommendation,
  topBucket,
}: {
  primaryRecommendation?: RecommendedFocusHour;
  topBucket: HourlyFocusBucket | null;
}) {
  if (primaryRecommendation) {
    return `${formatHourRange(
      primaryRecommendation.hourOfDay,
    )}에 다음 집중을 배치하면 최근 리듬과 가장 잘 맞아요.`;
  }

  if (topBucket) {
    return `오늘은 ${formatHourRange(
      topBucket.hourOfDay,
    )}에 가장 오래 집중했어요.`;
  }

  return "집중 세션을 조금만 더 쌓으면 나에게 맞는 시간대가 보이기 시작해요.";
}

function getFallbackRecommendationCopy({
  behaviorProfileHours,
  topBucket,
}: {
  behaviorProfileHours: string;
  topBucket: HourlyFocusBucket | null;
}) {
  if (topBucket) {
    return `${formatHourRange(
      topBucket.hourOfDay,
    )} 기록이 가장 길었습니다. 백엔드 추천 데이터가 없을 때는 이 시간대를 다음 집중 시작점으로 보는 편이 맞습니다.`;
  }

  return `백엔드 추천 데이터가 없으면 행동 프로필의 선호 시간대 ${behaviorProfileHours}를 시작 기준으로 안내합니다.`;
}

function SummaryCard({ data, isLoading, title }: SummaryCardProps) {
  if (isLoading) {
    return (
      <article className={styles.summaryCard} aria-busy="true">
        <span>{title}</span>
        <strong>불러오는 중</strong>
        <small>집중 통계를 확인하고 있어요.</small>
      </article>
    );
  }

  if (!data) {
    return (
      <article className={styles.summaryCard}>
        <span>{title}</span>
        <strong>확인 필요</strong>
        <small>통계를 불러오지 못했습니다.</small>
      </article>
    );
  }

  return (
    <article className={styles.summaryCard}>
      <header>
        <span>{title}</span>
        <em>{statusLabels[data.status]}</em>
      </header>
      <strong>{formatFocusDuration(data.totalFocusSeconds)}</strong>
      <small>{formatPeriod(data)}</small>
      <dl>
        <div>
          <dt>하루 평균</dt>
          <dd>{formatFocusDuration(data.averageDailyFocusSeconds)}</dd>
        </div>
        <div>
          <dt>기록 일수</dt>
          <dd>
            {data.coveredDayCount}/{data.dayCount}일
          </dd>
        </div>
      </dl>
      <span className={styles.sourceBadge}>{dataSourceLabels[data.dataSource]}</span>
    </article>
  );
}

function TimeOfDaySection({
  data,
  isLoading,
  recommendedHours,
}: TimeOfDaySectionProps) {
  const [viewMode, setViewMode] = useState<"list" | "chart">("list");

  if (isLoading) {
    return (
      <section className={styles.section} aria-busy="true">
        <h2>시간대별 집중 분포</h2>
        <p>시간대별 집중 기록을 불러오는 중입니다.</p>
      </section>
    );
  }

  const buckets = data?.hourlyBuckets ?? [];
  const bucketMap = new Map(
    buckets.map((bucket) => [bucket.hourOfDay, bucket.focusSeconds]),
  );
  const visibleHours = getVisibleHours(buckets);
  const maxFocusSeconds = Math.max(1, ...buckets.map((bucket) => bucket.focusSeconds));
  const recommendedHourSet = new Set(
    recommendedHours.map((hour) => hour.hourOfDay),
  );
  const hasRecordedBucket = buckets.some((bucket) => bucket.focusSeconds > 0);

  return (
    <section className={styles.section} aria-labelledby="time-of-day-title">
      <div className={styles.sectionHeader}>
        <div>
          <h2 id="time-of-day-title">시간대별 집중 분포</h2>
          <p>
            {data
              ? `${formatDateLabel(data.targetDate)} 기준 ${formatFocusDuration(
                  data.totalFocusSeconds,
                )}`
              : "기준일의 시간대별 집중 흐름"}
          </p>
        </div>
        <div className={styles.sectionActions}>
          {data ? <span>{dataSourceLabels[data.dataSource]}</span> : null}
          <div
            aria-label="시간대별 보기 방식"
            className={styles.viewToggle}
            role="tablist"
          >
            <button
              aria-selected={viewMode === "list"}
              className={viewMode === "list" ? styles.activeToggle : undefined}
              onClick={() => setViewMode("list")}
              role="tab"
              type="button"
            >
              리스트
            </button>
            <button
              aria-selected={viewMode === "chart"}
              className={viewMode === "chart" ? styles.activeToggle : undefined}
              onClick={() => setViewMode("chart")}
              role="tab"
              type="button"
            >
              막대 그래프
            </button>
          </div>
        </div>
      </div>

      {!hasRecordedBucket ? (
        <div className={styles.emptyState}>
          <strong>아직 시간대별 집중 기록이 없어요.</strong>
          <span>집중 세션을 마치면 어느 시간대에 몰입했는지 보여드릴게요.</span>
        </div>
      ) : viewMode === "chart" ? (
        <div className={styles.barChart} aria-label="시간대별 집중 막대 그래프">
          {visibleHours.map((hour) => {
            const focusSeconds = bucketMap.get(hour) ?? 0;
            const isRecommended = recommendedHourSet.has(hour);
            const height = getBarFillPercent(focusSeconds, maxFocusSeconds);

            return (
              <div
                className={isRecommended ? styles.recommendedBarColumn : styles.barColumn}
                key={hour}
              >
                <span>{formatFocusDuration(focusSeconds)}</span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <time>{formatHour(hour)}</time>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className={styles.hourlyGrid} aria-label="시간대별 집중 시간">
          {visibleHours.map((hour) => {
            const focusSeconds = bucketMap.get(hour) ?? 0;
            const isRecommended = recommendedHourSet.has(hour);
            const width = Math.round((focusSeconds / maxFocusSeconds) * 100);

            return (
              <li
                className={isRecommended ? styles.recommendedHour : undefined}
                key={hour}
              >
                <div>
                  <time>{formatHour(hour)}</time>
                  {isRecommended ? <em>추천</em> : null}
                </div>
                <span className={styles.hourlyBar} aria-hidden="true">
                  <span style={{ width: `${Math.max(focusSeconds > 0 ? 8 : 0, width)}%` }} />
                </span>
                <strong>{formatFocusDuration(focusSeconds)}</strong>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RecommendationItem({ hour }: { hour: RecommendedFocusHour }) {
  return (
    <li className={styles.recommendationItem}>
      <time>{formatHourRange(hour.hourOfDay)}</time>
      <span>평균 {formatFocusDuration(hour.averageFocusSeconds)}</span>
    </li>
  );
}

function RecommendationSection({
  behaviorProfileHours,
  data,
  fallbackReason,
  isLoading,
  notificationPreference,
}: RecommendationSectionProps) {
  if (isLoading) {
    return (
      <section className={styles.recommendationSection} aria-busy="true">
        <h2>추천 시간대</h2>
        <p>최근 집중 패턴을 바탕으로 추천을 계산하고 있습니다.</p>
      </section>
    );
  }

  const visibleRecommendations = getVisibleRecommendations(
    data,
    notificationPreference,
  );
  const hiddenPolicyConflictCount =
    (data?.recommendedHours.length ?? 0) - visibleRecommendations.length;
  const recommendationBasis = data?.basedOnData ? "최근 기록 기반" : "프로필 기반";
  const hasBackendRecommendation = Boolean(data);

  return (
    <section
      className={styles.recommendationSection}
      aria-labelledby="recommendation-title"
    >
      <div className={styles.recommendationCopy}>
        <span>{hasBackendRecommendation ? recommendationBasis : "로컬 대체 안내"}</span>
        <h2 id="recommendation-title">추천 시간대</h2>
        <p>{data?.reason ?? fallbackReason}</p>
        <small>{getPolicyLabel(notificationPreference)}</small>
      </div>

      {hasBackendRecommendation && visibleRecommendations.length > 0 ? (
        <ul
          aria-label="추천 시간대 목록"
          className={styles.recommendationList}
        >
          {visibleRecommendations.map((hour) => (
            <RecommendationItem hour={hour} key={hour.hourOfDay} />
          ))}
        </ul>
      ) : (
        <div className={styles.recommendationEmpty}>
          <strong>
            {hasBackendRecommendation
              ? hiddenPolicyConflictCount > 0
                ? "정책과 겹치는 추천은 숨겼어요."
                : "아직 추천할 시간대가 충분하지 않아요."
              : "백엔드 추천 데이터가 확인되지 않았습니다."}
          </strong>
          <span>현재 행동 프로필의 선호 시간대는 {behaviorProfileHours}입니다.</span>
        </div>
      )}

      {hasBackendRecommendation && hiddenPolicyConflictCount > 0 ? (
        <p className={styles.policyNote} role="status">
          학교 시간 또는 22시 이후와 겹친 {hiddenPolicyConflictCount}개 추천은 표시하지
          않았습니다.
        </p>
      ) : null}

      <NavLink className={styles.secondaryLink} to="/focus">
        Focus 페이지로 이동
      </NavLink>
    </section>
  );
}

export function StatisticsPage() {
  const { accessToken, logout } = useAuth();
  const token = accessToken ?? "";
  const [targetDate, setTargetDate] = useState("");

  const homeQuery = useQuery({
    enabled: Boolean(token),
    queryFn: ({ signal }) => getHomeToday({ signal, token }),
    queryKey: homeTodayKey,
  });

  useEffect(() => {
    if (homeQuery.data?.targetDate && targetDate === "") {
      setTargetDate(homeQuery.data.targetDate);
    }
  }, [homeQuery.data?.targetDate, targetDate]);

  const statsEnabled = Boolean(
    token && targetDate && homeQuery.data?.behaviorProfile,
  );

  const dailyQuery = useQuery({
    enabled: statsEnabled,
    queryFn: ({ signal }) => getDailyFocusStatistics({ signal, targetDate, token }),
    queryKey: queryKeys.focusStatisticsDaily(targetDate),
  });
  const weeklyQuery = useQuery({
    enabled: statsEnabled,
    queryFn: ({ signal }) => getWeeklyFocusStatistics({ signal, targetDate, token }),
    queryKey: queryKeys.focusStatisticsWeekly(targetDate),
  });
  const monthlyQuery = useQuery({
    enabled: statsEnabled,
    queryFn: ({ signal }) => getMonthlyFocusStatistics({ signal, targetDate, token }),
    queryKey: queryKeys.focusStatisticsMonthly(targetDate),
  });
  const timeOfDayQuery = useQuery({
    enabled: statsEnabled,
    queryFn: ({ signal }) => getTimeOfDayFocusStatistics({ signal, targetDate, token }),
    queryKey: queryKeys.focusStatisticsTimeOfDay(targetDate),
  });
  const recommendationQuery = useQuery({
    enabled: Boolean(token && homeQuery.data?.behaviorProfile),
    queryFn: ({ signal }) => getFocusTimingRecommendation({ signal, token }),
    queryKey: queryKeys.focusStatisticsTimingRecommendation(),
  });

  if (homeQuery.isLoading) {
    return (
      <section className={styles.centerState} aria-live="polite">
        <img src={characterDefault} alt="" aria-hidden="true" />
        <p>통계 화면을 불러오는 중입니다.</p>
      </section>
    );
  }

  if (homeQuery.isError) {
    return (
      <section className={styles.centerState} aria-live="assertive">
        <img src={characterDefault} alt="" aria-hidden="true" />
        <h1>통계 화면을 불러오지 못했습니다.</h1>
        <p>{getErrorMessage(homeQuery.error)}</p>
        <button onClick={() => homeQuery.refetch()} type="button">
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

  const statsError =
    dailyQuery.error ??
    weeklyQuery.error ??
    monthlyQuery.error ??
    timeOfDayQuery.error;
  const friendText = getFriendAccountabilityText(home.friendAccountability);
  const profileSubtitle = getNextExamLabel(home);
  const behaviorProfileHours = getBehaviorProfileHours(
    home.behaviorProfile?.preferredFocusStartHour,
    home.behaviorProfile?.preferredFocusEndHour,
  );
  const visibleRecommendations = getVisibleRecommendations(
    recommendationQuery.data,
    home.notificationPreference,
  );
  const topBucket = getTopBucket(timeOfDayQuery.data);
  const primaryRecommendation = visibleRecommendations[0];
  const dailyTotalSeconds = dailyQuery.data?.totalFocusSeconds ?? 0;
  const insightCopy = getInsightCopy({ primaryRecommendation, topBucket });
  const fallbackRecommendationReason = getFallbackRecommendationCopy({
    behaviorProfileHours,
    topBucket,
  });

  function handleTargetDateChange(event: ChangeEvent<HTMLInputElement>) {
    setTargetDate(event.target.value);
  }

  return (
    <section className={styles.page} aria-labelledby="statistics-title">
      <AppSidebar
        friendText={friendText}
        onLogout={logout}
        profileSubtitle={profileSubtitle}
      />

      <div className={styles.contentShell}>
        <PageHeader
          className={styles.pageHeader}
          description="순공 시간과 시간대 패턴으로 다음 집중 시간을 고릅니다."
          eyebrow="Focus Statistics"
          title="통계"
          titleId="statistics-title"
          actions={
            <label className={styles.dateField}>
              <span>기준일</span>
              <input
                onChange={handleTargetDateChange}
                type="date"
                value={targetDate}
              />
            </label>
          }
        />

        {statsError ? (
          <div className={styles.error} role="alert">
            <span>{getErrorMessage(statsError)}</span>
            <button
              onClick={() => {
                void dailyQuery.refetch();
                void weeklyQuery.refetch();
                void monthlyQuery.refetch();
                void timeOfDayQuery.refetch();
              }}
              type="button"
            >
              다시 시도
            </button>
          </div>
        ) : null}

        <section className={styles.insightDeck} aria-label="집중 통계 핵심 요약">
          <article className={styles.primaryInsight}>
            <div>
              <span>기준일 집중</span>
              <strong>{formatFocusDuration(dailyTotalSeconds)}</strong>
              <p>{insightCopy}</p>
              <div className={styles.insightMeta}>
                <em>{dailyQuery.data ? statusLabels[dailyQuery.data.status] : "확인 중"}</em>
                <em>선호 {behaviorProfileHours}</em>
              </div>
              <NavLink className={styles.primaryLink} to="/focus">
                Focus 시작하기
              </NavLink>
            </div>
            <img src={characterFocus} alt="" aria-hidden="true" />
          </article>

          <article className={styles.nextSlotCard}>
            <span>다음 추천</span>
            <strong>
              {primaryRecommendation
                ? formatHourRange(primaryRecommendation.hourOfDay)
                : topBucket
                  ? formatHourRange(topBucket.hourOfDay)
                  : "기록 대기"}
            </strong>
            <p>
              {primaryRecommendation
                ? `평균 ${formatFocusDuration(
                    primaryRecommendation.averageFocusSeconds,
                  )} 집중한 시간대입니다.`
                : "추천 API가 비어 있거나 없으면 최근 기록과 행동 프로필을 기준으로 안내합니다."}
            </p>
          </article>
        </section>

        <section className={styles.summaryGrid} aria-label="집중 기간 요약">
          <SummaryCard
            data={dailyQuery.data}
            isLoading={dailyQuery.isLoading}
            title="일간"
          />
          <SummaryCard
            data={weeklyQuery.data}
            isLoading={weeklyQuery.isLoading}
            title="주간"
          />
          <SummaryCard
            data={monthlyQuery.data}
            isLoading={monthlyQuery.isLoading}
            title="월간"
          />
        </section>

        <div className={styles.detailGrid}>
          <TimeOfDaySection
            data={timeOfDayQuery.data}
            isLoading={timeOfDayQuery.isLoading}
            recommendedHours={visibleRecommendations}
          />
          <RecommendationSection
            behaviorProfileHours={behaviorProfileHours}
            data={recommendationQuery.data}
            fallbackReason={fallbackRecommendationReason}
            isLoading={recommendationQuery.isLoading}
            notificationPreference={home.notificationPreference}
          />
        </div>
      </div>
    </section>
  );
}
