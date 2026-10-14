interface CampaignGuestNoticeProps {
  onContinue: () => void;
  onBack: () => void;
}

export function CampaignGuestNotice({ onContinue, onBack }: CampaignGuestNoticeProps) {
  return (
    <main className="screen campaign-notice-screen">
      <section className="campaign-notice-card" role="dialog" aria-modal="true" aria-labelledby="campaign-guest-title">
        <div className="campaign-notice-symbol" aria-hidden="true">!</div>
        <h1 id="campaign-guest-title">訪客進度提醒</h1>
        <p>訪客進度不會永久保存，跳出訪客模式後記錄即會清空</p>
        <div className="campaign-notice-actions">
          <button type="button" className="primary-button" onClick={onContinue}>
            繼續以訪客遊玩
          </button>
          <button type="button" className="secondary-button" onClick={onBack}>
            返回模式選擇
          </button>
        </div>
      </section>
    </main>
  );
}
