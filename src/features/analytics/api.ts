import { apiRequest } from "../../shared/api/client";

type AuthenticatedRequest = {
  token: string;
};

export type AnalyticsEventType =
  | "SIGNUP"
  | "ONBOARDING_STARTED"
  | "ONBOARDING_SKIPPED"
  | "BEHAVIOR_PROFILE_CREATED"
  | "FUTURE_VISION_CREATED"
  | "MORNING_TASK_CREATED"
  | "TOP_PICK_SELECTED"
  | "TIMETABLE_SLOT_CREATED"
  | "FOCUS_SESSION_STARTED"
  | "FOCUS_SESSION_COMPLETED"
  | "FOCUS_SESSION_ABANDONED"
  | "TINY_WIN_CREATED"
  | "DAILY_REFLECTION_CREATED"
  | "RECOVERY_CARD_VIEWED"
  | "RECOVERY_CARD_ACTIONED"
  | "ACCOUNTABILITY_INVITE_SENT"
  | "ACCOUNTABILITY_FRIEND_JOINED"
  | "WEB_PUSH_OPT_IN"
  | "SCHOOL_HOURS_MUTE_TOGGLED"
  | "EXAM_REGISTERED";

export type RecordAnalyticsEventRequest = AuthenticatedRequest & {
  eventType: AnalyticsEventType;
  properties?: Record<string, unknown>;
};

export type AnalyticsEventResponse = {
  analyticsEventId: string;
  eventType: AnalyticsEventType;
  occurredAt: string;
  properties: Record<string, unknown>;
};

export type GetAnalyticsEventsRequest = AuthenticatedRequest & {
  eventType?: AnalyticsEventType;
  from?: string;
  to?: string;
};

export function recordAnalyticsEvent({
  eventType,
  properties = {},
  token,
}: RecordAnalyticsEventRequest) {
  return apiRequest<AnalyticsEventResponse>("/analytics/events", {
    body: { eventType, properties },
    method: "POST",
    token,
  });
}

export async function recordAnalyticsEventSafely(
  request: RecordAnalyticsEventRequest,
) {
  try {
    await recordAnalyticsEvent(request);
  } catch {
    // Analytics must not block the primary user flow.
  }
}

export function getAnalyticsEvents({
  eventType,
  from,
  to,
  token,
}: GetAnalyticsEventsRequest) {
  const params = new URLSearchParams();
  if (from) {
    params.set("from", from);
  }
  if (to) {
    params.set("to", to);
  }
  if (eventType) {
    params.set("eventType", eventType);
  }

  const query = params.toString();

  return apiRequest<AnalyticsEventResponse[]>(
    query ? `/analytics/events?${query}` : "/analytics/events",
    { token },
  );
}
