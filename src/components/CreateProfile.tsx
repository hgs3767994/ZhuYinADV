import { useEffect, useState, type FormEvent } from 'react';

interface CreateProfileProps {
  initialName?: string;
  initialPassword?: string;
  onContinue: (name: string, password: string) => Promise<void>;
  onBack: () => void;
}

export function CreateProfile({
  initialName = '',
  initialPassword = '',
  onContinue,
  onBack
}: CreateProfileProps) {
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState(initialPassword);
  const [confirmation, setConfirmation] = useState(initialPassword);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(initialName);
    setPassword(initialPassword);
    setConfirmation(initialPassword);
  }, [initialName, initialPassword]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError('兩次輸入的密碼不一致');
      return;
    }
    setSubmitting(true);
    try {
      await onContinue(name, password);
      setSubmitting(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '無法建立帳號');
      setSubmitting(false);
    }
  };

  return (
    <main className="screen account-screen">
      <div className="dark-overlay" />
      <form className="account-panel account-form" onSubmit={submit}>
        <h1>新增冒險家</h1>
        <label>
          帳號名稱
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          密碼
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={4}
            maxLength={64}
            required
          />
        </label>
        <label>
          再次輸入密碼
          <input
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="new-password"
            minLength={4}
            maxLength={64}
            required
          />
        </label>
        <p className="field-note">
          名稱可使用中英文、數字、特殊符號與 Emoji，最多 20 個字元；密碼至少 4 個字元。
        </p>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="account-actions">
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? '檢查中…' : '建立頭像'}
          </button>
          <button className="secondary-button" type="button" onClick={onBack} disabled={submitting}>
            返回帳號選擇
          </button>
        </div>
      </form>
    </main>
  );
}
