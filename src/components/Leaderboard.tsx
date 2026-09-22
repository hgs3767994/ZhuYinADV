import { useEffect, useState } from 'react';
import { DEVICE_PROFILE_ID } from '../game/config';
import type { GameResult, LeaderboardPage } from '../game/types';
import { resultRepository } from '../services/resultsRepository';
import { Modal } from './Modal';

const PAGES: Array<{ id: LeaderboardPage; label: string }> = [
  { id: 'easy', label: '新手' },
  { id: 'normal', label: '專家' },
  { id: 'hard', label: '菁英' },
  { id: 'endless', label: '無限' }
];

interface LeaderboardProps {
  initialPage?: LeaderboardPage;
  onClose: () => void;
}

export function Leaderboard({ initialPage = 'easy', onClose }: LeaderboardProps) {
  const [page, setPage] = useState<LeaderboardPage>(initialPage);
  const [records, setRecords] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    resultRepository
      .leaderboard(DEVICE_PROFILE_ID, page)
      .then((next) => {
        if (!cancelled) setRecords(next);
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <Modal title="🏆 冒險紀錄殿堂" labelledBy="leaderboard-title">
      <div className="leaderboard-tabs" role="tablist" aria-label="排行榜模式">
        {PAGES.map((item) => (
          <button
            key={item.id}
            className={page === item.id ? 'active' : ''}
            onClick={() => setPage(item.id)}
            role="tab"
            aria-selected={page === item.id}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="leaderboard-list" role="tabpanel">
        {loading ? (
          <p>讀取冒險紀錄中…</p>
        ) : records.length === 0 ? (
          <p className="empty-state">尚無冒險紀錄</p>
        ) : (
          records.map((record, index) => (
            <div className="leaderboard-row" key={record.id}>
              <span>第 {index + 1} 名</span>
              <strong>{record.score} 分</strong>
              <time dateTime={record.playedAt}>
                {new Intl.DateTimeFormat('zh-TW').format(new Date(record.playedAt))}
              </time>
            </div>
          ))
        )}
      </div>

      <button className="primary-button" onClick={onClose}>回選單</button>
    </Modal>
  );
}
