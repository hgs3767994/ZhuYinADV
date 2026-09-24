import { useState, type FormEvent } from 'react';
import type { PlayerProfile } from '../services/profileRepository';
import { ProfileAvatar } from './ProfileAvatar';

interface ProfileLoginProps {
  profile: PlayerProfile;
  onLogin: (password: string) => Promise<void>;
  onBack: () => void;
}

export function ProfileLogin({ profile, onLogin, onBack }: ProfileLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onLogin(password);
      setSubmitting(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '無法登入');
      setSubmitting(false);
    }
  };

  return (
    <main className="screen account-screen">
      <div className="dark-overlay" />
      <form className="account-panel account-form login-form" onSubmit={submit}>
        <ProfileAvatar profile={profile} size="large" />
        <h1>{profile.name}</h1>
        <label>
          輸入密碼
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            autoFocus
            maxLength={64}
            required
          />
        </label>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="account-actions">
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? '確認中…' : '進入冒險'}
          </button>
          <button className="secondary-button" type="button" onClick={onBack} disabled={submitting}>
            返回帳號選擇
          </button>
        </div>
      </form>
    </main>
  );
}
