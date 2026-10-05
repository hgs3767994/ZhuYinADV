import { describe, expect, it } from 'vitest';
import {
  endlessExperience,
  experienceProgress,
  getNormalStars,
  normalExperience
} from './experience';

describe('normal experience', () => {
  it('uses the agreed star thresholds', () => {
    expect([849, 850, 899, 900, 949, 950, 999, 1000].map(getNormalStars))
      .toEqual([1, 2, 2, 3, 3, 4, 4, 5]);
  });

  it('awards the agreed XP matrix', () => {
    const scores = [800, 850, 900, 950, 1000];
    expect(scores.map((score) => normalExperience(score, 'easy', true)))
      .toEqual([20, 25, 30, 35, 40]);
    expect(scores.map((score) => normalExperience(score, 'normal', true)))
      .toEqual([20, 25, 40, 45, 50]);
    expect(scores.map((score) => normalExperience(score, 'hard', true)))
      .toEqual([20, 25, 50, 55, 60]);
  });

  it('does not award XP for an unfinished normal game', () => {
    expect(normalExperience(1000, 'hard', false)).toBe(0);
  });
});

describe('endless experience', () => {
  it('adds five XP for each complete five-combo step and caps at 150', () => {
    expect(endlessExperience(17, 4)).toBe(17);
    expect(endlessExperience(17, 5)).toBe(22);
    expect(endlessExperience(120, 35)).toBe(150);
  });
});

describe('animal ranks', () => {
  it('uses cumulative thresholds and current-rank percentages', () => {
    expect(experienceProgress(0)).toMatchObject({ rankId: 'chicken', percent: 0 });
    expect(experienceProgress(100)).toMatchObject({ rankId: 'rabbit', percent: 0 });
    expect(experienceProgress(175)).toMatchObject({ rankId: 'rabbit', percent: 50 });
    expect(experienceProgress(2_500)).toMatchObject({ rankId: 'giraffe', percent: 0 });
    expect(experienceProgress(3_200)).toMatchObject({
      rankId: 'elephant', percent: 100, isMaxRank: true
    });
  });
});
