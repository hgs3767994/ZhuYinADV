import { describe, expect, it } from 'vitest';
import { CampaignInteractionController } from './campaignInteraction';

describe('campaign interaction controller', () => {
  it('accepts only the first input while a judgement or animation owns the lock', () => {
    const controller = new CampaignInteractionController();
    const judging = controller.tryAcquire('judging');

    expect(judging).not.toBeNull();
    expect(controller.tryAcquire('animation')).toBeNull();
    expect(controller.lock?.reason).toBe('judging');
  });

  it('does not let a stale completion release a newer lock', () => {
    const controller = new CampaignInteractionController();
    const first = controller.tryAcquire('audio');
    expect(first).not.toBeNull();
    controller.reset();
    const second = controller.tryAcquire('animation');

    expect(first && controller.release(first)).toBe(false);
    expect(controller.lock).toEqual(second);
    expect(second && controller.release(second)).toBe(true);
    expect(controller.isLocked).toBe(false);
  });
});
