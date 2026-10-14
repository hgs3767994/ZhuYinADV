import { useCallback, useMemo, useReducer, useRef, useState } from 'react';
import type { CampaignLevelDefinition } from '../game/campaignConfig';
import { campaignFlowContent, campaignFlowReducer, createCampaignFlowState, type CampaignStoryPage } from '../game/campaignFlow';
import { saveCampaignCompletionWithRetry } from '../game/campaignSave';
import type { CampaignCompletionInput, CampaignPerformance, CampaignStars, SavedCampaignCompletion } from '../game/campaignTypes';
import { MEMORY_GROUP_COUNT } from '../game/memoryExplore';
import { BattleGame, type BattleGameStatus, type BattleTutorialTip } from './BattleGame';
import { CampaignGameplayFrame } from './CampaignGameplayFrame';
import { CampaignDefeatScreen, CampaignSuccessScreen } from './CampaignOutcomeScreen';
import { CampaignStatusSlots } from './CampaignStatusSlots';
import { Modal } from './Modal';
import { MemoryExploreGame } from './MemoryExploreGame';
import { PursuitGame, type PursuitGameStatus } from './PursuitGame';
import { SequenceLockGame } from './SequenceLockGame';
import { SoundMazeGame } from './SoundMazeGame';

interface CampaignLevelFlowProps {
  level: CampaignLevelDefinition;
  profileId: string;
  campaignId: string;
  appVersion: string;
  tutorialSeen: boolean;
  initialBestStars: 0 | CampaignStars;
  initialCompleted: boolean;
  onTutorialSeen: (tutorialId: string) => Promise<void>;
  onComplete: (input: CampaignCompletionInput) => Promise<SavedCampaignCompletion>;
  onReturnToMap: () => void;
}

interface StorySequenceProps {
  level: CampaignLevelDefinition;
  page: CampaignStoryPage;
  pageIndex: number;
  pageCount: number;
  finalLabel: string;
  onAdvance: () => void;
  onPrevious: () => void;
  onBack?: () => void;
  onSkip: () => void;
}

interface CompletionSummary {
  saved: SavedCampaignCompletion;
  stars: CampaignStars;
  performanceLabel: string;
  performanceValue: string;
  newBest: boolean;
  newLevelUnlocked: boolean;
}

function newResultId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `campaign-result-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function StorySequence({ level, page, pageIndex, pageCount, finalLabel, onAdvance, onPrevious, onBack, onSkip }: StorySequenceProps) {
  return (
    <main className="screen campaign-level-story-screen">
      <header className="campaign-level-flow-header">
        {onBack ? <button type="button" className="campaign-text-button" onClick={onBack}>返回</button> : <span aria-hidden="true" />}
        <strong>第 {level.number} 關・{level.title}</strong>
        <button type="button" className="campaign-text-button" onClick={onSkip}>跳過</button>
      </header>
      <section className="campaign-level-story-stage">
        <div className="campaign-level-scene-placeholder" aria-hidden="true"><span>{pageIndex + 1}</span></div>
        <div className="campaign-level-dialogue">
          {page.leadText && <p className="campaign-level-dialogue-lead">{page.leadText}</p>}
          {page.speaker && <small>{page.speaker}</small>}
          <p>{page.text}</p>
        </div>
      </section>
      <footer className="campaign-level-flow-footer">
        <div className="campaign-story-dots" aria-label={`第 ${pageIndex + 1} 頁，共 ${pageCount} 頁`}>
          {Array.from({ length: pageCount }, (_, index) => <span key={index} className={index === pageIndex ? 'active' : ''} />)}
        </div>
        <div className="campaign-story-actions">
          <button type="button" className="secondary-button" onClick={onPrevious} disabled={pageIndex === 0}>上一頁</button>
          <button type="button" className="primary-button" onClick={onAdvance}>{pageIndex + 1 === pageCount ? finalLabel : '下一頁'}</button>
        </div>
      </footer>
    </main>
  );
}

export function CampaignLevelFlow({
  level, profileId, campaignId, appVersion, tutorialSeen, initialBestStars, initialCompleted,
  onTutorialSeen, onComplete, onReturnToMap
}: CampaignLevelFlowProps) {
  const content = useMemo(() => campaignFlowContent(level), [level]);
  const [state, dispatch] = useReducer(campaignFlowReducer, tutorialSeen, (seen) => createCampaignFlowState(!seen));
  const [confirmReturn, setConfirmReturn] = useState(false);
  const [tutorialSaving, setTutorialSaving] = useState(false);
  const [tutorialError, setTutorialError] = useState(false);
  const [tutorialPageIndex, setTutorialPageIndex] = useState(0);
  const [resultId, setResultId] = useState<string | null>(null);
  const [remainingSeals, setRemainingSeals] = useState(3);
  const [collectedFragments, setCollectedFragments] = useState(0);
  const [pursuitStatus, setPursuitStatus] = useState<PursuitGameStatus>({
    segmentNumber: 1,
    safetyDistance: 3,
    successStreak: 0,
    maxSuccessStreak: 0
  });
  const [battleStatus, setBattleStatus] = useState<BattleGameStatus>({ waveNumber: 1, lives: 5, energy: 0 });
  const [memoryBattleLives, setMemoryBattleLives] = useState(5);
  const [battleTipsSeen, setBattleTipsSeen] = useState<Record<BattleTutorialTip, boolean>>({
    correct: tutorialSeen || level.id !== 'level-05',
    wrong: tutorialSeen || level.id !== 'level-05',
    energy: tutorialSeen || level.id !== 'level-05',
    shield: tutorialSeen || level.id !== 'level-09'
  });
  const [gameInputLocked, setGameInputLocked] = useState(false);
  const [completionInput, setCompletionInput] = useState<CampaignCompletionInput | null>(null);
  const completionInputRef = useRef<CampaignCompletionInput | null>(null);
  const [completionSummary, setCompletionSummary] = useState<CompletionSummary | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const beginGameplay = useCallback(() => {
    setResultId(newResultId());
    setRemainingSeals(level.gameplayId === 'memory-explore' || level.gameplayId === 'memory-battle' ? MEMORY_GROUP_COUNT : 3);
    setCollectedFragments(0);
    setPursuitStatus({ segmentNumber: 1, safetyDistance: 3, successStreak: 0, maxSuccessStreak: 0 });
    setBattleStatus({ waveNumber: 1, lives: 5, energy: 0 });
    setMemoryBattleLives(5);
    setGameInputLocked(false);
    setCompletionInput(null);
    completionInputRef.current = null;
    setCompletionSummary(null);
    setSaveError(false);
  }, [level.gameplayId]);

  const completeTutorial = async () => {
    if (tutorialSaving) return;
    setTutorialSaving(true);
    setTutorialError(false);
    try {
      await onTutorialSeen(content.tutorialId);
      beginGameplay();
      dispatch({ type: 'complete-tutorial' });
    } catch (error) {
      console.warn('無法保存闖關教學狀態', error);
      setTutorialError(true);
    } finally {
      setTutorialSaving(false);
    }
  };

  const saveCompletion = useCallback(async (input: CampaignCompletionInput, automatic: boolean) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      const saved = await saveCampaignCompletionWithRetry(input, onComplete, {
        attempts: automatic ? 2 : 1
      });
      setCompletionSummary({
        saved,
        stars: input.stars,
        performanceLabel: input.performance.kind === 'maze'
          ? '錯誤路線次數'
          : input.performance.kind === 'memory-explore'
            ? '錯誤配對次數'
            : input.performance.kind === 'pursuit'
              ? '終點安全距離／最高連續成功'
              : input.performance.kind === 'battle'
                ? '剩餘生命'
            : '錯誤序列次數',
        performanceValue: input.performance.kind === 'maze'
          ? `${input.performance.wrongRouteCount} 次`
          : input.performance.kind === 'memory-explore'
            ? `${input.performance.wrongPairCount} 次`
            : input.performance.kind === 'pursuit'
              ? `${input.performance.finalSafetyDistance} 格／${input.performance.maxSuccessStreak} 次`
              : input.performance.kind === 'battle'
                ? `${input.performance.remainingLives} 點`
            : input.performance.kind === 'sequence-lock'
              ? `${input.performance.wrongSequenceCount} 次`
              : '—',
        newBest: input.stars > initialBestStars,
        newLevelUnlocked: !initialCompleted && level.id !== 'level-11'
      });
      savingRef.current = false;
      setSaving(false);
      dispatch({ type: 'save-succeeded' });
    } catch (error) {
      console.warn('無法保存闖關結果', error);
      savingRef.current = false;
      setSaving(false);
      setSaveError(true);
    }
  }, [initialBestStars, initialCompleted, level.id, onComplete]);

  const solveLevel = useCallback((result: {
    stars: CampaignStars;
    performance: CampaignPerformance;
    durationMs: number;
  }) => {
    if (!resultId || completionInputRef.current) return;
    const input: CampaignCompletionInput = {
      resultId,
      profileId,
      campaignId,
      levelId: level.id,
      gameplayId: level.gameplayId,
      stars: result.stars,
      performance: result.performance,
      durationMs: result.durationMs,
      playedAt: new Date().toISOString(),
      appVersion
    };
    completionInputRef.current = input;
    setCompletionInput(input);
    dispatch({ type: 'begin-saving' });
    void saveCompletion(input, true);
  }, [appVersion, campaignId, level.gameplayId, level.id, profileId, resultId, saveCompletion]);

  if (state.phase === 'pre-story') return (
    <>
      <StorySequence level={level} page={content.preStory[state.storyPage]} pageIndex={state.storyPage} pageCount={content.preStory.length}
        finalLabel="查看任務" onAdvance={() => dispatch({ type: 'advance-pre-story', pageCount: content.preStory.length })}
        onPrevious={() => dispatch({ type: 'previous-pre-story' })}
        onBack={() => setConfirmReturn(true)} onSkip={() => dispatch({ type: 'skip-pre-story' })} />
      {confirmReturn && <Modal title="要返回地圖嗎？" className="campaign-return-modal"><div className="modal-actions">
        <button type="button" className="primary-button" onClick={() => setConfirmReturn(false)}>繼續觀看</button>
        <button type="button" className="secondary-button" onClick={onReturnToMap}>返回地圖</button>
      </div></Modal>}
    </>
  );

  if (state.phase === 'mission') return (
    <main className="screen campaign-mission-screen">
      <header className="campaign-level-flow-header"><button type="button" className="campaign-text-button" onClick={onReturnToMap}>返回地圖</button><strong>第 {level.number} 關・{level.title}</strong><span aria-hidden="true" /></header>
      <section className="campaign-mission-card"><h1>{level.title}</h1><small>任務提示</small><p>{content.mission}</p></section>
      <footer className="campaign-level-flow-footer"><button type="button" className="primary-button" onClick={() => {
        if (!state.tutorialRequired) beginGameplay();
        dispatch({ type: 'continue-mission' });
      }}>{state.tutorialRequired ? '查看玩法' : '開始挑戰'}</button></footer>
    </main>
  );

  if (state.phase === 'tutorial') return (
    <main className="screen campaign-tutorial-screen">
      <header className="campaign-level-flow-header campaign-simple-header"><span aria-hidden="true" /><strong>玩法說明</strong><span aria-hidden="true" /></header>
      <section className="campaign-tutorial-card"><h1>{level.title}・{content.tutorialPages?.[tutorialPageIndex]?.title ?? '基本操作'}</h1><ol>{(content.tutorialPages?.[tutorialPageIndex]?.steps ?? content.tutorialSteps).map((step) => <li key={step}>{step}</li>)}</ol></section>
      <footer className="campaign-level-flow-footer">{tutorialError && <p className="campaign-inline-error">無法保存教學狀態，請重新嘗試。</p>}<button type="button" className="primary-button" disabled={tutorialSaving} onClick={() => {
        const pageCount = content.tutorialPages?.length ?? 1;
        if (tutorialPageIndex + 1 < pageCount) setTutorialPageIndex((current) => current + 1);
        else void completeTutorial();
      }}>{tutorialSaving ? '正在準備…' : tutorialError ? '重新嘗試' : tutorialPageIndex + 1 < (content.tutorialPages?.length ?? 1) ? '下一步' : '開始挑戰'}</button></footer>
    </main>
  );

  if (state.phase === 'saving') return (
    <main className="screen campaign-outcome-screen campaign-saving-screen"><section className="campaign-outcome-card" role="status">
      <small>第 {level.number} 關・{level.title}</small><h1>{saveError ? '進度尚未保存' : '正在保存通關進度…'}</h1>
      {saveError && <><p className="campaign-defeat-message">請重新儲存；本次結果與獎勵識別碼不會改變。</p><button type="button" className="primary-button" disabled={saving || !completionInput} onClick={() => completionInput && void saveCompletion(completionInput, false)}>{saving ? '正在儲存…' : '重新儲存'}</button></>}
    </section></main>
  );

  if (state.phase === 'post-story') return (
    <StorySequence level={level} page={content.postStory[state.storyPage]} pageIndex={state.storyPage} pageCount={content.postStory.length}
      finalLabel="查看結算" onAdvance={() => dispatch({ type: 'advance-post-story', pageCount: content.postStory.length })}
      onPrevious={() => dispatch({ type: 'previous-post-story' })}
      onSkip={() => dispatch({ type: 'skip-post-story' })} />
  );

  if (state.phase === 'result' && completionSummary) return (
    <CampaignSuccessScreen level={level} stars={completionSummary.stars} performanceLabel={completionSummary.performanceLabel}
      performanceValue={completionSummary.performanceValue} xpAwarded={completionSummary.saved.result.xpAwarded}
      newBest={completionSummary.newBest} newLevelUnlocked={completionSummary.newLevelUnlocked}
      chapterComplete={level.id === 'level-11'}
      onReturnToMap={onReturnToMap} onRetry={() => dispatch({ type: 'retry' })} />
  );

  if (state.phase === 'defeat') return (
    <CampaignDefeatScreen level={level} message={level.gameplayId === 'zhuyin-battle'
      ? '生命歸零，這次戰鬥失敗了。'
      : level.gameplayId === 'boss-battle'
        ? '生命歸零，決戰失敗了。請從第一波重新挑戰。'
      : level.gameplayId === 'memory-battle'
        ? '生命歸零，結界尚未破除。'
      : level.gameplayId === 'chase'
        ? '安全距離降到零，逃離失敗。'
        : '安全距離降到零，護送失敗。'}
      onReturnToMap={onReturnToMap} onRetry={() => dispatch({ type: 'retry' })} />
  );

  const mazeMode = level.gameplayId === 'sound-maze';
  const runeGateMaze = level.id === 'level-07';
  const memoryExploreMode = level.gameplayId === 'memory-explore';
  const memoryBattleMode = level.gameplayId === 'memory-battle';
  const memoryMode = memoryExploreMode || memoryBattleMode;
  const magicDoorSequence = level.id === 'level-08';
  const escortMode = level.gameplayId === 'escort';
  const chaseMode = level.gameplayId === 'chase';
  const pursuitMode = escortMode || chaseMode;
  const battleMode = level.gameplayId === 'zhuyin-battle' || level.gameplayId === 'boss-battle';
  const castleBattle = level.id === 'level-09';
  const bossBattle = level.gameplayId === 'boss-battle';
  return (
    <CampaignGameplayFrame level={level}
      progressLabel={mazeMode
        ? `聲音碎片 ${collectedFragments}／3`
        : pursuitMode
          ? `第 ${pursuitStatus.segmentNumber}／10 路段，連續成功 ${pursuitStatus.successStreak} 次，安全距離 ${pursuitStatus.safetyDistance}／5`
          : battleMode
            ? `第 ${battleStatus.waveNumber}／5 波，生命 ${battleStatus.lives}／5，聲音能量 ${battleStatus.energy}／5`
          : memoryBattleMode
            ? `生命 ${memoryBattleLives}／5，結界護盾 ${remainingSeals}／${MEMORY_GROUP_COUNT}`
        : `封印 ${remainingSeals}／${memoryExploreMode ? MEMORY_GROUP_COUNT : 3}`}
      progress={mazeMode
        ? <CampaignStatusSlots kind="fragment" current={collectedFragments} maximum={3} />
        : pursuitMode
          ? <div className="pursuit-top-status">
            <span>第 {pursuitStatus.segmentNumber}／10 路段</span>
            <span>連續 {pursuitStatus.successStreak}</span>
            <CampaignStatusSlots kind="distance" current={pursuitStatus.safetyDistance} maximum={5} />
          </div>
          : battleMode
            ? <div className="battle-top-status">
              <span>第 {battleStatus.waveNumber}／5 波</span>
              <CampaignStatusSlots kind="life" current={battleStatus.lives} maximum={5} />
              <CampaignStatusSlots kind="energy" current={battleStatus.energy} maximum={5} />
            </div>
          : memoryBattleMode
            ? <div className="battle-top-status memory-battle-top-status">
              <CampaignStatusSlots kind="life" current={memoryBattleLives} maximum={5} />
              <CampaignStatusSlots kind="shield" current={remainingSeals} maximum={MEMORY_GROUP_COUNT} label="結界護盾" />
            </div>
        : <CampaignStatusSlots kind="seal" current={remainingSeals} maximum={memoryExploreMode ? MEMORY_GROUP_COUNT : 3} />}
      tutorialSteps={content.howToSteps ?? content.tutorialSteps}
      overlay={state.overlay} onOpenPause={() => dispatch({ type: 'open-pause' })}
      onOpenHowTo={(origin) => dispatch({ type: 'open-how-to', origin })} onCloseHowTo={() => dispatch({ type: 'close-how-to' })}
      onResume={() => dispatch({ type: 'resume' })} onRequestAbandon={() => dispatch({ type: 'request-abandon' })}
      onCancelAbandon={() => dispatch({ type: 'cancel-abandon' })} onAbandon={onReturnToMap} inputLocked={gameInputLocked}>
      {({ paused, inputEnabled }) => resultId && (mazeMode ? (
        <SoundMazeGame key={resultId} variant={runeGateMaze ? 'rune-gate' : 'fork'} resultId={resultId} paused={paused} inputEnabled={inputEnabled}
          onFragmentCountChange={setCollectedFragments} onInteractionLockChange={setGameInputLocked}
          onSolved={(result) => solveLevel({
            stars: result.stars,
            performance: { kind: 'maze', wrongRouteCount: result.wrongRouteCount },
            durationMs: result.durationMs
          })} />
      ) : memoryMode ? (
        <MemoryExploreGame key={resultId} variant={memoryBattleMode ? 'battle' : 'explore'} resultId={resultId} paused={paused} inputEnabled={inputEnabled}
          onSealCountChange={setRemainingSeals} onLifeChange={setMemoryBattleLives} onInteractionLockChange={setGameInputLocked}
          onDefeat={() => dispatch({ type: 'defeat' })}
          onSolved={(result) => solveLevel({
            stars: result.stars,
            performance: memoryBattleMode
              ? { kind: 'battle', remainingLives: result.remainingLives }
              : { kind: 'memory-explore', wrongPairCount: result.wrongPairCount },
            durationMs: result.durationMs
          })} />
      ) : pursuitMode ? (
        <PursuitGame key={resultId} variant={chaseMode ? 'chase' : 'escort'} resultId={resultId} paused={paused} inputEnabled={inputEnabled}
          onStatusChange={setPursuitStatus} onInteractionLockChange={setGameInputLocked}
          onDefeat={() => dispatch({ type: 'defeat' })}
          onSolved={(result) => solveLevel({
            stars: result.stars,
            performance: {
              kind: 'pursuit',
              finalSafetyDistance: result.finalSafetyDistance,
              maxSuccessStreak: result.maxSuccessStreak
            },
            durationMs: result.durationMs
          })} />
      ) : battleMode ? (
        <BattleGame key={resultId} variant={bossBattle ? 'boss' : castleBattle ? 'castle' : 'beginner'} resultId={resultId} paused={paused} inputEnabled={inputEnabled}
          tutorialTipsSeen={battleTipsSeen}
          onTutorialTipSeen={(tip) => setBattleTipsSeen((current) => ({ ...current, [tip]: true }))}
          onStatusChange={setBattleStatus} onInteractionLockChange={setGameInputLocked}
          onDefeat={() => dispatch({ type: 'defeat' })}
          onSolved={(result) => solveLevel({
            stars: result.stars,
            performance: { kind: 'battle', remainingLives: result.remainingLives },
            durationMs: result.durationMs
          })} />
      ) : (
        <SequenceLockGame key={resultId} variant={magicDoorSequence ? 'magic-door' : 'entrance'} resultId={resultId} paused={paused}
          inputEnabled={inputEnabled} onSealCountChange={setRemainingSeals} onInteractionLockChange={setGameInputLocked}
          onSolved={(result) => solveLevel({
            stars: result.stars,
            performance: { kind: 'sequence-lock', wrongSequenceCount: result.wrongSequenceCount },
            durationMs: result.durationMs
          })} />
      ))}
    </CampaignGameplayFrame>
  );
}
