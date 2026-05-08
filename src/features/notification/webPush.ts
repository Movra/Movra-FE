import { ensureWebPushServiceWorker } from "./registerServiceWorker";
import { urlBase64ToUint8Array } from "./vapidKey";

export type BrowserSubscriptionResult = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type SubscriptionJson = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};

function toResult(subscription: PushSubscription): BrowserSubscriptionResult {
  const json = subscription.toJSON() as SubscriptionJson;
  return {
    endpoint: json.endpoint,
    keys: {
      auth: json.keys?.auth ?? "",
      p256dh: json.keys?.p256dh ?? "",
    },
  };
}

export async function subscribeBrowserToWebPush(
  vapidPublicKey: string,
): Promise<BrowserSubscriptionResult> {
  const registration = await ensureWebPushServiceWorker();
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return toResult(existing);
  }
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
  const subscription = await registration.pushManager.subscribe({
    applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    userVisibleOnly: true,
  });
  return toResult(subscription);
}
