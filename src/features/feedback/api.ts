import { ApiClientError, apiRequest } from "../../shared/api/client";

type AuthenticatedRequest = {
  signal?: AbortSignal;
  token: string;
};

export type DailyReflectionRequest = {
  reflectionDate: string;
  whatWentWell: string;
  whatBrokeDown: string;
  ifCondition: string;
  thenAction: string;
};

export type DailyReflection = DailyReflectionRequest & {
  dailyReflectionId: string;
};

export type DailyReflectionUpdateRequest = Omit<
  DailyReflectionRequest,
  "reflectionDate"
>;

export function createDailyReflection({
  token,
  values,
}: AuthenticatedRequest & { values: DailyReflectionRequest }) {
  return apiRequest<void>("/daily-reflections", {
    body: values,
    method: "POST",
    token,
  });
}

export function getDailyReflection({
  signal,
  targetDate,
  token,
}: AuthenticatedRequest & { targetDate: string }) {
  return apiRequest<DailyReflection>(
    `/daily-reflections?targetDate=${encodeURIComponent(targetDate)}`,
    { signal, token },
  ).catch((error) => {
    if (error instanceof ApiClientError && error.status === 404) {
      return null;
    }

    throw error;
  });
}

export function updateDailyReflection({
  dailyReflectionId,
  token,
  values,
}: AuthenticatedRequest & {
  dailyReflectionId: string;
  values: DailyReflectionUpdateRequest;
}) {
  return apiRequest<void>(
    `/daily-reflections/${encodeURIComponent(dailyReflectionId)}`,
    {
      body: values,
      method: "PATCH",
      token,
    },
  );
}

export type TinyWin = {
  content: string;
  localDate: string;
  tinyWinId: string;
  title: string;
};

export type TinyWinCreateRequest = {
  content: string;
  title: string;
};

export type TinyWinTitleRequest = {
  title: string;
};

export type TinyWinContentRequest = {
  content: string;
};

export function createTinyWin({
  token,
  values,
}: AuthenticatedRequest & { values: TinyWinCreateRequest }) {
  return apiRequest<void>("/tiny-wins", {
    body: values,
    method: "POST",
    token,
  });
}

export function getTinyWins({ signal, token }: AuthenticatedRequest) {
  return apiRequest<TinyWin[]>("/tiny-wins", { signal, token });
}

export function getTinyWin({
  signal,
  tinyWinId,
  token,
}: AuthenticatedRequest & { tinyWinId: string }) {
  return apiRequest<TinyWin>(
    `/tiny-wins/${encodeURIComponent(tinyWinId)}`,
    { signal, token },
  );
}

export function updateTinyWinTitle({
  tinyWinId,
  token,
  values,
}: AuthenticatedRequest & {
  tinyWinId: string;
  values: TinyWinTitleRequest;
}) {
  return apiRequest<void>(
    `/tiny-wins/${encodeURIComponent(tinyWinId)}/title`,
    {
      body: values,
      method: "PATCH",
      token,
    },
  );
}

export function updateTinyWinContent({
  tinyWinId,
  token,
  values,
}: AuthenticatedRequest & {
  tinyWinId: string;
  values: TinyWinContentRequest;
}) {
  return apiRequest<void>(
    `/tiny-wins/${encodeURIComponent(tinyWinId)}/content`,
    {
      body: values,
      method: "PATCH",
      token,
    },
  );
}

export function deleteTinyWin({
  tinyWinId,
  token,
}: AuthenticatedRequest & { tinyWinId: string }) {
  return apiRequest<void>(
    `/tiny-wins/${encodeURIComponent(tinyWinId)}`,
    {
      method: "DELETE",
      token,
    },
  );
}
