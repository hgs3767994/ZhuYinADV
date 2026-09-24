import { useState, type FormEvent } from 'react';
import type { PlayerProfile } from '../services/profileRepository';
import { ProfileAvatar } from './ProfileAvatar';

interface ParentManagementProps {
  profiles: PlayerProfile[];
  loading: boolean;
  onDelete: (profile: PlayerProfile, confirmationName: string) => Promise<void>;
  onRestore: (profile: PlayerProfile) => Promise<void>;
  onRefresh: () => Promise<void>;
  onChangePin: () => void;
  notice?: string | null;
  onBack: () => void;
}

export function ParentManagement({
  profiles,
  loading,
  onDelete,
  onRestore,
  onRefresh,
  onChangePin,
  notice,
  onBack
}: ParentManagementProps) {
  const [deleting, setDeleting] = useState<PlayerProfile | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitDeletion = async (event: FormEvent) => {
    event.preventDefault();
    if (!deleting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onDelete(deleting, confirmation);
      setDeleting(null);
      setConfirmation('');
      await onRefresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '無法刪除帳號');
    } finally {
      setSubmitting(false);
    }
  };

  const restore = async (profile: PlayerProfile) => {
    setSubmitting(true);
    setError(null);
    try {
      await onRestore(profile);
      await onRefresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '無法恢復帳號');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="screen account-screen">
      <div className="dark-overlay" />
      <section className="account-panel management-panel">
        <h1>家長管理</h1>
        <p className="account-hint">待刪除帳號會保留 7 天，期間可以恢復。</p>
        {notice && <p className="success-message" role="status">{notice}</p>}
        {error && <p className="error-message" role="alert">{error}</p>}

        {deleting ? (
          <form className="delete-confirmation" onSubmit={submitDeletion}>
            <h2>刪除「{deleting.name}」？</h2>
            <p className="warning-copy">
              帳號會立即隱藏，7 天後永久刪除頭像、成績、等級與學習紀錄。
            </p>
            <label>
              輸入完整帳號名稱以確認
              <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
            </label>
            <div className="modal-actions horizontal">
              <button className="danger-button" type="submit" disabled={submitting}>排程刪除</button>
              <button className="secondary-button" type="button" onClick={() => setDeleting(null)}>取消</button>
            </div>
          </form>
        ) : (
          <div className="management-list">
            {loading ? <p>讀取帳號中…</p> : profiles.length === 0 ? (
              <p className="empty-state">目前沒有正式帳號</p>
            ) : profiles.map((profile) => (
              <article className="management-row" key={profile.id}>
                <ProfileAvatar profile={profile} />
                <div>
                  <strong>{profile.name}</strong>
                  {profile.scheduledDeletionAt && (
                    <small>
                      預計 {new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium' })
                        .format(new Date(profile.scheduledDeletionAt))} 永久刪除
                    </small>
                  )}
                </div>
                {profile.scheduledDeletionAt ? (
                  <button className="secondary-button compact-button" disabled={submitting}
                    onClick={() => void restore(profile)}>恢復</button>
                ) : (
                  <button className="danger-button compact-button" disabled={submitting}
                    onClick={() => setDeleting(profile)}>刪除</button>
                )}
              </article>
            ))}
          </div>
        )}

        {!deleting && (
          <div className="account-actions management-actions">
            <button className="secondary-button" onClick={onChangePin}>變更家長 PIN 碼</button>
            <button className="secondary-button" onClick={onBack}>返回帳號選擇</button>
          </div>
        )}
      </section>
    </main>
  );
}
