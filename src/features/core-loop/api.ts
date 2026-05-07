import { apiRequest } from "../../shared/api/client";
import type {
  DailyPlanTask,
  FocusSession,
  HomeToday,
  RecoveryCardAction,
  TodayFocusSessions,
  TopPick,
} from "./types";

type AuthenticatedRequest = {
  token: string;
};

type DailyPlanRequest = AuthenticatedRequest & {
  dailyPlanId: string;
};

type TaskRequest = DailyPlanRequest & {
  taskId: string;
};

export function getHomeToday({ token }: AuthenticatedRequest) {
  return apiRequest<HomeToday>("/home/today", { token });
}

export function getMindSweeps({ dailyPlanId, token }: DailyPlanRequest) {
  return apiRequest<DailyPlanTask[]>(
    `/daily-plans/${dailyPlanId}/mind-sweeps`,
    { token },
  );
}

export function createMindSweep({
  content,
  dailyPlanId,
  token,
}: DailyPlanRequest & { content: string }) {
  return apiRequest<void>(`/daily-plans/${dailyPlanId}/mind-sweeps`, {
    body: { content },
    method: "POST",
    token,
  });
}

export function updateMindSweep({
  content,
  dailyPlanId,
  taskId,
  token,
}: TaskRequest & { content: string }) {
  return apiRequest<void>(`/daily-plans/${dailyPlanId}/mind-sweeps/${taskId}`, {
    body: { content },
    method: "PUT",
    token,
  });
}

export function deleteMindSweep({ dailyPlanId, taskId, token }: TaskRequest) {
  return apiRequest<void>(`/daily-plans/${dailyPlanId}/mind-sweeps/${taskId}`, {
    method: "DELETE",
    token,
  });
}

export function completeMindSweep({ dailyPlanId, taskId, token }: TaskRequest) {
  return apiRequest<void>(
    `/daily-plans/${dailyPlanId}/mind-sweeps/${taskId}/complete`,
    {
      method: "PATCH",
      token,
    },
  );
}

export function uncompleteMindSweep({
  dailyPlanId,
  taskId,
  token,
}: TaskRequest) {
  return apiRequest<void>(
    `/daily-plans/${dailyPlanId}/mind-sweeps/${taskId}/uncomplete`,
    {
      method: "PATCH",
      token,
    },
  );
}

export function getTopPicks({ dailyPlanId, token }: DailyPlanRequest) {
  return apiRequest<TopPick[]>(`/daily-plans/${dailyPlanId}/top-picks`, {
    token,
  });
}

export function selectTopPick({
  dailyPlanId,
  estimatedMinutes,
  memo,
  taskId,
  token,
}: TaskRequest & { estimatedMinutes: number; memo: string }) {
  return apiRequest<void>(`/daily-plans/${dailyPlanId}/top-picks/${taskId}`, {
    body: { estimatedMinutes, memo },
    method: "POST",
    token,
  });
}

export function unselectTopPick({ dailyPlanId, taskId, token }: TaskRequest) {
  return apiRequest<void>(`/daily-plans/${dailyPlanId}/top-picks/${taskId}`, {
    method: "DELETE",
    token,
  });
}

export function createMorningTask({
  content,
  targetDate,
  token,
}: AuthenticatedRequest & { content: string; targetDate: string }) {
  return apiRequest<void>(`/morning-tasks?targetDate=${targetDate}`, {
    body: { content },
    method: "POST",
    token,
  });
}

export function updateMorningTask({
  content,
  dailyPlanId,
  taskId,
  token,
}: TaskRequest & { content: string }) {
  return apiRequest<void>(`/morning-tasks/${dailyPlanId}/${taskId}`, {
    body: { content },
    method: "PUT",
    token,
  });
}

export function deleteMorningTask({ dailyPlanId, taskId, token }: TaskRequest) {
  return apiRequest<void>(`/morning-tasks/${dailyPlanId}/${taskId}`, {
    method: "DELETE",
    token,
  });
}

export function completeMorningTask({ dailyPlanId, taskId, token }: TaskRequest) {
  return apiRequest<void>(`/morning-tasks/${dailyPlanId}/${taskId}/complete`, {
    method: "PATCH",
    token,
  });
}

export function uncompleteMorningTask({
  dailyPlanId,
  taskId,
  token,
}: TaskRequest) {
  return apiRequest<void>(
    `/morning-tasks/${dailyPlanId}/${taskId}/uncomplete`,
    {
      method: "PATCH",
      token,
    },
  );
}

export function getTodayFocusSessions({ token }: AuthenticatedRequest) {
  return apiRequest<TodayFocusSessions>("/focus-sessions/today", { token });
}

export function startFocusSession({
  presetMinutes,
  token,
}: AuthenticatedRequest & { presetMinutes: 3 | 5 | 10 | 25 }) {
  return apiRequest<FocusSession>("/focus-sessions/start", {
    body: { presetMinutes },
    method: "POST",
    token,
  });
}

export function stopFocusSession({ token }: AuthenticatedRequest) {
  return apiRequest<FocusSession>("/focus-sessions/stop", {
    method: "PATCH",
    token,
  });
}

export function recordRecoveryCardAction({
  action,
  token,
}: AuthenticatedRequest & { action: RecoveryCardAction }) {
  return apiRequest<void>("/focus-sessions/recovery-card/actions", {
    body: { action },
    method: "POST",
    token,
  });
}
