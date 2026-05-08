import type { ExecutionDifficulty } from "../onboarding/types";

export function getTopPickLimit(
  executionDifficulty: ExecutionDifficulty | null | undefined,
) {
  if (executionDifficulty === "HIGH") {
    return 3;
  }

  if (executionDifficulty === "MEDIUM") {
    return 2;
  }

  return 1;
}

export function formatTopPickLimit(limit: number) {
  return limit === 1 ? "하나" : `${limit}개`;
}
