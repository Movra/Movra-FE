type UsePageGateOptions = {
  behaviorProfile: unknown | null | undefined;
  queriedBehaviorProfile?: unknown | null;
  queriedBehaviorProfileFailed?: boolean;
};

export function usePageGate({
  behaviorProfile,
  queriedBehaviorProfile,
  queriedBehaviorProfileFailed = false,
}: UsePageGateOptions) {
  return (
    behaviorProfile === null ||
    queriedBehaviorProfile === null ||
    queriedBehaviorProfileFailed
  );
}
