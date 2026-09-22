import { useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { GameScreen } from './components/GameScreen';
import { ImageMenuButton } from './components/ImageMenuButton';
import { Leaderboard } from './components/Leaderboard';
import { Modal } from './components/Modal';
import { ResultModal } from './components/ResultModal';
import { APP_VERSION, DIFFICULTY_CONFIG } from './game/config';
import type {
  Difficulty,
  GameMode,
  GameResult,
  LeaderboardPage
} from './game/types';
import { audioService } from './services/audio';
import { resultRepository } from './services/resultsRepository';
import { assetUrl } from './utils/assets';

type Screen = 'welcome' | 'mode' | 'difficulty' | 'game';

interface GameSetup {
  mode: GameMode;
  difficulty: Difficulty | null;
}

export function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const screenRef = useRef<Screen>('welcome');
  const [gameSetup, setGameSetup] = useState<GameSetup>({ mode: 'normal', difficulty: 'easy' });
  const [runId, setRunId] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const resultRef = useRef<GameResult | null>(null);
  const [leaderboardPage, setLeaderboardPage] = useState<LeaderboardPage | null>(null);
  const leaderboardPageRef = useRef<LeaderboardPage | null>(null);
  const [quitConfirmation, setQuitConfirmation] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({ immediate: true });

  const navigate = useCallback((next: Screen) => {
    screenRef.current = next;
    setScreen(next);
  }, []);

  resultRef.current = result;
  leaderboardPageRef.current = leaderboardPage;

  useEffect(() => {
    screenRef.current = screen;
    if (screen === 'game') audioService.pauseBgm();
    else audioService.playBgm();
  }, [screen]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) audioService.pauseBgm();
      else if (screenRef.current !== 'game') audioService.playBgm();
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);

  useEffect(() => {
    history.replaceState({ zhuyinRoot: true }, '', location.href);
    history.pushState({ zhuyinGuard: true }, '', location.href);

    const handleBack = () => {
      if (leaderboardPageRef.current !== null) setLeaderboardPage(null);
      else if (resultRef.current !== null) setResult(null);
      else if (screenRef.current === 'game') setQuitConfirmation(true);
      else if (screenRef.current === 'difficulty') navigate('mode');
      else if (screenRef.current === 'mode') navigate('welcome');
      else {
        history.back();
        return;
      }
      history.pushState({ zhuyinGuard: true }, '', location.href);
    };

    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [navigate]);

  const press = (action: () => void) => {
    audioService.unlock();
    audioService.playDing();
    action();
  };

  const startGame = (mode: GameMode, difficulty: Difficulty | null) => {
    press(() => {
      setGameSetup({ mode, difficulty });
      setResult(null);
      setRunId((current) => current + 1);
      navigate('game');
    });
  };

  const finishGame = async (nextResult: GameResult) => {
    try {
      await resultRepository.save(nextResult);
    } catch (error) {
      console.warn('無法保存冒險紀錄', error);
    } finally {
      setResult(nextResult);
    }
  };

  const returnToMode = () => {
    setResult(null);
    setQuitConfirmation(false);
    navigate('mode');
  };

  const replay = () => {
    setResult(null);
    setRunId((current) => current + 1);
  };

  return (
    <div className="app-shell">
      {screen === 'welcome' && (
        <main
          className="screen welcome-screen"
          style={{ backgroundImage: `url(${assetUrl('assets/images/start_banner.png')})` }}
        >
          <img className="title-image" src={assetUrl('assets/images/title.png')} alt="小小注音冒險家" />
          <button
            className="start-button"
            onClick={() => press(() => navigate('mode'))}
            aria-label="開始冒險"
          >
            <img src={assetUrl('assets/images/start_button.png')} alt="" draggable="false" />
          </button>
          <span className="version-tag">v {APP_VERSION}</span>
        </main>
      )}

      {screen === 'mode' && (
        <main
          className="screen menu-screen"
          style={{ backgroundImage: `url(${assetUrl('assets/images/start_banner.png')})` }}
        >
          <div className="dark-overlay" />
          <div className="menu-stack">
            <ImageMenuButton
              image={assetUrl('assets/images/normal_mode_button.png')}
              label="一般模式"
              onClick={() => press(() => navigate('difficulty'))}
            />
            <ImageMenuButton
              image={assetUrl('assets/images/infinity_mode_button.png')}
              label="無限模式"
              onClick={() => startGame('endless', null)}
            />
            <ImageMenuButton
              image={assetUrl('assets/images/record_button.png')}
              label="冒險紀錄"
              onClick={() => press(() => setLeaderboardPage('easy'))}
            />
            <ImageMenuButton
              image={assetUrl('assets/images/Backward_button.png')}
              label="返回首頁"
              className="back-image-button"
              onClick={() => press(() => navigate('welcome'))}
            />
          </div>
        </main>
      )}

      {screen === 'difficulty' && (
        <main
          className="screen menu-screen"
          style={{ backgroundImage: `url(${assetUrl('assets/images/start_banner.png')})` }}
        >
          <div className="dark-overlay" />
          <div className="menu-stack">
            {(Object.entries(DIFFICULTY_CONFIG) as Array<[
              Difficulty,
              (typeof DIFFICULTY_CONFIG)[Difficulty]
            ]>).map(([difficulty, config]) => (
              <ImageMenuButton
                key={difficulty}
                image={config.image}
                label={config.label}
                onClick={() => startGame('normal', difficulty)}
              />
            ))}
            <ImageMenuButton
              image={assetUrl('assets/images/Backward_button.png')}
              label="返回模式選擇"
              className="back-image-button"
              onClick={() => press(() => navigate('mode'))}
            />
          </div>
        </main>
      )}

      {screen === 'game' && (
        <GameScreen
          key={`${gameSetup.mode}-${gameSetup.difficulty}-${runId}`}
          mode={gameSetup.mode}
          difficulty={gameSetup.difficulty}
          runId={runId}
          paused={quitConfirmation}
          onFinish={finishGame}
          onRequestQuit={() => setQuitConfirmation(true)}
        />
      )}

      {result && (
        <ResultModal
          result={result}
          onReplay={replay}
          onLeaderboard={(page) => {
            setResult(null);
            setLeaderboardPage(page);
          }}
          onMenu={returnToMode}
        />
      )}

      {leaderboardPage && (
        <Leaderboard
          initialPage={leaderboardPage}
          onClose={() => {
            setLeaderboardPage(null);
            if (screenRef.current === 'game') returnToMode();
          }}
        />
      )}

      {quitConfirmation && (
        <Modal title="要放棄這次冒險嗎？" labelledBy="quit-title">
          <p className="modal-copy">本次尚未完成的分數不會列入冒險紀錄。</p>
          <div className="modal-actions horizontal">
            <button className="danger-button" onClick={returnToMode}>放棄冒險</button>
            <button className="primary-button" onClick={() => setQuitConfirmation(false)}>繼續遊戲</button>
          </div>
        </Modal>
      )}

      {needRefresh && screen !== 'game' && !result && (
        <aside className="update-banner" role="status">
          <span>新版本已準備好</span>
          <button onClick={() => updateServiceWorker(true)}>安全更新</button>
          <button aria-label="稍後更新" onClick={() => setNeedRefresh(false)}>稍後</button>
        </aside>
      )}
    </div>
  );
}
