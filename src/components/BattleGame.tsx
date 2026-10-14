import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BATTLE_MAX_ENERGY,
  BATTLE_MAX_LIVES,
  BATTLE_SKILL_COST,
  battleStars,
  createBossBattle,
  createLevelFiveBattle,
  createLevelNineBattle,
  normalBattleAttack,
  piercingBattleAttack,
  resolveEnemyAttack,
  type BattleEnemy,
  type BattlePlayerState,
  type BattleRuneOption
} from '../game/battle';
import { audioService } from '../services/audio';
import { CampaignAudioReplayButton } from './CampaignAudioReplayButton';
import { CampaignStatusSlots } from './CampaignStatusSlots';

export type BattleTutorialTip = 'correct' | 'wrong' | 'energy' | 'shield';

export interface BattleGameStatus extends BattlePlayerState {
  waveNumber: number;
}

interface BattleGameProps {
  variant: 'beginner' | 'castle' | 'boss';
  resultId: string;
  paused: boolean;
  inputEnabled: boolean;
  tutorialTipsSeen: Readonly<Record<BattleTutorialTip, boolean>>;
  onTutorialTipSeen: (tip: BattleTutorialTip) => void;
  onStatusChange: (status: BattleGameStatus) => void;
  onInteractionLockChange: (locked: boolean) => void;
  onDefeat: () => void;
  onSolved: (result: {
    stars: 1 | 2 | 3;
    remainingLives: number;
    durationMs: number;
  }) => void;
}

type BattlePhase = 'select-enemy' | 'answering' | 'resolving';
type BattleFeedback = 'none' | 'correct' | 'enemy-attack' | 'echo-shield' | 'piercing';

const TIP_CONTENT: Record<BattleTutorialTip, { title: string; lines: readonly string[] }> = {
  correct: {
    title: '第一次正確作答',
    lines: ['選對符文會攻擊目前選定的敵人，並取得 1 點聲音能量。', '聲音能量最多可以累積 5 點。']
  },
  wrong: {
    title: '第一次錯誤作答',
    lines: ['選錯符文時，目前選定的敵人會攻擊玩家，使玩家失去 1 點生命。', '目標讀音不會更換，玩家需繼續從剩餘符文中找出正確答案。']
  },
  energy: {
    title: '符音穿透可以使用了',
    lines: ['消耗 3 點聲音能量，直接對選定敵人造成 2 點傷害！']
  },
  shield: {
    title: '護盾敵人',
    lines: [
      '一般攻擊會先摧毀敵人一層護盾，不會削減敵人生命。',
      '成功摧毀護盾也可以取得 1 點聲音能量。',
      '「符音穿透」可以無視護盾，直接削減敵人 2 點生命。'
    ]
  }
};

function freshWave(enemies: readonly BattleEnemy[]): BattleEnemy[] {
  return enemies.map((enemy) => ({ ...enemy }));
}

export function BattleGame({
  variant,
  resultId,
  paused,
  inputEnabled,
  tutorialTipsSeen,
  onTutorialTipSeen,
  onStatusChange,
  onInteractionLockChange,
  onDefeat,
  onSolved
}: BattleGameProps) {
  const plan = useMemo(
    () => variant === 'boss'
      ? createBossBattle(resultId)
      : variant === 'castle'
        ? createLevelNineBattle(resultId)
        : createLevelFiveBattle(resultId),
    [resultId, variant]
  );
  const [waveIndex, setWaveIndex] = useState(0);
  const [enemies, setEnemies] = useState<readonly BattleEnemy[]>(() => freshWave(plan.waves[0]));
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(() => plan.waves[0][0]?.id ?? null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const question = plan.questions[questionIndex];
  const [disabledRuneIds, setDisabledRuneIds] = useState<ReadonlySet<string>>(() => new Set());
  const [player, setPlayer] = useState<BattlePlayerState>({ lives: BATTLE_MAX_LIVES, energy: 0 });
  const playerRef = useRef(player);
  const [phase, setPhase] = useState<BattlePhase>(selectedEnemyId ? 'answering' : 'select-enemy');
  const phaseRef = useRef<BattlePhase>(phase);
  const [feedback, setFeedback] = useState<BattleFeedback>('none');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [tutorialQueue, setTutorialQueue] = useState<readonly BattleTutorialTip[]>([]);
  const continuationRef = useRef<(() => void) | null>(null);
  const [echoShieldNotice, setEchoShieldNotice] = useState(false);
  const [bossIntroVisible, setBossIntroVisible] = useState(false);
  const busyRef = useRef(false);
  const pausedRef = useRef(paused);
  const mountedRef = useRef(true);
  const startedAtRef = useRef(performance.now());
  pausedRef.current = paused;

  const changePhase = useCallback((next: BattlePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    onStatusChange({ waveNumber: 1, lives: BATTLE_MAX_LIVES, energy: 0 });
    return () => {
      mountedRef.current = false;
      audioService.stopSpeech();
    };
  }, [onStatusChange]);

  useEffect(() => {
    onInteractionLockChange(phase === 'resolving' || audioPlaying || tutorialQueue.length > 0);
  }, [audioPlaying, onInteractionLockChange, phase, tutorialQueue.length]);

  const waitWhileActive = useCallback((durationMs: number) => new Promise<void>((resolve) => {
    let remaining = durationMs;
    let previous = performance.now();
    const tick = () => {
      if (!mountedRef.current) {
        resolve();
        return;
      }
      const current = performance.now();
      if (!pausedRef.current && tutorialQueue.length === 0) remaining -= current - previous;
      previous = current;
      if (remaining <= 0) resolve();
      else window.setTimeout(tick, 40);
    };
    window.setTimeout(tick, 40);
  }), [tutorialQueue.length]);

  const updatePlayer = useCallback((next: BattlePlayerState, currentWave = waveIndex) => {
    playerRef.current = next;
    setPlayer(next);
    onStatusChange({ waveNumber: currentWave + 1, ...next });
  }, [onStatusChange, waveIndex]);

  const showTutorialsThen = useCallback((tips: readonly BattleTutorialTip[], continuation: () => void) => {
    const unseen = tips.filter((tip) => !tutorialTipsSeen[tip]);
    if (unseen.length === 0) {
      continuation();
      return;
    }
    continuationRef.current = continuation;
    setTutorialQueue(unseen);
  }, [tutorialTipsSeen]);

  const dismissTutorial = () => {
    const [current, ...rest] = tutorialQueue;
    if (current) onTutorialTipSeen(current);
    if (rest.length > 0) {
      setTutorialQueue(rest);
      return;
    }
    setTutorialQueue([]);
    const continuation = continuationRef.current;
    continuationRef.current = null;
    continuation?.();
  };

  const beginNextQuestion = useCallback((nextQuestionIndex: number, targetEnemyId: string) => {
    setQuestionIndex(nextQuestionIndex);
    setSelectedEnemyId(targetEnemyId);
    setDisabledRuneIds(new Set());
    setFeedback('none');
    busyRef.current = false;
    changePhase('answering');
  }, [changePhase]);

  const finishEnemyTurn = useCallback((updatedEnemies: readonly BattleEnemy[], nextQuestionIndex: number) => {
    const survivors = updatedEnemies.filter((enemy) => enemy.life > 0);
    if (survivors.length > 0) {
      setEnemies(updatedEnemies);
      const selectedSurvived = survivors.some((enemy) => enemy.id === selectedEnemyId);
      const nextTarget = selectedSurvived
        ? selectedEnemyId
        : survivors.length === 1 ? survivors[0].id : null;
      if (nextTarget) beginNextQuestion(nextQuestionIndex, nextTarget);
      else {
        setQuestionIndex(nextQuestionIndex);
        setSelectedEnemyId(null);
        setDisabledRuneIds(new Set());
        setFeedback('none');
        busyRef.current = false;
        changePhase('select-enemy');
      }
      return;
    }

    const nextWaveIndex = waveIndex + 1;
    if (nextWaveIndex >= plan.waves.length) {
      onSolved({
        stars: battleStars(playerRef.current.lives),
        remainingLives: playerRef.current.lives,
        durationMs: Math.max(0, Math.round(performance.now() - startedAtRef.current))
      });
      return;
    }

    const nextEnemies = freshWave(plan.waves[nextWaveIndex]);
    const automaticTarget = nextEnemies.length === 1 ? nextEnemies[0].id : null;
    setWaveIndex(nextWaveIndex);
    setEnemies(nextEnemies);
    setSelectedEnemyId(automaticTarget);
    setQuestionIndex(nextQuestionIndex);
    setDisabledRuneIds(new Set());
    setFeedback('none');
    onStatusChange({ waveNumber: nextWaveIndex + 1, ...playerRef.current });
    const continueNextWave = () => {
      busyRef.current = false;
      changePhase(automaticTarget ? 'answering' : 'select-enemy');
    };
    if (variant === 'castle' && nextWaveIndex === 4) {
      changePhase('resolving');
      showTutorialsThen(['shield'], continueNextWave);
      return;
    }
    if (variant === 'boss' && nextWaveIndex === 4) {
      changePhase('resolving');
      setBossIntroVisible(true);
      void waitWhileActive(1_200).then(() => {
        if (!mountedRef.current) return;
        setBossIntroVisible(false);
        continueNextWave();
      });
      return;
    }
    continueNextWave();
  }, [beginNextQuestion, changePhase, onSolved, onStatusChange, plan.waves, selectedEnemyId, showTutorialsThen, variant, waitWhileActive, waveIndex]);

  const selectEnemy = (enemyId: string) => {
    if (!inputEnabled || phase === 'resolving' || audioPlaying || busyRef.current) return;
    if (!enemies.some((enemy) => enemy.id === enemyId && enemy.life > 0)) return;
    setSelectedEnemyId(enemyId);
    if (phase === 'select-enemy') changePhase('answering');
  };

  const answerRune = async (option: BattleRuneOption) => {
    if (!inputEnabled || phase !== 'answering' || audioPlaying || busyRef.current || !selectedEnemyId || disabledRuneIds.has(option.id)) return;
    busyRef.current = true;
    changePhase('resolving');
    audioService.stopSpeech();

    if (!option.correct) {
      setDisabledRuneIds((current) => new Set(current).add(option.id));
      setFeedback('enemy-attack');
      audioService.playWrong();
      await waitWhileActive(430);
      if (!mountedRef.current) return;
      const attacked = resolveEnemyAttack(playerRef.current);
      updatePlayer({ lives: attacked.lives, energy: attacked.energy });
      if (attacked.echoShieldTriggered) {
        setFeedback('echo-shield');
        setEchoShieldNotice(true);
        await waitWhileActive(760);
      }
      if (!mountedRef.current) return;
      if (attacked.lives === 0) {
        onDefeat();
        return;
      }
      const continueSameQuestion = () => {
        setFeedback('none');
        busyRef.current = false;
        changePhase('answering');
      };
      showTutorialsThen(['wrong'], continueSameQuestion);
      return;
    }

    setFeedback('correct');
    audioService.playCorrect();
    const attackedEnemies = enemies.map((enemy) =>
      enemy.id === selectedEnemyId ? normalBattleAttack(enemy) : enemy
    );
    const nextEnergy = Math.min(BATTLE_MAX_ENERGY, playerRef.current.energy + 1);
    updatePlayer({ lives: playerRef.current.lives, energy: nextEnergy });
    setEnemies(attackedEnemies);
    await waitWhileActive(720);
    if (!mountedRef.current) return;
    const tips: BattleTutorialTip[] = [];
    if (!tutorialTipsSeen.correct) tips.push('correct');
    if (nextEnergy >= BATTLE_SKILL_COST && !tutorialTipsSeen.energy) tips.push('energy');
    showTutorialsThen(tips, () => finishEnemyTurn(attackedEnemies, questionIndex + 1));
  };

  const usePiercing = async () => {
    if (!inputEnabled || phase !== 'answering' || audioPlaying || busyRef.current || !selectedEnemyId || playerRef.current.energy < BATTLE_SKILL_COST) return;
    busyRef.current = true;
    changePhase('resolving');
    audioService.stopSpeech();
    setFeedback('piercing');
    updatePlayer({ lives: playerRef.current.lives, energy: playerRef.current.energy - BATTLE_SKILL_COST });
    const attackedEnemies = enemies.map((enemy) =>
      enemy.id === selectedEnemyId ? piercingBattleAttack(enemy) : enemy
    );
    setEnemies(attackedEnemies);
    await waitWhileActive(850);
    if (!mountedRef.current) return;
    const targetSurvived = attackedEnemies.some((enemy) => enemy.id === selectedEnemyId && enemy.life > 0);
    if (targetSurvived) {
      setFeedback('none');
      busyRef.current = false;
      changePhase('answering');
      return;
    }
    finishEnemyTurn(attackedEnemies, questionIndex + 1);
  };

  const replayTarget = useCallback(() => audioService.speakSequence([question.answer]), [question.answer]);
  const stopTarget = useCallback(() => audioService.stopSpeech(), []);
  const currentTip = tutorialQueue[0];
  const targetReady = selectedEnemyId !== null && phase !== 'select-enemy';
  const controlsDisabled = !inputEnabled || phase !== 'answering' || audioPlaying || tutorialQueue.length > 0;

  return (
    <div className={`battle-game feedback-${feedback}`}>
      <div className="battle-scene">
        <div className={`battle-player ${feedback === 'echo-shield' ? 'echo-shield' : ''}`} aria-label="冒險者">
          <span>冒險者</span>
        </div>
        {variant !== 'boss' && <div className="battle-xiaoya" aria-label="小亞在後方觀戰">小亞</div>}
        {variant === 'boss' && waveIndex < 4 && <div className="battle-boss-overseer" aria-label="迷霧將軍在封印水晶前指揮戰鬥">迷霧將軍</div>}
        <div className="battle-enemies" aria-label="迷霧哨兵">
          {enemies.filter((enemy) => enemy.life > 0).map((enemy) => (
            <button type="button" key={enemy.id}
              className={`battle-enemy ${enemy.kind === 'shielded' ? 'shielded' : ''} ${enemy.kind === 'boss' ? 'boss' : ''} ${selectedEnemyId === enemy.id ? 'selected' : ''}`}
              disabled={!inputEnabled || phase === 'resolving' || audioPlaying}
              onClick={() => selectEnemy(enemy.id)} aria-label={`${selectedEnemyId === enemy.id ? '已選定' : '選定'}${enemy.kind === 'boss' ? '迷霧將軍' : `${enemy.kind === 'shielded' ? '護盾' : ''}迷霧哨兵`}`}>
              <span className="battle-enemy-figure" aria-hidden="true">{enemy.kind === 'boss' ? '♛' : '♟'}</span>
              <CampaignStatusSlots kind="life" current={enemy.life} maximum={enemy.kind === 'boss' ? 6 : 2} label={enemy.kind === 'boss' ? '迷霧將軍生命' : '敵人生命'} />
              {enemy.shield > 0 && <CampaignStatusSlots kind="shield" current={enemy.shield} maximum={enemy.kind === 'boss' ? 2 : 1} label={enemy.kind === 'boss' ? '迷霧將軍護盾' : '敵人護盾'} />}
            </button>
          ))}
        </div>
        {bossIntroVisible && <div className="battle-boss-intro" role="status">
          <strong>迷霧將軍親自上陣！</strong>
          <span>6 點生命・2 層護盾</span>
        </div>}
      </div>

      {targetReady ? <CampaignAudioReplayButton onReplay={replayTarget} onStop={stopTarget}
        paused={paused} disabled={phase === 'resolving' || tutorialQueue.length > 0}
        autoPlayKey={question.id} label="重播目標讀音" onPlaybackChange={setAudioPlaying} />
        : <p className="battle-select-prompt">先選擇想攻擊的迷霧哨兵</p>}

      <section className="battle-runes" aria-label="注音符文選項">
        {targetReady && question.options.map((option) => {
          const disabled = disabledRuneIds.has(option.id);
          return <button type="button" key={option.id}
            className={disabled ? 'disabled-rune' : ''}
            disabled={controlsDisabled || disabled}
            onClick={() => void answerRune(option)} aria-label={disabled ? `${option.symbol}，本題已停用` : `選擇 ${option.symbol}`}>
            {option.symbol}
          </button>;
        })}
      </section>

      <button type="button" className={`battle-piercing-button ${player.energy >= BATTLE_SKILL_COST ? 'ready' : ''}`}
        disabled={controlsDisabled || !selectedEnemyId || player.energy < BATTLE_SKILL_COST}
        onClick={() => void usePiercing()}>
        符音穿透 <span>消耗 ●●●</span>
      </button>

      <p className="battle-feedback" aria-live="polite">
        {feedback === 'correct' ? '注音水晶化為光芒攻擊敵人！' :
          feedback === 'enemy-attack' ? '迷霧哨兵發動攻擊！' :
            feedback === 'echo-shield' ? '回音護盾擋下了致命攻擊！' :
              feedback === 'piercing' ? '符音穿透直接擊中敵人！' :
                echoShieldNotice ? '回音護盾會在符合條件時自動保護你。' : ''}
      </p>

      {currentTip && <div className="battle-tutorial-backdrop">
        <section className="battle-tutorial-card" role="dialog" aria-modal="true" aria-label={TIP_CONTENT[currentTip].title}>
          <h2>{TIP_CONTENT[currentTip].title}</h2>
          <ul>{TIP_CONTENT[currentTip].lines.map((line) => <li key={line}>{line}</li>)}</ul>
          <button type="button" className="primary-button" onClick={dismissTutorial}>知道了</button>
        </section>
      </div>}
    </div>
  );
}
