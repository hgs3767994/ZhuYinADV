import { describe, expect, it, vi } from 'vitest';
import type { CampaignCompletionInput, SavedCampaignCompletion } from './campaignTypes';
import { saveCampaignCompletionWithRetry } from './campaignSave';

const input: CampaignCompletionInput = {
  resultId: 'stable-result-id',
  profileId: 'player-1',
  campaignId: 'campaign-01',
  levelId: 'level-01',
  gameplayId: 'sequence-lock',
  stars: 3,
  performance: { kind: 'sequence-lock', wrongSequenceCount: 0 },
  durationMs: 12_000,
  playedAt: '2026-10-12T03:00:00.000Z',
  appVersion: 'test'
};

describe('campaign completion save retry', () => {
  it('retries with the exact same input object and stable result ID', async () => {
    const saved = { result: { id: input.resultId } } as SavedCampaignCompletion;
    const save = vi.fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(saved);
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(saveCampaignCompletionWithRetry(input, save, {
      attempts: 2,
      retryDelayMs: 500,
      wait
    })).resolves.toBe(saved);

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[0][0]).toBe(input);
    expect(save.mock.calls[1][0]).toBe(input);
    expect(save.mock.calls[1][0].resultId).toBe('stable-result-id');
    expect(wait).toHaveBeenCalledWith(500);
  });

  it('surfaces the final error after the configured automatic attempts', async () => {
    const finalError = new Error('still unavailable');
    const save = vi.fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockRejectedValueOnce(finalError);

    await expect(saveCampaignCompletionWithRetry(input, save, {
      attempts: 2,
      wait: async () => undefined
    })).rejects.toBe(finalError);
    expect(save).toHaveBeenCalledTimes(2);
  });
});
