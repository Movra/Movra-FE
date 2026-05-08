import type { NotificationPreference } from "../core-loop/types";

export type NotificationPreferenceUpdateRequest = Omit<
  NotificationPreference,
  "notificationPreferenceId"
>;

export type WebPushSubscriptionRequest = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  contentEncoding: string;
  userAgent: string;
};

export type WebPushSubscriptionResponse = {
  webPushSubscriptionId: string;
  endpoint: string;
  contentEncoding: string;
  createdAt: string;
  lastRegisteredAt: string;
};

export type VapidPublicKeyResponse = {
  publicKey: string;
};
