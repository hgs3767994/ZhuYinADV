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

import { PursuitGame } from './PursuitGame';

describe('escort gameplay shell', () => {
  it('shows the party, approaching mist, two beginner roads and audio-first countdown state', () => {
    const html = renderToStaticMarkup(
      <PursuitGame
        variant="escort"
        resultId="escort-preview"
        paused
        inputEnabled={false}
        onStatusChange={() => undefined}
        onInteractionLockChange={() => undefined}
        onDefeat={() => undefined}
        onSolved={() => undefined}
      />
    );

    expect(html).toContain('冒險者');
    expect(html).toContain('小亞');
    expect(html).toContain('後方逼近的黑霧');
    expect((html.match(/選擇 [^\s]+ 道路/g) ?? [])).toHaveLength(2);
    expect(html).not.toContain('>聽完讀音後開始倒數<');
    expect(html).toContain('重播目標讀音');
    expect(html).not.toContain('即時星級');
  });

  it('shows three roads and pursuing soldiers in chase mode', () => {
    const html = renderToStaticMarkup(
      <PursuitGame
        variant="chase"
        resultId="chase-preview"
        paused
        inputEnabled={false}
        onStatusChange={() => undefined}
        onInteractionLockChange={() => undefined}
        onDefeat={() => undefined}
        onSolved={() => undefined}
      />
    );

    expect(html).toContain('後方追趕的迷霧哨兵');
    expect((html.match(/選擇 [^\s]+ 道路/g) ?? [])).toHaveLength(3);
    expect(html).not.toContain('後方逼近的黑霧');
  });
});
