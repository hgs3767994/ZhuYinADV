import { useState, type FormEvent } from 'react';
import type { ParentPinResult } from '../services/parentSecurity';

interface ParentGateProps {
  title: string;
  onVerify: (pin: string) => Promise<ParentPinResult>;
  onSuccess: () => void;
  onRecovery: () => void;
  onBack: () => void;
}

export function ParentGate({ title, onVerify, onSuccess, onRecovery, onBack }: ParentGateProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await onVerify(pin);
      if (result.ok) {
        onSuccess();
        return;
      }
      if (result.lockedUntil) {
        const seconds = Math.max(1, Math.ceil(
          (new Date(result.lockedUntil).getTime() - Date.now()) / 1_000
        ));
        setError(`錯誤次數過多，請在 ${seconds} 秒後再試`);
      } else {
        setError(`家長 PIN 不正確，還可嘗試 ${result.remainingAttempts} 次`);
      }
      setPin('');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '無法驗證家長 PIN');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="screen account-screen">
      <div className="dark-overlay" />
      <form className="account-panel account-form" onSubmit={submit}>
        <h1>{title}</h1>
        <label>
          家長 PIN
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]{6}"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
            autoComplete="current-password"
            autoFocus
            required
          />
        </label>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="account-actions">
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? '確認中…' : '確認'}
          </button>
          <button className="text-button" type="button" onClick={onRecovery}>忘記家長 PIN</button>
          <button className="secondary-button" type="button" onClick={onBack}>返回</button>
        </div>
      </form>
    </main>
  );
}
