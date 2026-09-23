import { describe, expect, it, vi } from 'vitest';
import { requestPortraitOrientation } from './orientation';

describe('portrait orientation request', () => {
  it('does not throw when Safari does not expose the Screen Orientation API', () => {
    expect(() => requestPortraitOrientation(undefined)).not.toThrow();
  });

  it('requests portrait mode when the API is available', () => {
    const lock = vi.fn().mockResolvedValue(undefined);

    requestPortraitOrientation({ lock });

    expect(lock).toHaveBeenCalledWith('portrait-primary');
  });
});
