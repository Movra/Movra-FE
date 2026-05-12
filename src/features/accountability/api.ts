import { apiRequest } from "../../shared/api/client";
import type {
  AccountabilityFriends,
  AccountabilityRelation,
  InviteCodeStatus,
  MonitoringTarget,
  ReissueInviteCodeResponse,
  SummaryTarget,
  WatcherSummary,
} from "./types";

type AuthenticatedRequest = {
  token: string;
};

type TargetsRequest = AuthenticatedRequest & {
  targets: MonitoringTarget[];
};

type InviteCodeRequest = AuthenticatedRequest & {
  inviteCode: string;
};

type DateSummaryRequest = AuthenticatedRequest & {
  date: string;
  target: SummaryTarget;
};

type RangeSummaryRequest = AuthenticatedRequest & {
  from: string;
  target: SummaryTarget;
  to: string;
};

function dateQuery(date: string) {
  return `date=${encodeURIComponent(date)}`;
}

function rangeQuery(from: string, to: string) {
  return `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}

function isRecord(value: unknown): value is WatcherSummary {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeWatcherSummary(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  return isRecord(value) ? value : null;
}

export function createAccountabilityRelation({
  targets,
  token,
}: TargetsRequest) {
  return apiRequest<void>("/accountability-relations", {
    body: { targets },
    method: "POST",
    token,
  });
}

export function joinAccountabilityRelation({
  inviteCode,
  token,
}: InviteCodeRequest) {
  return apiRequest<void>("/accountability-relations/join", {
    body: { inviteCode },
    method: "POST",
    token,
  });
}

export function reissueInviteCode({ token }: AuthenticatedRequest) {
  return apiRequest<ReissueInviteCodeResponse>(
    "/accountability-relations/invite-code/reissue",
    {
      method: "POST",
      token,
    },
  );
}

export function getInviteCodeStatus({ token }: AuthenticatedRequest) {
  return apiRequest<InviteCodeStatus>(
    "/accountability-relations/invite-code/status",
    { token },
  );
}

export function getAccountabilityFriends({ token }: AuthenticatedRequest) {
  return apiRequest<AccountabilityFriends>("/accountability-relations/friends", {
    token,
  });
}

export function updateVisibilityPolicy({ targets, token }: TargetsRequest) {
  return apiRequest<AccountabilityRelation>(
    "/accountability-relations/visibility-policy",
    {
      body: { targets },
      method: "PATCH",
      token,
    },
  );
}

export function disconnectWatcher({ token }: AuthenticatedRequest) {
  return apiRequest<void>("/accountability-relations/watcher", {
    method: "DELETE",
    token,
  });
}

export function disconnectWatching({ token }: AuthenticatedRequest) {
  return apiRequest<void>("/accountability-relations/watching", {
    method: "DELETE",
    token,
  });
}

export async function getWatcherDateSummary({
  date,
  target,
  token,
}: DateSummaryRequest) {
  const response = await apiRequest<unknown>(
    `/accountability-relations/watcher/${target}?${dateQuery(date)}`,
    { token },
  );

  return normalizeWatcherSummary(response);
}

export async function getWatcherRangeSummary({
  from,
  target,
  to,
  token,
}: RangeSummaryRequest) {
  const response = await apiRequest<unknown>(
    `/accountability-relations/watcher/${target}/range?${rangeQuery(from, to)}`,
    { token },
  );

  return normalizeWatcherSummary(response);
}
