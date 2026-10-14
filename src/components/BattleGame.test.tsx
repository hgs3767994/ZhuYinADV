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

import { BattleGame } from './BattleGame';

describe('level-five battle shell', () => {
  it('starts with one selected enemy, hidden answer, two runes and unavailable skills', () => {
    const html = renderToStaticMarkup(<BattleGame variant="beginner" resultId="battle-preview" paused inputEnabled={false}
      tutorialTipsSeen={{ correct: false, wrong: false, energy: false, shield: true }}
      onTutorialTipSeen={() => undefined} onStatusChange={() => undefined}
      onInteractionLockChange={() => undefined} onDefeat={() => undefined} onSolved={() => undefined} />);

    expect(html).toContain('已選定迷霧哨兵');
    expect(html).toContain('重播目標讀音');
    expect((html.match(/battle-runes/g) ?? [])).toHaveLength(1);
    expect((html.match(/aria-label="選擇 [^\"]+"/g) ?? [])).toHaveLength(2);
    expect(html).toContain('符音穿透');
    expect(html).not.toContain('目標符文');
    expect(html).not.toContain('倒數');
  });

  it('starts the castle battle with three runes and keeps the shield tutorial for wave five', () => {
    const html = renderToStaticMarkup(<BattleGame variant="castle" resultId="castle-preview" paused inputEnabled={false}
      tutorialTipsSeen={{ correct: true, wrong: true, energy: true, shield: false }}
      onTutorialTipSeen={() => undefined} onStatusChange={() => undefined}
      onInteractionLockChange={() => undefined} onDefeat={() => undefined} onSolved={() => undefined} />);

    expect(html).toContain('已選定迷霧哨兵');
    expect((html.match(/aria-label="選擇 [^"]+"/g) ?? [])).toHaveLength(3);
    expect(html).not.toContain('護盾敵人');
    expect(html).not.toContain('倒數');
  });

  it('starts the boss battle without Xiao Ya and shows the general commanding from the crystal', () => {
    const html = renderToStaticMarkup(<BattleGame variant="boss" resultId="boss-preview" paused inputEnabled={false}
      tutorialTipsSeen={{ correct: true, wrong: true, energy: true, shield: true }}
      onTutorialTipSeen={() => undefined} onStatusChange={() => undefined}
      onInteractionLockChange={() => undefined} onDefeat={() => undefined} onSolved={() => undefined} />);

    expect(html).toContain('迷霧將軍在封印水晶前指揮戰鬥');
    expect(html).not.toContain('小亞在後方觀戰');
    expect((html.match(/aria-label="選擇 [^"]+"/g) ?? [])).toHaveLength(3);
    expect(html).not.toContain('倒數');
  });
});
