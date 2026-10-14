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

import { SoundMazeGame } from './SoundMazeGame';

describe('sound maze gameplay shell', () => {
  it('renders a local two-way fork without a full-map, timer or rune gate', () => {
    const html = renderToStaticMarkup(
      <SoundMazeGame
        variant="fork"
        resultId="maze-preview"
        paused
        inputEnabled={false}
        onFragmentCountChange={() => undefined}
        onInteractionLockChange={() => undefined}
        onSolved={() => undefined}
      />
    );

    expect(html).toContain('sound-maze-viewport');
    expect((html.match(/sound-maze-route /g) ?? [])).toHaveLength(2);
    expect(html).toContain('重播目標讀音');
    expect(html).toContain('返回上一個岔路');
    expect(html).not.toContain('完整地圖');
    expect(html).not.toContain('符文門');
    expect(html).not.toContain('倒數');
  });

  it('renders three rune gates without fork wording, a timer or a full map', () => {
    const html = renderToStaticMarkup(
      <SoundMazeGame
        variant="rune-gate"
        resultId="rune-gate-preview"
        paused
        inputEnabled={false}
        onFragmentCountChange={() => undefined}
        onInteractionLockChange={() => undefined}
        onSolved={() => undefined}
      />
    );

    expect((html.match(/sound-maze-rune-gate /g) ?? [])).toHaveLength(3);
    expect((html.match(/選擇 [^\s]+ 符文門/g) ?? [])).toHaveLength(3);
    expect(html).toContain('返回上一道符文門');
    expect(html).not.toContain('返回上一個岔路');
    expect(html).not.toContain('倒數');
    expect(html).not.toContain('完整地圖');
  });
});
