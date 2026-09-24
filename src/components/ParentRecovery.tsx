import { useState, type FormEvent } from 'react';

interface ParentRecoveryProps {
  onReset: (recoveryCode: string, newPin: string) => Promise<string>;
  onComplete: () => void;
  onBack: () => void;
}

export function ParentRecovery({ onReset, onComplete, onBack }: ParentRecoveryProps) {
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [nextCode, setNextCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (pin !== confirmation) {
      setError('兩次輸入的新 PIN 不一致');
      return;
    }
    setSubmitting(true);
    try {
      setNextCode(await onReset(code, pin));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '無法重設家長 PIN');
    } finally {
      setSubmitting(false);
    }
  };

  if (nextCode) {
    return (
      <main className="screen account-screen">
        <div className="dark-overlay" />
        <section className="account-panel recovery-panel">
          <h1>家長 PIN 已重設</h1>
          <p className="account-hint">舊復原碼已失效，請保存新的復原碼。</p>
          <output className="recovery-code">{nextCode}</output>
          <button className="primary-button" onClick={onComplete}>我已保存，繼續</button>
        </section>
      </main>
    );
  }

  return (
    <main className="screen account-screen">
      <div className="dark-overlay" />
      <form className="account-panel account-form" onSubmit={submit}>
        <h1>重設家長 PIN</h1>
        <label>
          家長復原碼
          <input value={code} onChange={(event) => setCode(event.target.value)} autoCapitalize="characters" required />
        </label>
        <label>
          新的 6 位數 PIN
          <input type="password" inputMode="numeric" pattern="[0-9]{6}" value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} required />
        </label>
        <label>
          再次輸入新 PIN
          <input type="password" inputMode="numeric" pattern="[0-9]{6}" value={confirmation}
            onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, '').slice(0, 6))} required />
        </label>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="account-actions">
          <button className="primary-button" type="submit" disabled={submitting}>重設家長 PIN</button>
          <button className="secondary-button" type="button" onClick={onBack}>返回</button>
        </div>
      </form>
    </main>
  );
}
