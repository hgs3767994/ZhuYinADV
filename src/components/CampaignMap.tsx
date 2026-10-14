import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CAMPAIGN_IMAGES } from '../game/campaignAssets';
import { FIRST_CAMPAIGN, type CampaignLevelDefinition } from '../game/campaignConfig';
import type { CampaignSnapshot } from '../game/campaignTypes';
import { Modal } from './Modal';
import { CampaignStarRating } from './CampaignStarRating';

const CAMPAIGN_LEVEL_POSITIONS = [
  { x: 50.01, y: 94.70 },
  { x: 46.28, y: 83.69 },
  { x: 60.58, y: 73.51 },
  { x: 42.62, y: 66.27 },
  { x: 71.58, y: 58.34 },
  { x: 53.94, y: 50.65 },
  { x: 62.87, y: 41.48 },
  { x: 50.61, y: 33.60 },
  { x: 46.94, y: 21.77 },
  { x: 50.01, y: 11.71 },
  { x: 49.93, y: 5.75 }
] as const;

interface CampaignMapProps {
  snapshot: CampaignSnapshot;
  onBack: () => void;
  onReplayIntro: () => void;
  onStartLevel?: (level: CampaignLevelDefinition) => void;
  canStartLevel?: (level: CampaignLevelDefinition) => boolean;
  levelStarting?: boolean;
  startError?: string | null;
  onDismissStartError?: () => void;
}

export function CampaignMap({
  snapshot,
  onBack,
  onReplayIntro,
  onStartLevel,
  canStartLevel,
  levelStarting = false,
  startError,
  onDismissStartError
}: CampaignMapProps) {
  const [selected, setSelected] = useState<CampaignLevelDefinition | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());
  const progressByLevel = useMemo(
    () => new Map(snapshot.levels.map((progress) => [progress.levelId, progress])),
    [snapshot.levels]
  );
  const totalStars = snapshot.levels.reduce((total, progress) => total + progress.bestStars, 0);
  const chapterComplete = Boolean(snapshot.chapter?.completedAt);
  const focusLevelId = (() => {
    const firstIncomplete = FIRST_CAMPAIGN.levels.find((level) => {
      const progress = progressByLevel.get(level.id);
      return progress && progress.bestStars === 0;
    });
    if (firstIncomplete) return firstIncomplete.id;
    if (chapterComplete && snapshot.chapter?.recentLevelId) return snapshot.chapter.recentLevelId;
    return chapterComplete ? 'level-11' : 'level-01';
  })();

  useEffect(() => {
    const node = nodeRefs.current.get(focusLevelId);
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [focusLevelId]);

  const selectedProgress = selected ? progressByLevel.get(selected.id) : undefined;
  const selectedUnlocked = Boolean(selectedProgress);
  const selectedAvailable = Boolean(selected && onStartLevel && (canStartLevel?.(selected) ?? true));
  const previousLevel = selected
    ? FIRST_CAMPAIGN.levels[selected.number - 2]
    : undefined;

  return (
    <main className={`screen campaign-map-screen ${chapterComplete ? 'chapter-complete' : ''}`}>
      <header className="campaign-map-header">
        <button type="button" className="campaign-map-back" onClick={onBack} aria-label="返回模式選擇">
          ←
        </button>
        <strong className="campaign-map-title">第一章・被封印的王國之聲</strong>
        <button type="button" className="campaign-story-replay" onClick={onReplayIntro}>
          重看章節故事
        </button>
        <div className="campaign-map-star-total" aria-label={`星星蒐集進度 ${totalStars}／33`}>
          <img src={CAMPAIGN_IMAGES.star} alt="" aria-hidden="true" />
          <strong>{totalStars}/33</strong>
        </div>
      </header>

      <div className="campaign-map-scroll">
        <div className="campaign-map-artboard">
          <img className="campaign-map-art" src={CAMPAIGN_IMAGES.chapterOneMap} alt="" aria-hidden="true" draggable="false" />
          <ol className="campaign-level-list" aria-label="第一章關卡地圖">
          {FIRST_CAMPAIGN.levels.map((level) => {
            const progress = progressByLevel.get(level.id);
            const unlocked = Boolean(progress);
            const completed = Boolean(progress && progress.bestStars > 0);
            const current = level.id === focusLevelId && !chapterComplete;
            const position = CAMPAIGN_LEVEL_POSITIONS[level.number - 1];
            return (
              <li
                key={level.id}
                style={{
                  '--campaign-level-x': `${position.x}%`,
                  '--campaign-level-y': `${position.y}%`
                } as CSSProperties}
              >
                <button
                  ref={(node) => {
                    if (node) nodeRefs.current.set(level.id, node);
                    else nodeRefs.current.delete(level.id);
                  }}
                  type="button"
                  className={`campaign-level-node ${unlocked ? 'unlocked' : 'locked'} ${completed ? 'completed' : ''} ${current ? 'current' : ''} ${level.number === 11 ? 'boss' : ''}`}
                  onClick={() => setSelected(level)}
                  aria-label={`第 ${level.number} 關 ${level.title}，${completed ? `${progress?.bestStars} 星通關` : unlocked ? '可挑戰' : '尚未解鎖'}`}
                >
                  <span className="campaign-level-number">{level.number}</span>
                  <span className="campaign-level-status" aria-hidden="true">
                    {completed
                      ? <CampaignStarRating stars={progress?.bestStars ?? 0} className="campaign-map-node-stars" />
                      : unlocked ? '可挑戰' : '🔒'}
                  </span>
                </button>
              </li>
            );
          })}
          </ol>
        </div>
      </div>

      {chapterComplete && <div className="campaign-complete-ribbon">第一章完成</div>}

      {selected && (
        <Modal title={`第 ${selected.number} 關・${selected.title}`} className="campaign-level-modal">
          {selectedUnlocked ? (
            <>
              <p className="campaign-level-difficulty">{selected.difficultyLabel}</p>
              <p className="campaign-level-objective">{selected.objective}</p>
              <div className="campaign-level-best">
                <span>歷史最佳</span>
                {selectedProgress && selectedProgress.bestStars > 0
                  ? <CampaignStarRating stars={selectedProgress.bestStars} className="campaign-modal-stars" />
                  : <strong>尚未通關</strong>}
              </div>
              {startError && <p className="campaign-inline-error campaign-level-start-error">{startError}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="primary-button"
                  disabled={!selectedAvailable || levelStarting}
                  onClick={() => onStartLevel?.(selected)}
                >
                  {levelStarting
                    ? '正在準備…'
                    : selectedAvailable
                      ? selectedProgress && selectedProgress.bestStars > 0 ? '重新挑戰' : '開始挑戰'
                      : '關卡流程建置中'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    onDismissStartError?.();
                    setSelected(null);
                  }}
                >
                  返回地圖
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="campaign-level-objective">
                必須先完成第 {previousLevel?.number} 關「{previousLevel?.title}」才能解鎖。
              </p>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setSelected(null)}>
                  返回地圖
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </main>
  );
}
