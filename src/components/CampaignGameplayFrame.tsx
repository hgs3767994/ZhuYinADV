import { useEffect, useState, type ReactNode } from 'react';
import type { CampaignLevelDefinition } from '../game/campaignConfig';
import type { CampaignFlowOverlay } from '../game/campaignFlow';
import { Modal } from './Modal';

export interface CampaignGameplayContext {
  paused: boolean;
  inputEnabled: boolean;
}

interface CampaignGameplayFrameProps {
  level: CampaignLevelDefinition;
  progressLabel: string;
  progress: ReactNode;
  tutorialSteps: readonly string[];
  overlay: CampaignFlowOverlay;
  onOpenPause: () => void;
  onOpenHowTo: (origin: 'gameplay' | 'pause') => void;
  onCloseHowTo: () => void;
  onResume: () => void;
  onRequestAbandon: () => void;
  onCancelAbandon: () => void;
  onAbandon: () => void;
  inputLocked?: boolean;
  onPauseChange?: (paused: boolean) => void;
  children: ReactNode | ((context: CampaignGameplayContext) => ReactNode);
}

export function CampaignGameplayFrame({
  level,
  progressLabel,
  progress,
  tutorialSteps,
  overlay,
  onOpenPause,
  onOpenHowTo,
  onCloseHowTo,
  onResume,
  onRequestAbandon,
  onCancelAbandon,
  onAbandon,
  inputLocked = false,
  onPauseChange,
  children
}: CampaignGameplayFrameProps) {
  const [showTitle, setShowTitle] = useState(true);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowTitle(false), 1000);
    return () => window.clearTimeout(timer);
  }, [level.id]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) onOpenPause();
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, [onOpenPause]);

  const finishResume = (action: () => void) => {
    action();
    setResuming(true);
    window.setTimeout(() => setResuming(false), 500);
  };

  const closeHowTo = () => {
    const returnsDirectlyToGame = overlay === 'how-to-direct';
    onCloseHowTo();
    if (returnsDirectlyToGame) {
      setResuming(true);
      window.setTimeout(() => setResuming(false), 500);
    }
  };

  const covered = showTitle || resuming || overlay !== null;
  const paused = covered;
  const inputEnabled = !paused && !inputLocked;

  useEffect(() => {
    onPauseChange?.(paused);
  }, [onPauseChange, paused]);

  return (
    <main className="screen campaign-gameplay-screen">
      <header className="campaign-gameplay-header">
        <button
          type="button"
          className="campaign-gameplay-edge-button"
          disabled={covered}
          onClick={onOpenPause}
          aria-label="暫停遊戲"
        >
          Ⅱ
        </button>
        <div className="campaign-gameplay-heading">
          <strong>第 {level.number} 關・{level.title}</strong>
          <div aria-label={progressLabel}>{progress}</div>
        </div>
        <button
          type="button"
          className="campaign-gameplay-edge-button campaign-how-to-button"
          disabled={covered}
          onClick={() => onOpenHowTo('gameplay')}
        >
          <span aria-hidden="true">？</span><span>玩法</span>
        </button>
      </header>

      <section className="campaign-gameplay-stage" aria-hidden={covered || undefined}>
        {typeof children === 'function' ? children({ paused, inputEnabled }) : children}
      </section>

      {covered && <div className="campaign-gameplay-cover" aria-hidden="true" />}

      {showTitle && (
        <div className="campaign-level-title-card" role="status">
          <small>第 {level.number} 關</small>
          <strong>{level.title}</strong>
        </div>
      )}

      {resuming && !showTitle && (
        <div className="campaign-ready-card" role="status">準備</div>
      )}

      {overlay === 'pause' && (
        <Modal title="遊戲暫停" className="campaign-pause-modal">
          <div className="modal-actions">
            <button type="button" className="primary-button" onClick={() => finishResume(onResume)}>
              繼續遊戲
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onOpenHowTo('pause')}
            >
              查看玩法
            </button>
            <button type="button" className="danger-button" onClick={onRequestAbandon}>
              放棄關卡
            </button>
          </div>
        </Modal>
      )}

      {(overlay === 'how-to-direct' || overlay === 'how-to-paused') && (
        <Modal title="查看玩法" className="campaign-how-to-modal">
          <h3>{level.title}・基本操作</h3>
          <ul>
            {tutorialSteps.map((step) => <li key={step}>{step}</li>)}
          </ul>
          <div className="modal-actions">
            <button type="button" className="primary-button" onClick={closeHowTo}>
              {overlay === 'how-to-paused' ? '返回暫停選單' : '返回遊戲'}
            </button>
          </div>
        </Modal>
      )}

      {overlay === 'abandon-confirm' && (
        <Modal title="要放棄這次挑戰嗎？" className="campaign-abandon-modal">
          <div className="modal-actions">
            <button type="button" className="primary-button" onClick={onCancelAbandon}>
              繼續挑戰
            </button>
            <button type="button" className="danger-button" onClick={onAbandon}>
              放棄並返回地圖
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
