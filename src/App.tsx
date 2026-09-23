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

interface AppHistoryState {
  zhuyinApp: true;
  screen: Screen;
  gameGuard?: boolean;
}

function isAppHistoryState(value: unknown): value is AppHistoryState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<AppHistoryState>;
  return state.zhuyinApp === true &&
    ['welcome', 'mode', 'difficulty', 'game'].includes(state.screen ?? '');
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
  const quitConfirmationRef = useRef(false);
  const gameGuardActiveRef = useRef(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({ immediate: true });

  const applyScreen = useCallback((next: Screen) => {
    screenRef.current = next;
    setScreen(next);
  }, []);

  const navigate = useCallback((next: Screen) => {
    const state: AppHistoryState = { zhuyinApp: true, screen: next };
    history.pushState(state, '', location.href);
    gameGuardActiveRef.current = false;
    applyScreen(next);
  }, [applyScreen]);

  resultRef.current = result;
  leaderboardPageRef.current = leaderboardPage;
  quitConfirmationRef.current = quitConfirmation;

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
    history.replaceState(
      { zhuyinApp: true, screen: screenRef.current } satisfies AppHistoryState,
      '',
      location.href
    );

    const handleBack = (event: PopStateEvent) => {
      if (leaderboardPageRef.current !== null) {
        setLeaderboardPage(null);
        return;
      }
      if (resultRef.current !== null) {
        setResult(null);
        return;
      }

      const destination = isAppHistoryState(event.state) ? event.state : null;
      if (
        screenRef.current === 'game' &&
        destination?.screen === 'game' &&
        !destination.gameGuard
      ) {
        gameGuardActiveRef.current = false;
        setQuitConfirmation(true);
        return;
      }

      if (quitConfirmationRef.current) setQuitConfirmation(false);
      if (destination) applyScreen(destination.screen);
    };

    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [applyScreen]);

  useEffect(() => {
    const orientation = window.screen.orientation as ScreenOrientation & {
      lock?: (value: OrientationLockType) => Promise<void>;
    };
    orientation.lock?.('portrait-primary').catch(() => undefined);
  }, []);

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
      history.pushState(
        { zhuyinApp: true, screen: 'game' } satisfies AppHistoryState,
        '',
        location.href
      );
      history.pushState(
        { zhuyinApp: true, screen: 'game', gameGuard: true } satisfies AppHistoryState,
        '',
        location.href
      );
      gameGuardActiveRef.current = true;
      applyScreen('game');
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
    gameGuardActiveRef.current = false;
    history.go(gameSetup.mode === 'normal' ? -3 : -2);
  };

  const abandonGame = () => {
    const distance = gameGuardActiveRef.current ? -2 : -1;
    setQuitConfirmation(false);
    history.go(distance);
  };

  const continueGame = () => {
    if (!gameGuardActiveRef.current) {
      history.pushState(
        { zhuyinApp: true, screen: 'game', gameGuard: true } satisfies AppHistoryState,
        '',
        location.href
      );
      gameGuardActiveRef.current = true;
    }
    setQuitConfirmation(false);
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
              onClick={() => press(() => history.back())}
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
              onClick={() => press(() => history.back())}
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
            <button className="danger-button" onClick={abandonGame}>放棄冒險</button>
            <button className="primary-button" onClick={continueGame}>繼續遊戲</button>
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

      <aside className="orientation-lock" role="status" aria-live="polite">
        <span aria-hidden="true">📱</span>
        <strong>請將裝置轉為直式</strong>
        <p>小小注音冒險家限定使用直式螢幕。</p>
      </aside>
    </div>
  );
}
