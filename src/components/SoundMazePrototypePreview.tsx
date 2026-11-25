import { useState } from 'react';
import { CAMPAIGN_IMAGES } from '../game/campaignAssets';
import { audioService } from '../services/audio';
import { SoundMazeGame } from './SoundMazeGame';

export function SoundMazePrototypePreview() {
  const [fragmentCount, setFragmentCount] = useState(0);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const previewParams = new URLSearchParams(window.location.search);
  const dungeonPreview = previewParams.get('preview') === 'sound-maze-dungeon';
  const waitingToStart = dungeonPreview && !started;

  return (
    <main className="screen campaign-gameplay-screen sound-maze-prototype-preview">
      <header className="campaign-gameplay-header">
        <button
          type="button"
          className="campaign-gameplay-edge-button campaign-gameplay-pause-button"
          aria-label={paused ? '繼續完整路線測試' : '暫停完整路線測試'}
          aria-pressed={paused}
          disabled={waitingToStart || finished}
          onClick={() => setPaused((current) => !current)}
        >
          <img src={CAMPAIGN_IMAGES.pauseButton} alt="" aria-hidden="true" draggable="false" />
        </button>
        <div className="campaign-gameplay-heading">
          <strong>{dungeonPreview ? '第 7 關・地下秘道' : '第 2 關・迷霧之路'}</strong>
          <div aria-label={`已收集 ${fragmentCount} 枚聲音碎片`}>
            {dungeonPreview ? `聲音碎片 ${fragmentCount}／3` : '完整路線測試'}
          </div>
        </div>
        <span className="campaign-gameplay-header-spacer" aria-hidden="true" />
      </header>
      <section className="campaign-gameplay-stage">
        {finished ? (
          <div className="campaign-gameplay-placeholder sequence-lock-preview-panel">
            <strong role="status">已收集三枚聲音碎片並離開秘道</strong>
            <button type="button" className="primary-button" onClick={() => {
              audioService.unlock(false);
              setFragmentCount(0);
              setPaused(false);
              setFinished(false);
            }}>重新測試</button>
          </div>
        ) : waitingToStart ? (
          <button type="button" className="primary-button" onClick={() => {
            audioService.unlock(false);
            setStarted(true);
          }}>
            開始測試並啟用語音
          </button>
        ) : <SoundMazeGame
          variant={dungeonPreview ? 'dungeon-fork' : 'fork'}
          resultId={dungeonPreview ? 'sound-maze-dungeon-prototype' : 'sound-maze-corridor-prototype'}
          paused={paused}
          inputEnabled={!paused}
          suppressAudio={!dungeonPreview}
          onFragmentCountChange={setFragmentCount}
          onInteractionLockChange={() => undefined}
          onSolved={() => { if (dungeonPreview) setFinished(true); }}
        />}
      </section>
    </main>
  );
}
