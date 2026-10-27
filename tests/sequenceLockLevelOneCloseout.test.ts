import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('level 1-1 gate artwork closeout safeguards', () => {
  it('keeps the production gate artwork at the approved mobile-friendly size', () => {
    const gate = readFileSync(
      new URL('../public/assets/images/campaign/level-01-gate.png', import.meta.url)
    );

    expect(gate.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(gate.readUInt32BE(16)).toBe(768);
    expect(gate.readUInt32BE(20)).toBe(307);
    expect(gate.byteLength).toBeLessThanOrEqual(250 * 1024);
  });

  it('keeps the full gameplay preview development-only', () => {
    const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');

    expect(main).toContain("import.meta.env.VITE_ENABLE_PREVIEWS === 'true'");
    expect(main).toContain("preview === 'sequence-lock-gate'");
  });

  it('keeps the correct-answer light and frame synchronized before unlocking', () => {
    const game = readFileSync(
      new URL('../src/components/SequenceLockGame.tsx', import.meta.url),
      'utf8'
    );
    const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
    const correctSoundIndex = game.indexOf('audioService.playCorrect();');
    const launchIndex = game.indexOf('const flightDuration = launchSealFlight(lockIndex);');
    const waitIndex = game.indexOf('await waitWhileActive(flightDuration);');
    const unlockIndex = game.indexOf('setUnlockedSealCount(nextLockIndex);');

    expect(correctSoundIndex).toBeGreaterThanOrEqual(0);
    expect(launchIndex).toBeGreaterThan(correctSoundIndex);
    expect(waitIndex).toBeGreaterThan(launchIndex);
    expect(unlockIndex).toBeGreaterThan(waitIndex);
    expect(styles).toMatch(/\.sequence-lock-seal-flight\s*\{[\s\S]*?animation:\s*sequence-lock-seal-flight 850ms/);
    expect(styles).toMatch(/\.sequence-lock-game\.feedback-correct \.sequence-lock-slots\s*\{[\s\S]*?sequence-lock-answer-correct 850ms/);
    expect(styles).toContain('.sequence-lock-game.is-paused .sequence-lock-seal-flight');
  });

  it('neutralizes native button metrics around rune symbols on iPadOS', () => {
    const game = readFileSync(
      new URL('../src/components/SequenceLockGame.tsx', import.meta.url),
      'utf8'
    );
    const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

    expect(game.match(/className="sequence-lock-card-symbol"/g)).toHaveLength(2);
    expect(styles).toMatch(/\.sequence-lock-card\s*\{[\s\S]*?-webkit-appearance:\s*none;[\s\S]*?appearance:\s*none;[\s\S]*?padding:\s*0;/);
    expect(styles).toMatch(/\.sequence-lock-card-symbol\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?place-items:\s*center;/);
  });
});
