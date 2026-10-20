import { useState } from 'react';
import { CAMPAIGN_IMAGES } from '../game/campaignAssets';
import { SoundMazeGame } from './SoundMazeGame';

export function SoundMazePrototypePreview() {
  const [fragmentCount, setFragmentCount] = useState(0);
  const [paused, setPaused] = useState(false);

  return (
    <main className="screen campaign-gameplay-screen sound-maze-prototype-preview">
      <header className="campaign-gameplay-header">
        <button
          type="button"
          className="campaign-gameplay-edge-button campaign-gameplay-pause-button"
          aria-label={paused ? '繼續完整路線測試' : '暫停完整路線測試'}
          aria-pressed={paused}
          onClick={() => setPaused((current) => !current)}
        >
          <img src={CAMPAIGN_IMAGES.pauseButton} alt="" aria-hidden="true" draggable="false" />
        </button>
        <div className="campaign-gameplay-heading">
          <strong>第 2 關・迷霧之路</strong>
          <div aria-label={`已收集 ${fragmentCount} 枚聲音碎片`}>完整路線測試</div>
        </div>
        <span className="campaign-gameplay-header-spacer" aria-hidden="true" />
      </header>
      <section className="campaign-gameplay-stage">
        <SoundMazeGame
          variant="fork"
          resultId="sound-maze-corridor-prototype"
          paused={paused}
          inputEnabled={!paused}
          suppressAudio
          onFragmentCountChange={setFragmentCount}
          onInteractionLockChange={() => undefined}
          onSolved={() => undefined}
        />
      </section>
    </main>
  );
}
