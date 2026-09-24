import type { PlayerProfile } from '../services/profileRepository';
import { ProfileAvatar } from './ProfileAvatar';

interface ProfileSelectionProps {
  profiles: PlayerProfile[];
  loading: boolean;
  error: string | null;
  onSelect: (profile: PlayerProfile) => void;
  onCreate: () => void;
  onGuest: () => void;
  parentConfigured: boolean;
  onParentManagement: () => void;
  onBack: () => void;
  onRetry: () => void;
}

export function ProfileSelection({
  profiles,
  loading,
  error,
  onSelect,
  onCreate,
  onGuest,
  parentConfigured,
  onParentManagement,
  onBack,
  onRetry
}: ProfileSelectionProps) {
  return (
    <main className="screen account-screen">
      <div className="dark-overlay" />
      <section className="account-panel" aria-labelledby="profile-selection-title">
        <h1 id="profile-selection-title">選擇冒險家</h1>
        <p className="account-hint">選擇自己的帳號，繼續累積冒險紀錄。</p>

        <div className="profile-list">
          {loading ? (
            <p className="account-status">讀取帳號中…</p>
          ) : error ? (
            <div className="account-status error-message">
              <p>{error}</p>
              <button className="secondary-button" onClick={onRetry}>重新讀取</button>
            </div>
          ) : profiles.length === 0 ? (
            <p className="account-status">還沒有帳號，建立第一位冒險家吧！</p>
          ) : profiles.map((profile) => (
            <button
              className="profile-choice"
              key={profile.id}
              onClick={() => onSelect(profile)}
            >
              <ProfileAvatar profile={profile} size="large" />
              <strong>{profile.name}</strong>
            </button>
          ))}
        </div>

        <div className="account-actions">
          <button className="primary-button" onClick={onCreate}>新增帳號</button>
          <button className="secondary-button" onClick={onGuest}>訪客進入</button>
          <button className="secondary-button" onClick={onParentManagement}>
            {parentConfigured ? '家長管理' : '設定家長 PIN'}
          </button>
          <button className="text-button" onClick={onBack}>返回歡迎頁</button>
        </div>
      </section>
    </main>
  );
}
