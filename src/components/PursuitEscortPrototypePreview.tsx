import { useCallback, useEffect, useMemo, useState } from 'react';
import { initialPursuitState } from '../game/pursuit';
import { audioService } from '../services/audio';
import {
  createGuestProfile,
  profileRepository,
  type PlayerProfile
} from '../services/profileRepository';
import { PursuitGame, type PursuitGameStatus } from './PursuitGame';

const INITIAL_STATUS: PursuitGameStatus = {
  segmentNumber: 1,
  ...initialPursuitState()
};

type PreviewResult = 'playing' | 'defeat' | 'solved';

export function PursuitEscortPrototypePreview() {
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('guest');
  const [loading, setLoading] = useState(true);
  const [runId, setRunId] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<PreviewResult>('playing');
  const [status, setStatus] = useState<PursuitGameStatus>(INITIAL_STATUS);

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
      <main className="pursuit-prototype-screen">
        <section className="pursuit-prototype-launcher">
          <small>第 1-4 關美術工程</small>
          <h1>紙偶森林護送測試</h1>
          <p>檢查雙層森林捲動、人物紙偶步行、黑霧距離與正式答題流程。</p>
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
    <main className="pursuit-prototype-screen">
      <header className="pursuit-prototype-toolbar">
        <div>
          <strong>第 {status.segmentNumber} / 10 段</strong>
          <span>安全距離 {status.safetyDistance}　連續答對 {status.successStreak}</span>
        </div>
        <button type="button" className="secondary-button" onClick={() => setPaused((current) => !current)}>
          {paused ? '繼續' : '暫停'}
        </button>
      </header>

      {result === 'playing' ? (
        <PursuitGame
          key={runId}
          variant="escort"
          avatarRecipe={selectedProfile.avatar}
          resultId={`pursuit-art-preview-${runId}`}
          paused={paused}
          inputEnabled={!paused}
          onStatusChange={setStatus}
          onInteractionLockChange={() => undefined}
          onDefeat={() => setResult('defeat')}
          onSolved={() => setResult('solved')}
        />
      ) : (
        <section className="pursuit-prototype-result">
          <h2>{result === 'solved' ? '護送完成' : '被黑霧追上了'}</h2>
          <p>{result === 'solved' ? '紙偶劇場完整流程播放完畢。' : '可重新測試黑霧的逼近與退離效果。'}</p>
          <button type="button" className="primary-button" onClick={() => void startRun()}>重新測試</button>
        </section>
      )}
    </main>
  );
}
