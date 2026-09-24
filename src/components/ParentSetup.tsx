import { useState, type FormEvent } from 'react';

interface ParentSetupProps {
  onSetup: (pin: string) => Promise<string>;
  onComplete: () => void;
  onBack: () => void;
}

export function ParentSetup({ onSetup, onComplete, onBack }: ParentSetupProps) {
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (pin !== confirmation) {
      setError('兩次輸入的家長 PIN 不一致');
      return;
    }
    setSubmitting(true);
    try {
      setRecoveryCode(await onSetup(pin));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '無法設定家長 PIN');
    } finally {
      setSubmitting(false);
    }
  };

  if (recoveryCode) {
    return (
      <main className="screen account-screen">
        <div className="dark-overlay" />
        <section className="account-panel recovery-panel">
          <h1>保存家長復原碼</h1>
          <p className="account-hint">忘記家長 PIN 時，只有這組復原碼可以重設。</p>
          <output className="recovery-code">{recoveryCode}</output>
          <p className="warning-copy">請抄寫並保存在安全位置。離開後不會再次顯示。</p>
          <button className="primary-button" onClick={onComplete}>我已保存，繼續</button>
        </section>
      </main>
    );
  }

  return (
    <main className="screen account-screen">
      <div className="dark-overlay" />
      <form className="account-panel account-form" onSubmit={submit}>
        <h1>設定家長 PIN</h1>
        <p className="account-hint">高權限操作才會要求輸入，不影響孩子平常登入。</p>
        <label>
          6 位數家長 PIN
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]{6}"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
            autoComplete="new-password"
            required
          />
        </label>
        <label>
          再次輸入家長 PIN
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]{6}"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, '').slice(0, 6))}
            autoComplete="new-password"
            required
          />
        </label>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="account-actions">
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? '設定中…' : '設定家長 PIN'}
          </button>
          <button className="secondary-button" type="button" onClick={onBack} disabled={submitting}>
            返回
          </button>
        </div>
      </form>
    </main>
  );
}
