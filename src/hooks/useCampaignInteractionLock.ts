import { useCallback, useRef, useState } from 'react';
import {
  CampaignInteractionController,
  type CampaignInteractionLockReason
} from '../game/campaignInteraction';

export interface CampaignLockedActionResult<T> {
  accepted: boolean;
  value?: T;
}

export function useCampaignInteractionLock(externallyLocked = false) {
  const controllerRef = useRef<CampaignInteractionController | null>(null);
  if (!controllerRef.current) controllerRef.current = new CampaignInteractionController();
  const [reason, setReason] = useState<CampaignInteractionLockReason | null>(null);

  const runLocked = useCallback(async <T,>(
    lockReason: CampaignInteractionLockReason,
    action: () => T | Promise<T>
  ): Promise<CampaignLockedActionResult<T>> => {
    if (externallyLocked) return { accepted: false };
    const controller = controllerRef.current!;
    const lock = controller.tryAcquire(lockReason);
    if (!lock) return { accepted: false };
    setReason(lockReason);
    try {
      return { accepted: true, value: await action() };
    } finally {
      if (controller.release(lock)) setReason(null);
    }
  }, [externallyLocked]);

  const resetLock = useCallback(() => {
    controllerRef.current?.reset();
    setReason(null);
  }, []);

  return {
    isLocked: externallyLocked || reason !== null,
    lockReason: externallyLocked ? 'paused' as const : reason,
    runLocked,
    resetLock
  };
}
