import { useState } from 'react';

const INTRO_PAGES = [
  '很久以前，注音王國是一個充滿聲音與魔法的祥和國度。',
  '有一天，寂靜王國的黑魔王率領迷霧大軍，攻入了注音王國。',
  '黑魔王利用封印魔法水晶，奪走了王國居民的聲音。',
  '之後，黑魔王返回寂靜王國，由迷霧將軍率軍駐守城堡，守護魔法封印水晶。',
  '就在所有人失去希望時，一位擁有注音水晶之力的冒險者來到了王國……'
] as const;

interface CampaignIntroProps {
  replay?: boolean;
  onComplete: () => Promise<void> | void;
  onBack: () => void;
}
export function CampaignIntro({ replay = false, onComplete, onBack }: CampaignIntroProps) {
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = INTRO_PAGES[page];

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onComplete();
    } catch {
      setError(replay ? '無法返回第一章地圖，請再試一次。' : '無法建立第一章進度，請再試一次。');
      setSaving(false);
    }
  };

  return (
    <main className="screen campaign-intro-screen">
      <header className="campaign-intro-header">
        <button type="button" className="campaign-text-button" onClick={onBack} disabled={saving}>
          返回
        </button>
        <span>第一章・被封印的王國之聲</span>
        <button type="button" className="campaign-text-button" onClick={() => void finish()} disabled={saving}>
          跳過
        </button>
      </header>

      <section className="campaign-story-stage" aria-live="polite">
        <div className={`campaign-story-placeholder story-page-${page + 1}`} aria-hidden="true">
          <span>{page + 1}</span>
        </div>
        <div className="campaign-story-card">
          <p>{current}</p>
        </div>
      </section>

      <footer className="campaign-intro-footer">
        <div className="campaign-story-dots" aria-label={`第 ${page + 1} 頁，共 ${INTRO_PAGES.length} 頁`}>
          {INTRO_PAGES.map((item, index) => (
            <span key={item} className={index === page ? 'active' : ''} />
          ))}
        </div>
        {error && <p className="campaign-inline-error" role="alert">{error}</p>}
        <div className="campaign-story-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
            disabled={page === 0 || saving}
          >
            上一頁
          </button>
          {page < INTRO_PAGES.length - 1 ? (
            <button
              type="button"
              className="primary-button"
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={saving}
            >
              下一頁
            </button>
          ) : (
            <button type="button" className="primary-button" onClick={() => void finish()} disabled={saving}>
              {saving ? '正在前往地圖…' : replay ? '返回地圖' : '前往第一章地圖'}
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}
