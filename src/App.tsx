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
import { assetUrl, preloadImage } from './utils/assets';
import {
  requestPortraitOrientation,
  type LockableScreenOrientation
} from './utils/orientation';

type Screen = 'welcome' | 'mode' | 'difficulty' | 'game';

interface GameSetup {
  mode: GameMode;
  difficulty: Difficulty | null;
}

interface AppHistoryState {
  zhuyinApp: true;
  screen: Screen;
  welcomeGuard?: boolean;
  gameGuard?: boolean;
  overlay?: 'quit' | 'leaderboard';
}

type LeaderboardOrigin = 'menu' | 'result';
type QuitConfirmationOrigin = 'back' | 'button';
type GameHistoryPosition = 'base' | 'guard' | null;

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
  const leaderboardOriginRef = useRef<LeaderboardOrigin | null>(null);
  const [quitConfirmation, setQuitConfirmation] = useState(false);
  const quitConfirmationRef = useRef(false);
  const quitConfirmationOriginRef = useRef<QuitConfirmationOrigin | null>(null);
  const [exitConfirmation, setExitConfirmation] = useState(false);
  const exitConfirmationRef = useRef(false);
  const gameHistoryPositionRef = useRef<GameHistoryPosition>(null);
  const historyRestorationPendingRef = useRef(false);
  const completedExitPendingRef = useRef(false);
  const adventurePreloadStartedRef = useRef(false);

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
    gameHistoryPositionRef.current = null;
    applyScreen(next);
  }, [applyScreen]);

  resultRef.current = result;
  leaderboardPageRef.current = leaderboardPage;
  quitConfirmationRef.current = quitConfirmation;
  exitConfirmationRef.current = exitConfirmation;

  useEffect(() => {
    screenRef.current = screen;
    if (screen === 'game') audioService.pauseBgm();
    else audioService.playBgm();
  }, [screen]);

  useEffect(() => {
    if (screen !== 'mode' || adventurePreloadStartedRef.current) return;
    adventurePreloadStartedRef.current = true;
    window.setTimeout(() => {
      void Promise.all([
        assetUrl('assets/images/bg_endless.webp'),
        ...Object.values(DIFFICULTY_CONFIG).map((config) => config.background)
      ].map(preloadImage));
    }, 200);
    window.setTimeout(() => audioService.prepareForAdventure(), 400);
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
      { zhuyinApp: true, screen: 'welcome' } satisfies AppHistoryState,
      '',
      location.href
    );
    history.pushState(
      { zhuyinApp: true, screen: 'welcome', welcomeGuard: true } satisfies AppHistoryState,
      '',
      location.href
    );

    const handleBack = (event: PopStateEvent) => {
      const destination = isAppHistoryState(event.state) ? event.state : null;
      gameHistoryPositionRef.current = destination?.screen === 'game'
        ? destination.gameGuard ? 'guard' : 'base'
        : null;

      if (historyRestorationPendingRef.current) {
        historyRestorationPendingRef.current = false;
        if (destination) applyScreen(destination.screen);
        return;
      }

      if (completedExitPendingRef.current) {
        completedExitPendingRef.current = false;
        resultRef.current = null;
        leaderboardPageRef.current = null;
        leaderboardOriginRef.current = null;
        setResult(null);
        setLeaderboardPage(null);
        if (destination) applyScreen(destination.screen);
        return;
      }

      if (quitConfirmationRef.current) {
        const origin = quitConfirmationOriginRef.current;
        quitConfirmationRef.current = false;
        quitConfirmationOriginRef.current = null;
        setQuitConfirmation(false);
        historyRestorationPendingRef.current = true;
        history.go(origin === 'back' ? 2 : 1);
        applyScreen('game');
        return;
      }

      if (exitConfirmationRef.current) {
        exitConfirmationRef.current = false;
        setExitConfirmation(false);
        historyRestorationPendingRef.current = true;
        history.go(2);
        applyScreen('welcome');
        return;
      }

      if (leaderboardPageRef.current !== null) {
        if (leaderboardOriginRef.current === 'result') {
          completedExitPendingRef.current = true;
          history.back();
          return;
        }
        leaderboardPageRef.current = null;
        leaderboardOriginRef.current = null;
        setLeaderboardPage(null);
        if (destination) applyScreen(destination.screen);
        return;
      }

      if (resultRef.current !== null) {
        completedExitPendingRef.current = true;
        history.back();
        return;
      }

      if (
        screenRef.current === 'game' &&
        destination?.screen === 'game' &&
        !destination.gameGuard
      ) {
        quitConfirmationRef.current = true;
        quitConfirmationOriginRef.current = 'back';
        setQuitConfirmation(true);
        return;
      }

      if (
        screenRef.current === 'welcome' &&
        destination?.screen === 'welcome' &&
        !destination.welcomeGuard
      ) {
        exitConfirmationRef.current = true;
        setExitConfirmation(true);
        return;
      }

      if (destination) applyScreen(destination.screen);
    };

    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [applyScreen]);

  useEffect(() => {
    requestPortraitOrientation(
      window.screen.orientation as LockableScreenOrientation | undefined
    );
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
      gameHistoryPositionRef.current = 'guard';
      applyScreen('game');
    });
  };

  const finishGame = async (nextResult: GameResult) => {
    try {
      await resultRepository.save(nextResult);
    } catch (error) {
      console.warn('無法保存冒險紀錄', error);
    } finally {
      resultRef.current = nextResult;
      setResult(nextResult);
    }
  };

  const openLeaderboardFromMenu = () => {
    press(() => {
      history.pushState(
        { zhuyinApp: true, screen: 'mode', overlay: 'leaderboard' } satisfies AppHistoryState,
        '',
        location.href
      );
      leaderboardOriginRef.current = 'menu';
      leaderboardPageRef.current = 'easy';
      setLeaderboardPage('easy');
    });
  };

  const openLeaderboardFromResult = (page: LeaderboardPage) => {
    resultRef.current = null;
    leaderboardOriginRef.current = 'result';
    leaderboardPageRef.current = page;
    setResult(null);
    setLeaderboardPage(page);
  };

  const closeMenuLeaderboard = () => {
    history.back();
  };

  const openQuitConfirmation = () => {
    if (quitConfirmationRef.current) return;
    quitConfirmationRef.current = true;
    quitConfirmationOriginRef.current = 'button';
    setQuitConfirmation(true);
  };

  const returnToMode = () => {
    resultRef.current = null;
    leaderboardPageRef.current = null;
    leaderboardOriginRef.current = null;
    quitConfirmationRef.current = false;
    setResult(null);
    setLeaderboardPage(null);
    setQuitConfirmation(false);
    const distance = gameHistoryPositionRef.current === 'guard' ? -2 : -1;
    gameHistoryPositionRef.current = null;
    history.go(distance);
  };

  const abandonGame = () => {
    const distance = quitConfirmationOriginRef.current === 'button' ? -2 : -1;
    quitConfirmationRef.current = false;
    quitConfirmationOriginRef.current = null;
    setQuitConfirmation(false);
    gameHistoryPositionRef.current = null;
    history.go(distance);
  };

  const continueGame = () => {
    const origin = quitConfirmationOriginRef.current;
    quitConfirmationRef.current = false;
    quitConfirmationOriginRef.current = null;
    setQuitConfirmation(false);
    if (origin === 'back') {
      historyRestorationPendingRef.current = true;
      history.forward();
    }
  };

  const cancelExit = () => {
    exitConfirmationRef.current = false;
    setExitConfirmation(false);
    historyRestorationPendingRef.current = true;
    history.forward();
  };

  const confirmExit = () => {
    exitConfirmationRef.current = false;
    setExitConfirmation(false);
    history.back();
  };

  const replay = () => {
    resultRef.current = null;
    setResult(null);
    setRunId((current) => current + 1);
  };

  return (
    <div className="app-shell">
      {screen === 'welcome' && (
        <main
          className="screen welcome-screen"
          style={{ backgroundImage: `url(${assetUrl('assets/images/start_banner.webp')})` }}
        >
          <img className="title-image" src={assetUrl('assets/images/title.webp')} alt="小小注音冒險家" />
          <button
            className="start-button"
            onClick={() => press(() => navigate('mode'))}
            aria-label="開始冒險"
          >
            <img src={assetUrl('assets/images/start_button.webp')} alt="" draggable="false" />
          </button>
          <span className="version-tag">v {APP_VERSION}</span>
        </main>
      )}

      {screen === 'mode' && (
        <main
          className="screen menu-screen"
          style={{ backgroundImage: `url(${assetUrl('assets/images/start_banner.webp')})` }}
        >
          <div className="dark-overlay" />
          <div className="menu-stack">
            <ImageMenuButton
              image={assetUrl('assets/images/normal_mode_button.webp')}
              label="一般模式"
              onClick={() => press(() => navigate('difficulty'))}
            />
            <ImageMenuButton
              image={assetUrl('assets/images/infinity_mode_button.webp')}
              label="無限模式"
              onClick={() => startGame('endless', null)}
            />
            <ImageMenuButton
              image={assetUrl('assets/images/record_button.webp')}
              label="冒險紀錄"
              onClick={openLeaderboardFromMenu}
            />
            <ImageMenuButton
              image={assetUrl('assets/images/Backward_button.webp')}
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
          style={{ backgroundImage: `url(${assetUrl('assets/images/start_banner.webp')})` }}
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
              image={assetUrl('assets/images/Backward_button.webp')}
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
          onRequestQuit={openQuitConfirmation}
        />
      )}

      {result && (
        <ResultModal
          result={result}
          onReplay={replay}
          onLeaderboard={openLeaderboardFromResult}
          onMenu={returnToMode}
        />
      )}

      {leaderboardPage && (
        <Leaderboard
          initialPage={leaderboardPage}
          onClose={() => {
            if (leaderboardOriginRef.current === 'result') returnToMode();
            else closeMenuLeaderboard();
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

      {exitConfirmation && (
        <Modal title="確定要離開嗎？" labelledBy="exit-title">
          <div className="modal-actions horizontal">
            <button className="secondary-button" onClick={cancelExit}>取消</button>
            <button className="danger-button" onClick={confirmExit}>確定</button>
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
