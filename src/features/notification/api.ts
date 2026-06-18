import { apiRequest } from "../../shared/api/client";
import type { NotificationPreference } from "../core-loop/types";
import type {
  NotificationPreferenceUpdateRequest,
  VapidPublicKeyResponse,
  WebPushSubscriptionRequest,
  WebPushSubscriptionResponse,
} from "./types";

type AuthenticatedRequest = {
  signal?: AbortSignal;
  token: string;
};

export function getNotificationPreference({ signal, token }: AuthenticatedRequest) {
  return apiRequest<NotificationPreference>("/notification/preferences", {
    signal,
    token,
  });
}

export function updateNotificationPreference({
  token,
  values,
}: AuthenticatedRequest & { values: NotificationPreferenceUpdateRequest }) {
  return apiRequest<NotificationPreference>("/notification/preferences", {
    body: values,
    method: "PATCH",
    token,
  });
}

export function getVapidPublicKey() {
  return apiRequest<VapidPublicKeyResponse>("/web-push/vapid-public-key");
}

export function subscribeWebPush({
  token,
  values,
}: AuthenticatedRequest & { values: WebPushSubscriptionRequest }) {
  return apiRequest<WebPushSubscriptionResponse>("/web-push/subscribe", {
    body: values,
    method: "POST",
    token,
  });
}
