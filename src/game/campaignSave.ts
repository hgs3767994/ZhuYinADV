import type { CampaignCompletionInput, SavedCampaignCompletion } from './campaignTypes';

interface CampaignSaveRetryOptions {
  attempts?: number;
  retryDelayMs?: number;
  wait?: (delayMs: number) => Promise<void>;
}

const waitForRetry = (delayMs: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, delayMs);
});

export async function saveCampaignCompletionWithRetry(
  input: CampaignCompletionInput,
  save: (sameInput: CampaignCompletionInput) => Promise<SavedCampaignCompletion>,
  options: CampaignSaveRetryOptions = {}
): Promise<SavedCampaignCompletion> {
  const attempts = options.attempts ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 500;
  const wait = options.wait ?? waitForRetry;
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error('保存重試次數必須至少為 1');
  }

  let lastError: unknown = new Error('無法保存闖關結果');
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await save(input);
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await wait(retryDelayMs);
    }
  }
  throw lastError;
}
