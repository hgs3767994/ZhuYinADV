import { NORMAL_QUESTION_COUNT } from '../game/config';
import { getNormalStars } from '../game/engine';
import type { GameResult, LeaderboardPage } from '../game/types';
import { Modal } from './Modal';

interface ResultModalProps {
  result: GameResult;
  onReplay: () => void;
  onLeaderboard: (page: LeaderboardPage) => void;
  onMenu: () => void;
}

export function ResultModal({ result, onReplay, onLeaderboard, onMenu }: ResultModalProps) {
  const normal = result.modeId === 'normal';
  const rating = getNormalStars(result.score);
  const starText = normal
    ? `${rating.crowned ? '👑 ' : ''}${'⭐'.repeat(rating.stars)}`
    : '🏆';
  const page: LeaderboardPage = normal ? (result.difficultyId ?? 'easy') : 'endless';

  return (
    <Modal title={normal ? '🎉 冒險完成' : '👍 冒險結束'} labelledBy="result-title">
      <div
        className="result-stars"
        aria-label={normal ? `${rating.stars} 顆星` : '無限模式獎盃'}
      >
        {starText}
      </div>
      <p className="result-summary">
        最終得分：<strong>{result.score}</strong> 分
        <br />
        {normal
          ? `成功完成 ${NORMAL_QUESTION_COUNT} 題考驗！`
          : `總共答對 ${result.correctCount} 題！`}
      </p>
      <div className="modal-actions">
        <button className="primary-button" onClick={onReplay}>再玩一次</button>
        <button className="secondary-button" onClick={() => onLeaderboard(page)}>查看冒險紀錄</button>
        <button className="secondary-button" onClick={onMenu}>返回模式選擇</button>
      </div>
    </Modal>
  );
}
