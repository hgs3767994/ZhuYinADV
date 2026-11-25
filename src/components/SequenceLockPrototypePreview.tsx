import { useState } from 'react';
import { CAMPAIGN_IMAGES } from '../game/campaignAssets';
import { audioService } from '../services/audio';
import { LEVEL_EIGHT_SEAL_COUNT, SEQUENCE_LOCK_SIZES } from '../game/sequenceLock';
import { SequenceLockGame } from './SequenceLockGame';

interface SequenceLockPreviewResult {
  stars: 1 | 2 | 3;
  wrongSequenceCount: number;
  durationMs: number;
}

export function SequenceLockPrototypePreview({ variant = 'entrance' }: { variant?: 'entrance' | 'magic-door' }) {
  const magicDoor = variant === 'magic-door';
  const title = magicDoor ? '魔法之門' : '封印的門扉';
  const totalSeals = magicDoor ? LEVEL_EIGHT_SEAL_COUNT : SEQUENCE_LOCK_SIZES.length;
  const sealLabel = magicDoor ? '五道封印' : '三道封印';
  const [sealCount, setSealCount] = useState<number>(totalSeals);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [runNumber, setRunNumber] = useState(0);
  const [result, setResult] = useState<SequenceLockPreviewResult | null>(null);

  const startTest = () => {
    if (magicDoor) audioService.unlock(false);
    setSealCount(totalSeals);
    setPaused(false);
    setResult(null);
    setRunNumber((current) => current + 1);
    setStarted(true);
  };

  const finishTest = (nextResult: SequenceLockPreviewResult) => {
    setResult(nextResult);
    setStarted(false);
    setPaused(false);
  };

  const subtitle = result
    ? '完整玩法測試完成'
    : started
      ? `剩餘 ${sealCount} 道封印`
      : '完整玩法動畫測試';

  return (
    <main className="screen campaign-gameplay-screen">
      <header className="campaign-gameplay-header">
        <button
          type="button"
          className="campaign-gameplay-edge-button campaign-gameplay-pause-button"
          disabled={!started}
          aria-label={paused ? '繼續大門測試' : '暫停大門測試'}
          aria-pressed={paused}
          onClick={() => setPaused((current) => !current)}
        >
          <img src={CAMPAIGN_IMAGES.pauseButton} alt="" aria-hidden="true" draggable="false" />
        </button>
        <div className="campaign-gameplay-heading">
          <strong>第 {magicDoor ? 8 : 1} 關・{title}</strong>
          {(!magicDoor || !started) && <div>{subtitle}</div>}
        </div>
        <span className="campaign-gameplay-header-spacer" aria-hidden="true" />
      </header>
      <section className="campaign-gameplay-stage">
        {result ? (
          <div className="campaign-gameplay-placeholder sequence-lock-preview-panel" role="status">
            <strong>{sealLabel}已全部解除</strong>
            <p aria-label={`${result.stars} 顆星`} className="sequence-lock-preview-stars">
              {'★'.repeat(result.stars)}{'☆'.repeat(3 - result.stars)}
            </p>
            <p>錯誤次數：{result.wrongSequenceCount}</p>
            <button type="button" className="primary-button" onClick={startTest}>
              重新測試
            </button>
          </div>
        ) : started ? (
          <SequenceLockGame
            key={`sequence-lock-preview-${runNumber}`}
            variant={variant}
            resultId={`sequence-lock-gate-gameplay-test-${runNumber}`}
            paused={paused}
            inputEnabled={!paused}
            onSealCountChange={setSealCount}
            onInteractionLockChange={() => undefined}
            onSolved={finishTest}
          />
        ) : (
          <div className="campaign-gameplay-placeholder sequence-lock-preview-panel">
            <strong>{title}・正式玩法測試</strong>
            <p>點擊開始後，聽取咒語並依序放入符文，完成{sealLabel}。</p>
            <button type="button" className="primary-button" onClick={startTest}>
              開始玩法測試
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
