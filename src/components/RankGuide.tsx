import { RANKS } from '../game/experience';
import { assetUrl } from '../utils/assets';

interface RankGuideProps {
  onBack: () => void;
}

export function RankGuide({ onBack }: RankGuideProps) {
  return (
    <main className="screen account-screen">
      <div className="dark-overlay" />
      <section className="account-panel rank-guide-panel" aria-labelledby="rank-guide-title">
        <h1 id="rank-guide-title">動物等級說明</h1>
        <p className="rank-guide-intro">
          當冒險者透過一般模式、無限模式完成練習時，會獲得經驗值，隨著經驗值累積可以提升冒險者等級
        </p>

        <ol className="rank-guide-list" aria-label="動物等級列表">
          {RANKS.map((rank, index) => (
            <li key={rank.id} data-rank-id={rank.id}>
              <span>第{index + 1}級</span>
              <strong>{rank.name}</strong>
              <img
                src={assetUrl(`assets/images/ranks/${rank.id}.png`)}
                alt={`${rank.name}圖案`}
              />
            </li>
          ))}
        </ol>

        <button type="button" className="secondary-button rank-guide-back" onClick={onBack}>
          返回上一頁
        </button>
      </section>
    </main>
  );
}
