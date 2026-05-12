import { apiRequest } from "../../shared/api/client";

type AuthenticatedRequest = {
  token: string;
};

type TargetDateRequest = AuthenticatedRequest & {
  targetDate: string;
};

export type FocusStatisticsStatus = "FINAL" | "PARTIAL" | "FUTURE_EMPTY";

export type FocusStatisticsDataSource = "NONE" | "SUMMARY" | "RAW" | "MIXED";

export type FocusStatisticsSummary = {
  targetDate: string;
  queriedAt: string;
  periodStartDate: string;
  periodEndDate: string;
  dayCount: number;
  coveredDayCount: number;
  totalFocusSeconds: number;
  averageDailyFocusSeconds: number;
  status: FocusStatisticsStatus;
  dataSource: FocusStatisticsDataSource;
};

export type HourlyFocusBucket = {
  hourOfDay: number;
  focusSeconds: number;
};

export type TimeOfDayFocusStatistics = {
  targetDate: string;
  queriedAt: string;
  totalFocusSeconds: number;
  status: FocusStatisticsStatus;
  dataSource: FocusStatisticsDataSource;
  hourlyBuckets: HourlyFocusBucket[];
};

export type RecommendedFocusHour = {
  hourOfDay: number;
  averageFocusSeconds: number;
};

export type FocusTimingRecommendation = {
  targetDate: string;
  queriedAt: string;
  recommendedHours: RecommendedFocusHour[];
  reason: string;
  basedOnData: boolean;
};

function targetDateQuery(targetDate: string) {
  return `targetDate=${encodeURIComponent(targetDate)}`;
}

export function getDailyFocusStatistics({ targetDate, token }: TargetDateRequest) {
  return apiRequest<FocusStatisticsSummary>(
    `/focus-statistics/daily?${targetDateQuery(targetDate)}`,
    { token },
  );
}

export function getWeeklyFocusStatistics({ targetDate, token }: TargetDateRequest) {
  return apiRequest<FocusStatisticsSummary>(
    `/focus-statistics/weekly?${targetDateQuery(targetDate)}`,
    { token },
  );
}

export function getMonthlyFocusStatistics({
  targetDate,
  token,
}: TargetDateRequest) {
  return apiRequest<FocusStatisticsSummary>(
    `/focus-statistics/monthly?${targetDateQuery(targetDate)}`,
    { token },
  );
}

export function getTimeOfDayFocusStatistics({
  targetDate,
  token,
}: TargetDateRequest) {
  return apiRequest<TimeOfDayFocusStatistics>(
    `/focus-statistics/time-of-day?${targetDateQuery(targetDate)}`,
    { token },
  );
}

export function getFocusTimingRecommendation({ token }: AuthenticatedRequest) {
  return apiRequest<FocusTimingRecommendation>(
    "/focus-statistics/timing-recommendation",
    { token },
  );
}
