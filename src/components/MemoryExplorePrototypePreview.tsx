import { useState } from 'react';
import { CAMPAIGN_IMAGES } from '../game/campaignAssets';
import { audioService } from '../services/audio';
import { MemoryExploreGame } from './MemoryExploreGame';

interface MemoryExplorePreviewResult {
  stars: 1 | 2 | 3;
  wrongPairCount: number;
  remainingLives: number;
  durationMs: number;
}

export function MemoryExplorePrototypePreview({ variant = 'explore' }: { variant?: 'explore' | 'battle' }) {
  const barrier = variant === 'battle';
  const title = barrier ? '破除結界' : '遺失的聲音';
  const [sealCount, setSealCount] = useState(5);
  const [lives, setLives] = useState(5);
  const [defeated, setDefeated] = useState(false);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [runNumber, setRunNumber] = useState(0);
  const [result, setResult] = useState<MemoryExplorePreviewResult | null>(null);

  const startTest = () => {
    audioService.unlock();
    setSealCount(5);
    setLives(5);
    setDefeated(false);
    setPaused(false);
    setResult(null);
    setRunNumber((current) => current + 1);
    setStarted(true);
  };

  const finishTest = (nextResult: MemoryExplorePreviewResult) => {
    setResult(nextResult);
    setStarted(false);
    setPaused(false);
  };

  return (
    <main className="screen campaign-gameplay-screen">
      <header className="campaign-gameplay-header">
        <button
          type="button"
          className="campaign-gameplay-edge-button campaign-gameplay-pause-button"
          disabled={!started}
          aria-label={paused ? `繼續${title}測試` : `暫停${title}測試`}
          aria-pressed={paused}
          onClick={() => setPaused((current) => !current)}
        >
          <img src={CAMPAIGN_IMAGES.pauseButton} alt="" aria-hidden="true" draggable="false" />
        </button>
        <div className="campaign-gameplay-heading">
          <strong>第 {barrier ? 10 : 3} 關・{title}</strong>
          <div>{result ? '五道封印已全部解除' : started ? barrier ? `生命 ${lives}／5` : `剩餘 ${sealCount} 道迷霧封印` : '完整玩法動畫測試'}</div>
        </div>
        <span className="campaign-gameplay-header-spacer" aria-hidden="true" />
      </header>
      <section className="campaign-gameplay-stage">
        {defeated ? (
          <div className="campaign-gameplay-placeholder sequence-lock-preview-panel" role="status">
            <strong>生命歸零</strong>
            <button type="button" className="primary-button" onClick={startTest}>重新測試</button>
          </div>
        ) : result ? (
          <div className="campaign-gameplay-placeholder sequence-lock-preview-panel" role="status">
            <strong>{barrier ? '迷霧結界已解除' : '小亞恢復笑容了'}</strong>
            <p aria-label={`${result.stars} 顆星`} className="sequence-lock-preview-stars">
              {'★'.repeat(result.stars)}{'☆'.repeat(3 - result.stars)}
            </p>
            <p>配對錯誤次數：{result.wrongPairCount}</p>
            <button type="button" className="primary-button" onClick={startTest}>重新測試</button>
          </div>
        ) : started ? (
          <MemoryExploreGame
            key={`memory-village-preview-${runNumber}`}
            variant={variant}
            resultId={`memory-village-art-test-${runNumber}`}
            paused={paused}
            inputEnabled={!paused}
            onSealCountChange={setSealCount}
            onLifeChange={setLives}
            onInteractionLockChange={() => undefined}
            onDefeat={() => {
              setDefeated(true);
              setStarted(false);
              setPaused(false);
            }}
            onSolved={finishTest}
          />
        ) : (
          <div className="campaign-gameplay-placeholder sequence-lock-preview-panel">
            <strong>{title}・完整玩法測試</strong>
            <p>點擊開始以啟用語音，記住九張符文的位置並解除五道封印。</p>
            <button type="button" className="primary-button" onClick={startTest}>開始玩法測試</button>
          </div>
        )}
      </section>
    </main>
  );
}
