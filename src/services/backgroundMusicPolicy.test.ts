import { describe, expect, it } from 'vitest';
import { shouldPlayBackgroundMusic } from './backgroundMusicPolicy';

describe('background music policy', () => {
  it('keeps background music off throughout campaign mode', () => {
    expect(shouldPlayBackgroundMusic('campaign-guest-warning')).toBe(false);
    expect(shouldPlayBackgroundMusic('campaign-intro')).toBe(false);
    expect(shouldPlayBackgroundMusic('campaign-intro-replay')).toBe(false);
    expect(shouldPlayBackgroundMusic('campaign-map')).toBe(false);
    expect(shouldPlayBackgroundMusic('campaign-level')).toBe(false);
  });

  it('keeps the existing game screen silent', () => {
    expect(shouldPlayBackgroundMusic('game')).toBe(false);
  });

  it('allows background music on the existing menu flow', () => {
    expect(shouldPlayBackgroundMusic('welcome')).toBe(true);
    expect(shouldPlayBackgroundMusic('profiles')).toBe(true);
    expect(shouldPlayBackgroundMusic('mode')).toBe(true);
    expect(shouldPlayBackgroundMusic('difficulty')).toBe(true);
  });
});
