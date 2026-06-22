import { act, renderHook } from "@testing-library/react";

import { useToast } from "./useToast";

describe("useToast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("restarts dismissal when the same message is shown again", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useToast({ fadeMs: 200, visibleMs: 1000 }),
    );

    act(() => result.current.setActionNotice("saved"));
    act(() => vi.advanceTimersByTime(900));
    act(() => result.current.setActionNotice("saved"));
    act(() => vi.advanceTimersByTime(200));

    expect(result.current.actionNotice).toBe("saved");
    expect(result.current.toastLeaving).toBe(false);

    act(() => vi.advanceTimersByTime(800));
    expect(result.current.toastLeaving).toBe(true);

    act(() => vi.advanceTimersByTime(200));
    expect(result.current.actionNotice).toBeNull();
  });
});
