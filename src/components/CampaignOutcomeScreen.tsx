import type { CampaignLevelDefinition } from '../game/campaignConfig';
import type { CampaignStars } from '../game/campaignTypes';
import { CampaignStarRating } from './CampaignStarRating';

interface CampaignSuccessScreenProps {
  level: CampaignLevelDefinition;
  stars: CampaignStars;
  performanceLabel: string;
  performanceValue: string;
  xpAwarded: number;
  newBest: boolean;
  newLevelUnlocked: boolean;
  chapterComplete?: boolean;
  onReturnToMap: () => void;
  onRetry: () => void;
}

interface CampaignDefeatScreenProps {
  level: CampaignLevelDefinition;
  message: string;
  onReturnToMap: () => void;
  onRetry: () => void;
}

export function CampaignSuccessScreen({
  level,
  stars,
  performanceLabel,
  performanceValue,
  xpAwarded,
  newBest,
  newLevelUnlocked,
  chapterComplete = false,
  onReturnToMap,
  onRetry
}: CampaignSuccessScreenProps) {
  return (
    <main className="screen campaign-outcome-screen campaign-success-screen">
      <section className="campaign-outcome-card">
        <small>第 {level.number} 關・{level.title}</small>
        <h1>挑戰成功</h1>
        <CampaignStarRating stars={stars} className="campaign-outcome-stars" />
        <div className="campaign-outcome-performance">
          <span>{performanceLabel}</span>
          <strong>{performanceValue}</strong>
        </div>
        <p className="campaign-outcome-xp">本次獲得 {xpAwarded} XP</p>
        {newBest && <p className="campaign-outcome-notice">刷新歷史最佳紀錄</p>}
        {newLevelUnlocked && <p className="campaign-outcome-notice">新關卡已解鎖</p>}
        {chapterComplete && <p className="campaign-outcome-notice campaign-chapter-complete-notice">第一章完成</p>}
        <div className="modal-actions">
          <button type="button" className="primary-button" onClick={onReturnToMap}>返回地圖</button>
          <button type="button" className="secondary-button" onClick={onRetry}>重新挑戰</button>
        </div>
      </section>
    </main>
  );
}

export function CampaignDefeatScreen({
  level,
  message,
  onReturnToMap,
  onRetry
}: CampaignDefeatScreenProps) {
  return (
    <main className="screen campaign-outcome-screen campaign-defeat-screen">
      <section className="campaign-outcome-card">
        <small>第 {level.number} 關・{level.title}</small>
        <h1>挑戰失敗</h1>
        <p className="campaign-defeat-message">{message}</p>
        <div className="modal-actions">
          <button type="button" className="primary-button" onClick={onRetry}>重新挑戰</button>
          <button type="button" className="secondary-button" onClick={onReturnToMap}>返回地圖</button>
        </div>
      </section>
    </main>
  );
}
