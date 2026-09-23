import { useCallback, useEffect, useRef, useState } from 'react';
import {
  APP_VERSION,
  DEVICE_PROFILE_ID,
  DIFFICULTY_CONFIG,
  NORMAL_QUESTION_COUNT
} from '../game/config';
import {
  QuestionDeck,
  advanceQuestion,
  createGameSession,
  endlessScoreForCombo,
  getEndlessTimeLimitMs,
  isNormalComplete,
  normalScoreForQuestion
} from '../game/engine';
import type { Difficulty, GameMode, GameResult, GameSession } from '../game/types';
import { useCountdown } from '../hooks/useCountdown';
import { audioService } from '../services/audio';
import { assetUrl } from '../utils/assets';

interface GameScreenProps {
  mode: GameMode;
  difficulty: Difficulty | null;
  runId: number;
  paused?: boolean;
  onFinish: (result: GameResult) => void;
  onRequestQuit: () => void;
}

function backgroundFor(mode: GameMode, difficulty: Difficulty | null): string {
  if (mode === 'endless') return assetUrl('assets/images/bg_endless.webp');
  return DIFFICULTY_CONFIG[difficulty ?? 'easy'].background;
}

export function GameScreen({
  mode,
  difficulty,
  runId,
  paused = false,
  onFinish,
  onRequestQuit
}: GameScreenProps) {
  const deckRef = useRef(new QuestionDeck());
  const startedAtRef = useRef(performance.now());
  const finishingRef = useRef(false);
  const activeRef = useRef(true);
  const interactionLockedRef = useRef(false);
  const disabledOptionsRef = useRef(new Set<string>());
  const [session, setSession] = useState<GameSession>(() =>
    createGameSession(mode, difficulty, deckRef.current)
  );
  const [firstQuestionReady, setFirstQuestionReady] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const sessionRef = useRef(session);

  const commit = useCallback((next: GameSession) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const finish = useCallback((completed: boolean) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const current = sessionRef.current;
    onFinish({
      id: crypto.randomUUID(),
      profileId: DEVICE_PROFILE_ID,
      modeId: current.mode,
      difficultyId: current.difficulty,
      score: current.score,
      correctCount: current.correctCount,
      wrongCount: current.wrongCount,
      timeoutCount: current.timeoutCount,
      maxCombo: current.maxCombo,
      completed,
      durationMs: Math.max(0, Math.round(performance.now() - startedAtRef.current)),
      xpAwarded: 0,
      playedAt: new Date().toISOString(),
      appVersion: APP_VERSION
    });
  }, [onFinish]);

  const moveNext = useCallback(async () => {
    const next = advanceQuestion(sessionRef.current, deckRef.current);
    try {
      await audioService.prepareVoice(next.currentAnswer);
    } catch {
      // Continue with the HTMLAudio fallback when Web Audio preparation fails.
    }
    if (!activeRef.current || finishingRef.current) return;
    disabledOptionsRef.current.clear();
    interactionLockedRef.current = false;
    commit(next);
  }, [commit]);

  const handleTimeout = useCallback(() => {
    if (finishingRef.current || interactionLockedRef.current) return;
    interactionLockedRef.current = true;
    audioService.playWrong();

    const current = sessionRef.current;
    if (current.isLocked || current.mode !== 'endless') return;
    const lives = current.lives - 1;
    const timedOut: GameSession = {
      ...current,
      lives,
      combo: 0,
      timeoutCount: current.timeoutCount + 1,
      isLocked: lives <= 0
    };
    const shouldFinish = lives <= 0;

    if (shouldFinish) {
      commit(timedOut);
      window.setTimeout(() => finish(false), 650);
    } else {
      const waiting = { ...timedOut, isLocked: true };
      const next = advanceQuestion(waiting, deckRef.current);
      commit(waiting);
      void audioService.prepareVoice(next.currentAnswer)
        .catch(() => undefined)
        .then(() => {
          if (!activeRef.current || finishingRef.current) return;
          disabledOptionsRef.current.clear();
          interactionLockedRef.current = false;
          commit(next);
        });
    }
  }, [commit, finish]);

  const timerDuration = session.mode === 'endless'
    ? getEndlessTimeLimitMs(session.questionNumber)
    : null;
  const remainingMs = useCountdown({
    durationMs: timerDuration,
    active: firstQuestionReady && !session.isLocked,
    paused,
    resetKey: `${runId}-${session.questionNumber}`,
    onExpire: handleTimeout
  });

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadingTimer = window.setTimeout(() => setShowLoading(true), 400);
    void audioService.prepareVoice(sessionRef.current.currentAnswer)
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        window.clearTimeout(loadingTimer);
        startedAtRef.current = performance.now();
        setFirstQuestionReady(true);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimer);
    };
  }, [runId]);

  useEffect(() => {
    if (!firstQuestionReady) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => audioService.speak(session.currentAnswer));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [firstQuestionReady, session.currentAnswer]);

  const handleAnswer = (selected: string) => {
    if (
      finishingRef.current ||
      interactionLockedRef.current ||
      disabledOptionsRef.current.has(selected)
    ) return;

    if (selected === sessionRef.current.currentAnswer) {
      interactionLockedRef.current = true;
      audioService.playCorrect();
      const current = sessionRef.current;
      const combo = current.mode === 'endless' ? current.combo + 1 : current.combo;
      const points = current.mode === 'normal'
        ? normalScoreForQuestion(current.attempts)
        : endlessScoreForCombo(combo);
      commit({
        ...current,
        score: current.score + points,
        combo,
        maxCombo: Math.max(current.maxCombo, combo),
        correctCount: current.correctCount + 1,
        selectedCorrect: selected,
        isLocked: true
      });

      window.setTimeout(() => {
        if (isNormalComplete(sessionRef.current)) {
          finish(true);
        } else {
          moveNext();
        }
      }, 650);
      return;
    }

    disabledOptionsRef.current.add(selected);
    audioService.playWrong();
    const current = sessionRef.current;
    if (current.disabledOptions.includes(selected)) return;
    const lives = current.mode === 'endless' ? current.lives - 1 : current.lives;
    const shouldFinish = current.mode === 'endless' && lives <= 0;
    commit({
      ...current,
      lives,
      combo: current.mode === 'endless' ? 0 : current.combo,
      attempts: current.mode === 'normal' ? current.attempts + 1 : current.attempts,
      wrongCount: current.wrongCount + 1,
      disabledOptions: [...current.disabledOptions, selected],
      isLocked: shouldFinish
    });

    if (shouldFinish) {
      interactionLockedRef.current = true;
      window.setTimeout(() => finish(false), 650);
    }
  };

  const timerPercent = timerDuration && remainingMs !== null
    ? Math.max(0, Math.min(100, (remainingMs / timerDuration) * 100))
    : 100;
  const timerWarning = remainingMs !== null && timerDuration !== null &&
    (remainingMs <= 1_500 || timerPercent <= 30);

  if (!firstQuestionReady) {
    return (
      <main
        className="screen game-screen"
        style={{ backgroundImage: `url(${backgroundFor(mode, difficulty)})` }}
      >
        <div className="dark-overlay" />
        <div className="game-loading" role="status" aria-live="polite">
          {showLoading && (
            <div className="loading-card">
              <span className="loading-spinner" aria-hidden="true" />
              <strong>讀取中</strong>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main
      className="screen game-screen"
      style={{ backgroundImage: `url(${backgroundFor(mode, difficulty)})` }}
    >
      <div className="dark-overlay" />
      <div className="game-content">
        <header className="game-info-bar">
          <span>
            {mode === 'normal'
              ? `題目：${session.questionNumber}/${NORMAL_QUESTION_COUNT}`
              : `第 ${session.questionNumber} 題`}
          </span>
          <span className="lives" aria-label={`剩餘 ${session.lives} 顆生命`}>
            {mode === 'endless' ? '❤️'.repeat(Math.max(0, session.lives)) : ''}
          </span>
          <span className="score">得分：{session.score}</span>
        </header>

        {timerDuration !== null && remainingMs !== null && (
          <div className={`timer ${timerWarning ? 'warning' : ''}`}>
            <strong>⏳ {(remainingMs / 1000).toFixed(1)} 秒</strong>
            <div className="timer-track">
              <div className="timer-fill" style={{ width: `${timerPercent}%` }} />
            </div>
          </div>
        )}

        <div className="combo-area" aria-live="polite">
          {mode === 'endless' && session.combo >= 3 && (
            <span>🔥 Combo ×{session.combo}！</span>
          )}
        </div>

        <div className="listen-area">
          <button className="listen-button" onClick={() => audioService.speak(session.currentAnswer)}>
            <svg
              className="speaker-icon"
              viewBox="0 0 64 64"
              aria-hidden="true"
              focusable="false"
            >
              <rect x="9" y="25" width="12" height="14" rx="3" fill="#475569" />
              <path d="M21 25 35 15v34L21 39Z" fill="#e2e8f0" />
              <path
                d="M40 24c4 4 4 12 0 16M45 18c8 8 8 20 0 28"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <span className="sr-only">重複播放注音</span>
          </button>
          <p>點擊重複聽發音</p>
        </div>

        <div className={`options-grid options-${session.options.length}`}>
          {session.options.map((symbol) => {
            const wrong = session.disabledOptions.includes(symbol);
            const correct = session.selectedCorrect === symbol;
            return (
              <button
                key={symbol}
                className={`symbol-card ${wrong ? 'wrong disabled' : ''} ${correct ? 'correct' : ''}`}
                onClick={() => handleAnswer(symbol)}
                disabled={wrong || (session.isLocked && !correct)}
              >
                {symbol}
              </button>
            );
          })}
        </div>

        <button className="quit-button" onClick={onRequestQuit}>💦 放棄冒險</button>
      </div>
    </main>
  );
}
