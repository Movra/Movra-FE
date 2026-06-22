import { renderHook } from "@testing-library/react";

import { usePageGate } from "./usePageGate";

describe("usePageGate", () => {
  it("redirects only when a required behavior profile is missing or failed", () => {
    const initialProps: Parameters<typeof usePageGate>[0] = {
      behaviorProfile: undefined,
      queriedBehaviorProfile: undefined,
      queriedBehaviorProfileFailed: false,
    };
    const { rerender, result } = renderHook(
      (options: Parameters<typeof usePageGate>[0]) => usePageGate(options),
      {
        initialProps,
      },
    );

    expect(result.current).toBe(false);

    rerender({
      behaviorProfile: null,
      queriedBehaviorProfile: undefined,
      queriedBehaviorProfileFailed: false,
    });
    expect(result.current).toBe(true);

    rerender({
      behaviorProfile: {},
      queriedBehaviorProfile: {},
      queriedBehaviorProfileFailed: true,
    });
    expect(result.current).toBe(true);
  });
});
