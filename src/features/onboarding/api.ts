import { apiRequest } from "../../shared/api/client";
import type {
  BehaviorProfile,
  BehaviorProfileRequest,
  OnboardingContext,
} from "./types";

type AuthenticatedRequest = {
  signal?: AbortSignal;
  token: string;
};

export function getOnboardingContext(signal?: AbortSignal) {
  return apiRequest<OnboardingContext>("/auth/onboarding-context", { signal });
}

export function createBehaviorProfile({
  token,
  values,
}: AuthenticatedRequest & { values: BehaviorProfileRequest }) {
  return apiRequest<void>("/behavior-profiles", {
    body: values,
    method: "POST",
    token,
  });
}

export function getBehaviorProfile({ signal, token }: AuthenticatedRequest) {
  return apiRequest<BehaviorProfile>("/behavior-profiles/me", { signal, token });
}

export function updateBehaviorProfile({
  token,
  values,
}: AuthenticatedRequest & { values: BehaviorProfileRequest }) {
  return apiRequest<void>("/behavior-profiles/me", {
    body: values,
    method: "PUT",
    token,
  });
}
