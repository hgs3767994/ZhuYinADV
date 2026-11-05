import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_AVATAR_RECIPE } from '../avatar/model';

vi.mock('../services/audio', () => ({
  audioService: {
    speakSequence: vi.fn().mockResolvedValue(undefined),
    stopSpeech: vi.fn(),
    playWrong: vi.fn(),
    playCorrect: vi.fn()
  }
}));

vi.mock('../utils/assets', () => ({
  assetUrl: (path: string) => `/__base__/${path}`
}));

import { PursuitGame } from './PursuitGame';

describe('escort gameplay shell', () => {
  it('shows the party, approaching mist, two beginner roads and audio-first countdown state', () => {
    const html = renderToStaticMarkup(
      <PursuitGame
        variant="escort"
        avatarRecipe={DEFAULT_AVATAR_RECIPE}
        resultId="escort-preview"
        paused
        inputEnabled={false}
        onStatusChange={() => undefined}
        onInteractionLockChange={() => undefined}
        onDefeat={() => undefined}
        onSolved={() => undefined}
      />
    );

    expect(html).toContain('套用玩家頭像的冒險者紙偶');
    expect(html).toContain('小亞紙偶');
    expect(html).toContain('後方逼近的黑霧');
    expect(html).toContain('level-04-forest-backdrop.jpg');
    expect(html).toContain('level-04-forest-foreground.png');
    expect(html).toContain('level-04-black-mist.png');
    expect(html).toContain('url(/__base__/assets/images/campaign/pursuit/level-04-forest-backdrop.jpg)');
    expect(html).toContain('src="/__base__/assets/images/campaign/level-03-xia-smile.png"');
    expect(html).toContain('src="/__base__/assets/images/campaign/level-04-adventurer-body.png?v=2"');
    expect(html).not.toContain('src="/assets/images/campaign/');
    expect(html).toContain('--mist-left:-23%');
    expect((html.match(/選擇 [^\s]+ 道路/g) ?? [])).toHaveLength(2);
    expect(html).not.toContain('>聽完讀音後開始倒數<');
    expect(html).toContain('重播目標讀音');
    expect(html).not.toContain('即時星級');
  });

  it('shows three roads and pursuing soldiers in chase mode', () => {
    const html = renderToStaticMarkup(
      <PursuitGame
        variant="chase"
        avatarRecipe={DEFAULT_AVATAR_RECIPE}
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
    expect(html).toContain('--mist-left:-18%');
    expect(html).not.toContain('level-04-black-mist.png');
    expect((html.match(/選擇 [^\s]+ 道路/g) ?? [])).toHaveLength(3);
    expect(html).not.toContain('後方逼近的黑霧');
  });
});
