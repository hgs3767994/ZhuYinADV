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

  it('shows the castle gate only for the level one entrance', () => {
    const entrance = renderVariant('entrance');
    const magicDoor = renderVariant('magic-door');

    expect(entrance).toContain('/assets/images/campaign/level-01-gate.png');
    expect(entrance).toContain('sequence-lock-scene-entrance');
    expect(magicDoor).not.toContain('/assets/images/campaign/level-01-gate.png');
    expect(magicDoor).toContain('sequence-lock-scene-magic-door');
  });

  it('centers each rune row using the active puzzle card count', () => {
    const entrance = renderVariant('entrance');

    expect(entrance).toContain('data-card-count="3"');
    expect((entrance.match(/--sequence-lock-card-count:3/g) ?? [])).toHaveLength(2);
  });

  it('places the level one instructions and replay control before the gate', () => {
    const entrance = renderVariant('entrance');
    const instructionIndex = entrance.indexOf('sequence-lock-instruction');
    const replayIndex = entrance.indexOf('campaign-audio-replay-button');
    const gateIndex = entrance.indexOf('sequence-lock-scene-entrance');

    expect(instructionIndex).toBeGreaterThanOrEqual(0);
    expect(replayIndex).toBeGreaterThan(instructionIndex);
    expect(gateIndex).toBeGreaterThan(replayIndex);
  });

  it('keeps the magic door scene in its original position', () => {
    const magicDoor = renderVariant('magic-door');
    const sceneIndex = magicDoor.indexOf('sequence-lock-scene-magic-door');
    const instructionIndex = magicDoor.indexOf('sequence-lock-instruction');
    const replayIndex = magicDoor.indexOf('campaign-audio-replay-button');

    expect(sceneIndex).toBeGreaterThanOrEqual(0);
    expect(instructionIndex).toBeGreaterThan(sceneIndex);
    expect(replayIndex).toBeGreaterThan(instructionIndex);
  });
});
