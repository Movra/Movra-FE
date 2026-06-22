import { useCallback, useEffect, useState } from "react";

type UseToastOptions = {
  visibleMs: number;
  fadeMs: number;
};

/**
 * Shared action-toast state: an error/notice pair that stays visible for
 * `visibleMs`, fades for `fadeMs`, then clears. Bumping an internal id on every
 * set re-arms the timer even when the same message is shown twice in a row.
 */
export function useToast({ visibleMs, fadeMs }: UseToastOptions) {
  const [actionError, setError] = useState<string | null>(null);
  const [actionNotice, setNotice] = useState<string | null>(null);
  const [toastLeaving, setToastLeaving] = useState(false);
  const [toastId, setToastId] = useState(0);

  useEffect(() => {
    if (!actionError && !actionNotice) {
      return undefined;
    }

    setToastLeaving(false);

    const fadeTimer = window.setTimeout(() => {
      setToastLeaving(true);
    }, visibleMs);
    const clearTimer = window.setTimeout(() => {
      setError(null);
      setNotice(null);
      setToastLeaving(false);
    }, visibleMs + fadeMs);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [actionError, actionNotice, toastId, visibleMs, fadeMs]);

  const setActionError = useCallback((value: string | null) => {
    setError(value);
    setToastId((current) => current + 1);
  }, []);

  const setActionNotice = useCallback((value: string | null) => {
    setNotice(value);
    setToastId((current) => current + 1);
  }, []);

  return { actionError, actionNotice, setActionError, setActionNotice, toastLeaving };
}
