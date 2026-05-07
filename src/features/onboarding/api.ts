import { apiRequest } from "../../shared/api/client";
import type {
  BehaviorProfile,
  BehaviorProfileRequest,
  OnboardingContext,
} from "./types";

type AuthenticatedRequest = {
  token: string;
};

export function getOnboardingContext() {
  return apiRequest<OnboardingContext>("/auth/onboarding-context");
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

export function getBehaviorProfile({ token }: AuthenticatedRequest) {
  return apiRequest<BehaviorProfile>("/behavior-profiles/me", { token });
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
