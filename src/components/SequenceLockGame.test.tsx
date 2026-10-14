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

import { SequenceLockGame } from './SequenceLockGame';

function renderVariant(variant: 'entrance' | 'magic-door') {
  return renderToStaticMarkup(
    <SequenceLockGame
      variant={variant}
      resultId={`${variant}-preview`}
      paused
      inputEnabled={false}
      onSealCountChange={() => undefined}
      onInteractionLockChange={() => undefined}
      onSolved={() => undefined}
    />
  );
}

describe('sequence lock gameplay shell', () => {
  it('keeps the same interaction shell for the entrance and magic door', () => {
    for (const variant of ['entrance', 'magic-door'] as const) {
      const html = renderVariant(variant);
      expect(html).toContain('第 1 道封印');
      expect(html).toContain('重播聲音');
      expect(html).toContain('鎖孔區');
      expect(html).toContain('待選區');
      expect((html.match(/<img src="\/assets\/images\/campaign\/seal-locked\.png"/g) ?? [])).toHaveLength(3);
      expect(html).not.toContain('◇');
      expect((html.match(/sequence-lock-slot-empty/g) ?? [])).toHaveLength(3);
      expect(html).not.toContain('倒數');
    }
  });
});
