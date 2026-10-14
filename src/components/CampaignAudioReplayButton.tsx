import { useCallback, useEffect, useRef, useState } from 'react';

interface CampaignAudioReplayButtonProps {
  onReplay: () => void | Promise<void>;
  onStop?: () => void;
  paused?: boolean;
  disabled?: boolean;
  autoPlayKey?: string | number;
  label?: string;
  onPlaybackChange?: (playing: boolean) => void;
}

export function CampaignAudioReplayButton({
  onReplay,
  onStop,
  paused = false,
  disabled = false,
  autoPlayKey,
  label = '重播讀音',
  onPlaybackChange
}: CampaignAudioReplayButtonProps) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const requestRef = useRef(0);
  const playingRef = useRef(false);
  const interruptedRef = useRef(false);
  const previousPausedRef = useRef(paused);
  const lastAutoPlayedKeyRef = useRef<string | number | undefined>(undefined);

  const updatePlaying = useCallback((next: boolean) => {
    playingRef.current = next;
    setPlaying(next);
    onPlaybackChange?.(next);
  }, [onPlaybackChange]);

  const replay = useCallback(async () => {
    if (paused || disabled || playingRef.current) return;
    const request = ++requestRef.current;
    setFailed(false);
    updatePlaying(true);
    try {
      await onReplay();
    } catch (error) {
      console.warn('無法播放目標讀音', error);
      if (requestRef.current === request) setFailed(true);
    } finally {
      if (requestRef.current === request) updatePlaying(false);
    }
  }, [disabled, onReplay, paused, updatePlaying]);

  useEffect(() => {
    if (autoPlayKey === undefined || paused || disabled) return;
    if (Object.is(lastAutoPlayedKeyRef.current, autoPlayKey)) return;
    lastAutoPlayedKeyRef.current = autoPlayKey;
    void replay();
  }, [autoPlayKey, disabled, paused, replay]);

  useEffect(() => {
    const wasPaused = previousPausedRef.current;
    previousPausedRef.current = paused;
    if (paused && !wasPaused && playingRef.current) {
      requestRef.current += 1;
      interruptedRef.current = true;
      onStop?.();
      updatePlaying(false);
      return;
    }
    if (!paused && wasPaused && interruptedRef.current) {
      interruptedRef.current = false;
      void replay();
    }
  }, [onStop, paused, replay, updatePlaying]);

  useEffect(() => () => {
    requestRef.current += 1;
    onStop?.();
  }, [onStop]);

  return (
    <div className="campaign-audio-replay">
      <button
        type="button"
        className="campaign-audio-replay-button"
        disabled={disabled || paused || playing}
        onClick={() => void replay()}
        aria-label={label}
      >
        <span aria-hidden="true">🔊</span>
        <span>{playing ? '播放中…' : label}</span>
      </button>
      {failed && <span className="campaign-audio-error" role="status">播放失敗，請再試一次。</span>}
    </div>
  );
}
