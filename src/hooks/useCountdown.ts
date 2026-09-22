import { useEffect, useRef, useState } from 'react';

interface CountdownOptions {
  durationMs: number | null;
  active: boolean;
  paused?: boolean;
  resetKey: string | number;
  onExpire: () => void;
}

export function useCountdown({
  durationMs,
  active,
  paused = false,
  resetKey,
  onExpire
}: CountdownOptions): number | null {
  const [remainingMs, setRemainingMs] = useState<number | null>(durationMs);
  const onExpireRef = useRef(onExpire);
  const remainingRef = useRef<number | null>(durationMs);
  const previousKeyRef = useRef<string | number | null>(null);
  const previousDurationRef = useRef<number | null>(null);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (durationMs === null) {
      remainingRef.current = null;
      setRemainingMs(durationMs);
      return;
    }

    const isNewCountdown = previousKeyRef.current !== resetKey ||
      previousDurationRef.current !== durationMs;
    previousKeyRef.current = resetKey;
    previousDurationRef.current = durationMs;
    if (isNewCountdown || remainingRef.current === null || remainingRef.current <= 0) {
      remainingRef.current = durationMs;
      setRemainingMs(durationMs);
    }

    if (!active || paused) return;

    let frame = 0;
    let expired = false;
    let deadline = performance.now() + remainingRef.current;

    const tick = () => {
      if (document.hidden) return;
      const next = Math.max(0, deadline - performance.now());
      remainingRef.current = next;
      setRemainingMs(next);
      if (next <= 0) {
        if (!expired) {
          expired = true;
          onExpireRef.current();
        }
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        remainingRef.current = Math.max(0, deadline - performance.now());
        cancelAnimationFrame(frame);
      } else if (!expired) {
        deadline = performance.now() + (remainingRef.current ?? durationMs);
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelAnimationFrame(frame);
      if (!expired && !document.hidden) {
        remainingRef.current = Math.max(0, deadline - performance.now());
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [active, durationMs, paused, resetKey]);

  return remainingMs;
}
