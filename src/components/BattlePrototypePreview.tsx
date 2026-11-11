import { useCallback, useEffect, useMemo, useState } from 'react';
import { audioService } from '../services/audio';
import {
  createGuestProfile,
  profileRepository,
  type PlayerProfile
} from '../services/profileRepository';
import { BattleGame, type BattleGameStatus } from './BattleGame';

type PreviewResult = 'playing' | 'defeat' | 'solved';

const INITIAL_STATUS: BattleGameStatus = {
  waveNumber: 1,
  lives: 5,
  energy: 0
};

export function BattlePrototypePreview() {
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('guest');
  const [loading, setLoading] = useState(true);
  const [runId, setRunId] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<PreviewResult>('playing');
  const [status, setStatus] = useState<BattleGameStatus>(INITIAL_STATUS);

  useEffect(() => {
    let cancelled = false;
    profileRepository.list()
      .then((storedProfiles) => {
        if (cancelled) return;
        setProfiles(storedProfiles);
        if (storedProfiles[0]) setSelectedProfileId(storedProfiles[0].id);
      })
      .catch(() => {
        if (!cancelled) setSelectedProfileId('guest');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      audioService.stopSpeech();
    };
  }, []);

  const guest = useMemo(() => createGuestProfile(), []);
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? guest;

  const startRun = useCallback(async () => {
    await audioService.unlock();
    setRunId((current) => current + 1);
    setStatus(INITIAL_STATUS);
    setResult('playing');
    setPaused(false);
    setStarted(true);
  }, []);

  if (!started) {
    return (
      <main className="pursuit-prototype-screen battle-prototype-screen">
        <section className="pursuit-prototype-launcher">
          <small>第 1-5 關美術工程・第二階段</small>
          <h1>攻防動畫測試</h1>
          <p>檢查玩家攻擊、敵人攻擊、防禦成功、符音穿透與回音護盾的動畫時序。</p>
          <label>
            <span>冒險者頭像</span>
            <select
              value={selectedProfileId}
              disabled={loading}
              onChange={(event) => setSelectedProfileId(event.target.value)}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
              <option value="guest">訪客模式預設頭像</option>
            </select>
          </label>
          <button type="button" className="primary-button" disabled={loading} onClick={() => void startRun()}>
            開始測試
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="pursuit-prototype-screen battle-prototype-screen">
      <header className="pursuit-prototype-toolbar">
        <div>
          <strong>第 {status.waveNumber}／5 波</strong>
          <span>生命 {status.lives}／5　聲音能量 {status.energy}／5</span>
        </div>
        <button type="button" className="secondary-button" onClick={() => setPaused((current) => !current)}>
          {paused ? '繼續' : '暫停'}
        </button>
      </header>

      {result === 'playing' ? (
        <BattleGame
          key={`battle-art-preview-${runId}`}
          variant="beginner"
          avatarRecipe={selectedProfile.avatar}
          resultId={`battle-art-preview-${runId}`}
          paused={paused}
          inputEnabled={!paused}
          tutorialTipsSeen={{ correct: true, wrong: true, energy: true, shield: true }}
          onTutorialTipSeen={() => undefined}
          onStatusChange={setStatus}
          onInteractionLockChange={() => undefined}
          onDefeat={() => setResult('defeat')}
          onSolved={() => setResult('solved')}
        />
      ) : (
        <section className="pursuit-prototype-result">
          <h2>{result === 'solved' ? '五波測試完成' : '生命歸零'}</h2>
          <p>可重新開始以檢查不同頭像、敵人數量及能量按鈕狀態。</p>
          <button type="button" className="primary-button" onClick={() => void startRun()}>重新測試</button>
        </section>
      )}
    </main>
  );
}
