import { useState, type FormEvent } from 'react';
import type { PlayerProfile } from '../services/profileRepository';

interface ResetProfilePasswordProps {
  profile: PlayerProfile;
  onReset: (password: string) => Promise<void>;
  onComplete: () => void;
  onBack: () => void;
}

export function ResetProfilePassword({ profile, onReset, onComplete, onBack }: ResetProfilePasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError('兩次輸入的新密碼不一致');
      return;
    }
    setSubmitting(true);
    try {
      await onReset(password);
      onComplete();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '無法重設密碼');
      setSubmitting(false);
    }
  };

  return (
    <main className="screen account-screen">
      <div className="dark-overlay" />
      <form className="account-panel account-form" onSubmit={submit}>
        <h1>重設「{profile.name}」密碼</h1>
        <label>
          新密碼
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)}
            minLength={4} maxLength={64} autoComplete="new-password" required />
        </label>
        <label>
          再次輸入新密碼
          <input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
            minLength={4} maxLength={64} autoComplete="new-password" required />
        </label>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="account-actions">
          <button className="primary-button" type="submit" disabled={submitting}>儲存新密碼</button>
          <button className="secondary-button" type="button" onClick={onBack}>返回</button>
        </div>
      </form>
    </main>
  );
}
