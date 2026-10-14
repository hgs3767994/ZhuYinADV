export type CampaignInteractionLockReason =
  | 'loading'
  | 'audio'
  | 'judging'
  | 'animation'
  | 'saving';

export interface CampaignInteractionLock {
  token: number;
  reason: CampaignInteractionLockReason;
}

export class CampaignInteractionController {
  private nextToken = 1;
  private active: CampaignInteractionLock | null = null;

  get lock(): CampaignInteractionLock | null {
    return this.active;
  }

  get isLocked(): boolean {
    return this.active !== null;
  }

  tryAcquire(reason: CampaignInteractionLockReason): CampaignInteractionLock | null {
    if (this.active) return null;
    const lock = { token: this.nextToken++, reason };
    this.active = lock;
    return lock;
  }

  release(lock: CampaignInteractionLock): boolean {
    if (this.active?.token !== lock.token) return false;
    this.active = null;
    return true;
  }

  reset(): void {
    this.active = null;
  }
}
