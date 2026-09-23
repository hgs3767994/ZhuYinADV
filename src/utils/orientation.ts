export interface LockableScreenOrientation {
  lock?: (value: OrientationLockType) => Promise<void>;
}

export function requestPortraitOrientation(
  orientation: LockableScreenOrientation | undefined
): void {
  if (typeof orientation?.lock !== 'function') return;
  void orientation.lock('portrait-primary').catch(() => undefined);
}
