import { useState, type FormEvent } from 'react';
import type { ParentPinResult } from '../services/parentSecurity';

interface ChangeParentPinProps {
  onChange: (currentPin: string, newPin: string) => Promise<ParentPinResult>;
  onComplete: () => void;
  onBack: () => void;
}

function normalizePin(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function ChangeParentPin({ onChange, onComplete, onBack }: ChangeParentPinProps) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (newPin !== confirmation) {
      setError('兩次輸入的新家長 PIN 不一致');
      return;
    }

    setSubmitting(true);
    try {
      const result = await onChange(currentPin, newPin);
      if (result.ok) {
        onComplete();
        return;
      }
      if (result.lockedUntil) {
        const seconds = Math.max(1, Math.ceil(
          (new Date(result.lockedUntil).getTime() - Date.now()) / 1_000
        ));
        setError(`錯誤次數過多，請在 ${seconds} 秒後再試`);
      } else {
        setError(`目前的家長 PIN 不正確，還可嘗試 ${result.remainingAttempts} 次`);
      }
      setCurrentPin('');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '無法變更家長 PIN');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="screen account-screen">
      <div className="dark-overlay" />
      <form className="account-panel account-form" onSubmit={submit}>
        <h1>變更家長 PIN 碼</h1>
        <p className="account-hint">變更 PIN 不會改變原本的家長復原碼。</p>
        <label>
          目前的家長 PIN
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]{6}"
            value={currentPin}
            onChange={(event) => setCurrentPin(normalizePin(event.target.value))}
            autoComplete="current-password"
            autoFocus
            required
          />
        </label>
        <label>
          新的家長 PIN
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]{6}"
            value={newPin}
            onChange={(event) => setNewPin(normalizePin(event.target.value))}
            autoComplete="new-password"
            required
          />
        </label>
        <label>
          再次輸入新的家長 PIN
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]{6}"
            value={confirmation}
            onChange={(event) => setConfirmation(normalizePin(event.target.value))}
            autoComplete="new-password"
            required
          />
        </label>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="account-actions">
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? '變更中…' : '確認變更'}
          </button>
          <button className="secondary-button" type="button" onClick={onBack} disabled={submitting}>
            返回家長管理
          </button>
        </div>
      </form>
    </main>
  );
}
