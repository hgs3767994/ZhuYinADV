import { describe, expect, it } from 'vitest';
import {
  QuestionDeck,
  createOptions,
  endlessScoreForCombo,
  getEndlessOptionCount,
  getEndlessTimeLimitMs,
  getNormalStars,
  normalScoreForQuestion
} from './engine';
import { getConfusableSymbols, getDistractorStrategy } from './distractors';

describe('normal scoring', () => {
  it('subtracts ten points per mistake and never goes below zero', () => {
    expect(normalScoreForQuestion(0)).toBe(50);
    expect(normalScoreForQuestion(1)).toBe(40);
    expect(normalScoreForQuestion(5)).toBe(0);
    expect(normalScoreForQuestion(99)).toBe(0);
  });

  it('uses the agreed five-star thresholds', () => {
    expect(getNormalStars(1000)).toEqual({ stars: 5, crowned: true });
    expect(getNormalStars(900).stars).toBe(4);
    expect(getNormalStars(800).stars).toBe(3);
    expect(getNormalStars(700).stars).toBe(2);
    expect(getNormalStars(699).stars).toBe(1);
  });
});

describe('endless progression', () => {
  it('uses the agreed option-count steps', () => {
    expect(getEndlessOptionCount(10)).toBe(2);
    expect(getEndlessOptionCount(11)).toBe(3);
    expect(getEndlessOptionCount(21)).toBe(4);
    expect(getEndlessOptionCount(31)).toBe(6);
  });

  it('uses the agreed timing steps', () => {
    expect(getEndlessTimeLimitMs(30)).toBeNull();
    expect(getEndlessTimeLimitMs(31)).toBe(10_000);
    expect(getEndlessTimeLimitMs(51)).toBe(5_000);
    expect(getEndlessTimeLimitMs(71)).toBe(3_000);
    expect(getEndlessTimeLimitMs(91)).toBe(2_000);
  });

  it('preserves the current combo scoring', () => {
    expect(endlessScoreForCombo(1)).toBe(50);
    expect(endlessScoreForCombo(2)).toBe(50);
    expect(endlessScoreForCombo(3)).toBe(80);
    expect(endlessScoreForCombo(4)).toBe(90);
  });
});

describe('question generation', () => {
  it('does not repeat an answer within one shuffled deck', () => {
    const deck = new QuestionDeck(() => 0.42);
    const answers = Array.from({ length: 37 }, () => deck.next());
    expect(new Set(answers).size).toBe(37);
  });

  it('creates unique options containing the answer', () => {
    const options = createOptions('ㄅ', 6, () => 0.37);
    expect(options).toContain('ㄅ');
    expect(new Set(options).size).toBe(6);
  });

  it('keeps easy-mode distractors broad when enough alternatives exist', () => {
    const options = createOptions('ㄓ', 2, () => 0.37, 'broad');
    expect(options).toContain('ㄓ');
    expect(options).not.toContain('ㄗ');
  });

  it('prioritizes sound or shape confusions at high difficulty', () => {
    const options = createOptions('ㄓ', 2, () => 0.37, 'confusable');
    expect(options).toEqual(expect.arrayContaining(['ㄓ', 'ㄗ']));
    expect(getConfusableSymbols('ㄇ', 'shape')).toEqual(
      expect.arrayContaining(['ㄈ', 'ㄑ', 'ㄩ'])
    );
  });

  it('increases distractor similarity with mode difficulty and endless progress', () => {
    expect(getDistractorStrategy('normal', 'easy', 1)).toBe('broad');
    expect(getDistractorStrategy('normal', 'normal', 1)).toBe('mixed');
    expect(getDistractorStrategy('normal', 'hard', 1)).toBe('confusable');
    expect(getDistractorStrategy('endless', null, 10)).toBe('broad');
    expect(getDistractorStrategy('endless', null, 11)).toBe('mixed');
    expect(getDistractorStrategy('endless', null, 31)).toBe('confusable');
  });
});
