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
  const artVersion = previewParams.get('v');
  const connectedDungeon = !dungeonPreview ? undefined : artVersion === 'dungeon-full-test-1' ? 'full'
    : artVersion === 'dungeon-route-test-1' ? 'sample' : undefined;
  const threeProngSample = dungeonPreview && artVersion === 'dungeon-art-test-3';
  const mossyRoadSample = threeProngSample || (dungeonPreview && artVersion === 'dungeon-art-test-2');
  const artSample = mossyRoadSample || (dungeonPreview && artVersion === 'dungeon-art-test-1');
  const waitingToStart = dungeonPreview && !started;

  return (
    <main className={`screen campaign-gameplay-screen sound-maze-prototype-preview${artSample ? ' dungeon-art-preview' : ''}${mossyRoadSample ? ' dungeon-mossy-road-preview' : ''}${threeProngSample ? ' dungeon-three-prong-preview' : ''}`}>
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
            {connectedDungeon === 'full' ? `聲音碎片 ${fragmentCount}／3` : connectedDungeon === 'sample'
              ? '雙岔路銜接測試' : artSample ? '第一個岔路・美術樣板' : dungeonPreview ? '三岔路灰盒測試' : '完整路線測試'}
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
          connectedDungeon={connectedDungeon}
          onFragmentCountChange={setFragmentCount}
          onInteractionLockChange={() => undefined}
          onSolved={() => { if (connectedDungeon === 'full') setFinished(true); }}
        />}
      </section>
    </main>
  );
}
