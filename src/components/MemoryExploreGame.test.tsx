import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/audio', () => ({
  audioService: {
    speakSequence: vi.fn().mockResolvedValue(undefined),
    stopSpeech: vi.fn(),
    playWrong: vi.fn(),
    playCorrect: vi.fn()
  }
}));

import { MemoryExploreGame } from './MemoryExploreGame';

describe('memory explore gameplay shell', () => {
  it('starts with nine visible cards in three color triples, five seals and no target card or countdown', () => {
    const html = renderToStaticMarkup(
      <MemoryExploreGame
        variant="explore"
        resultId="memory-preview"
        paused
        inputEnabled={false}
        onSealCountChange={() => undefined}
        onLifeChange={() => undefined}
        onInteractionLockChange={() => undefined}
        onDefeat={() => undefined}
        onSolved={() => undefined}
      />
    );

    expect((html.match(/memory-explore-card /g) ?? [])).toHaveLength(9);
    const colorIndexes = [...html.matchAll(/memory-symbol-color-(\d)/g)].map((match) => match[1]);
    const colorCounts = [...new Set(colorIndexes)].map(
      (colorIndex) => colorIndexes.filter((candidate) => candidate === colorIndex).length
    );
    expect(new Set(colorIndexes).size).toBe(3);
    expect(colorCounts.sort((left, right) => left - right)).toEqual([3, 3, 3]);
    expect((html.match(/<img[^>]+rune-card-front\.png/g) ?? [])).toHaveLength(9);
    expect(html).not.toContain('rune-card-back.png');
    expect((html.match(/<img[^>]+seal-locked\.png/g) ?? [])).toHaveLength(5);
    expect(html).toContain('仔細記住九張符文的位置');
    expect(html).not.toContain('記住符文的位置');
    expect(html).not.toContain('目標符文');
    expect(html).not.toContain('配對不正確');
    expect(html).not.toContain('配對成功');
    expect(html).toContain('重播目標讀音');
    expect(html).not.toContain('倒數');
  });

  it('starts memory battle with nine cards, five barrier shields and no energy skills', () => {
    const html = renderToStaticMarkup(
      <MemoryExploreGame
        variant="battle"
        resultId="memory-battle-preview"
        paused
        inputEnabled={false}
        onSealCountChange={() => undefined}
        onLifeChange={() => undefined}
        onInteractionLockChange={() => undefined}
        onDefeat={() => undefined}
        onSolved={() => undefined}
      />
    );

    expect((html.match(/memory-explore-card /g) ?? [])).toHaveLength(9);
    expect(html).toContain('巨大迷霧結界');
    expect(html).toContain('尚餘 5 層結界護盾');
    expect((html.match(/<img[^>]+seal-locked\.png/g) ?? [])).toHaveLength(5);
    expect(html).not.toContain('目標符文');
    expect(html).not.toContain('聲音能量');
    expect(html).not.toContain('符音穿透');
    expect(html).not.toContain('回音護盾');
  });
});
