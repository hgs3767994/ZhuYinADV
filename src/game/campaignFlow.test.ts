import { describe, expect, it } from 'vitest';
import { campaignLevel } from './campaignConfig';
import {
  campaignFlowContent,
  campaignFlowReducer,
  campaignSystemBackAction,
  createCampaignFlowState,
  type CampaignFlowState
} from './campaignFlow';

describe('campaign level flow', () => {
  it('keeps the confirmed level one story, mission and tutorial copy together', () => {
    const content = campaignFlowContent(campaignLevel('campaign-01', 'level-01'));

    expect(content.tutorialId).toBe('sequence-lock-basic');
    expect(content.preStory).toHaveLength(3);
    expect(content.preStory[1].text).toContain('項鍊上的注音水晶');
    expect(content.mission).toBe('仔細聽注音的順序，依序將卡片放入鎖孔，解開三道封印！');
    expect(content.tutorialSteps).toHaveLength(4);
    expect(content.postStory[2].text).toContain('握緊注音水晶');
  });

  it('keeps level two as a fork-only sound maze with its confirmed story', () => {
    const content = campaignFlowContent(campaignLevel('campaign-01', 'level-02'));

    expect(content.tutorialId).toBe('sound-maze-basic');
    expect(content.preStory).toHaveLength(3);
    expect(content.mission).toContain('找齊三枚聲音碎片');
    expect(content.tutorialSteps).toHaveLength(5);
    expect(content.tutorialSteps.join('')).toContain('岔路');
    expect(content.tutorialSteps.join('')).not.toContain('符文門');
    expect(content.postStory).toHaveLength(4);
    expect(content.postStory[2].text).toContain('聲音典籍魔法師');
  });

  it('keeps the confirmed level-three memory rules and introduces Xiao Ya only after voice is restored', () => {
    const content = campaignFlowContent(campaignLevel('campaign-01', 'level-03'));

    expect(content.tutorialId).toBe('memory-explore-basic');
    expect(content.preStory).toHaveLength(4);
    expect(content.preStory.map((page) => page.text).join('')).not.toContain('小亞');
    expect(content.mission).toContain('全部五組迷霧封印');
    expect(content.tutorialSteps).toHaveLength(7);
    expect(content.tutorialSteps.join('')).toContain('顯示 5 秒');
    expect(content.tutorialSteps.join('')).toContain('不會顯示答案符號');
    expect(content.tutorialSteps.join('')).toContain('第三張相同卡片會自動翻開');
    expect(content.tutorialSteps.join('')).toContain('補入一組未出現過的新符文');
    expect(content.tutorialSteps.join('')).toContain('3 × 3');
    expect(content.postStory).toHaveLength(5);
    expect(content.postStory[0]).toMatchObject({ speaker: '小亞' });
    expect(content.postStory[0].leadText).toContain('重新發出了聲音');
  });

  it('keeps the confirmed level-four escort story and seven gameplay rules', () => {
    const content = campaignFlowContent(campaignLevel('campaign-01', 'level-04'));

    expect(content.tutorialId).toBe('escort-basic');
    expect(content.preStory).toHaveLength(4);
    expect(content.preStory[2].text).toContain('不擅長戰鬥');
    expect(content.mission).toContain('護送小亞通過十個路段');
    expect(content.tutorialSteps).toHaveLength(7);
    expect(content.tutorialSteps.join('')).toContain('5 秒');
    expect(content.tutorialSteps.join('')).toContain('重播不會停止或重置倒數');
    expect(content.tutorialSteps.join('')).toContain('疾風加速');
    expect(content.postStory).toHaveLength(4);
    expect(content.postStory[1].text).toContain('秘道的入口快到了');
  });

  it('keeps level five battle onboarding split from triggered and full how-to rules', () => {
    const content = campaignFlowContent(campaignLevel('campaign-01', 'level-05'));

    expect(content.tutorialId).toBe('battle-basic');
    expect(content.preStory).toHaveLength(4);
    expect(content.mission).toContain('擊敗五波迷霧哨兵');
    expect(content.tutorialPages).toHaveLength(2);
    expect(content.tutorialPages?.[0].steps).toHaveLength(5);
    expect(content.tutorialPages?.[0].steps.join('')).toContain('玩家進行 2 回合');
    expect(content.tutorialPages?.[1].steps.join('')).toContain('回音護盾');
    expect(content.tutorialPages?.[0].steps.join('')).not.toContain('選錯符文');
    expect(content.howToSteps?.join('')).toContain('符音穿透');
    expect(content.howToSteps?.join('')).toContain('消耗一次玩家回合行動');
    expect(content.postStory).toHaveLength(4);
    expect(content.postStory[3].text).toContain('更多敵人正在趕來');
  });

  it('keeps level six as a brief chase reminder with the confirmed story', () => {
    const content = campaignFlowContent(campaignLevel('campaign-01', 'level-06'));

    expect(content.tutorialId).toBe('chase-basic');
    expect(content.preStory).toHaveLength(4);
    expect(content.preStory[0].text).toBe('更多迷霧哨兵從遠處趕來。');
    expect(content.mission).toContain('穿過十個路段');
    expect(content.tutorialSteps).toHaveLength(4);
    expect(content.tutorialSteps.join('')).toContain('超過 5 秒');
    expect(content.tutorialSteps.join('')).toContain('逃離失敗');
    expect(content.howToSteps).toHaveLength(7);
    expect(content.howToSteps?.join('')).toContain('重播不會停止或重置倒數');
    expect(content.postStory).toHaveLength(4);
    expect(content.postStory[2].text).toContain('入口隨即在身後關閉');
  });

  it('keeps level seven as a rune-gate-only maze with the confirmed story', () => {
    const content = campaignFlowContent(campaignLevel('campaign-01', 'level-07'));

    expect(content.tutorialId).toBe('sound-maze-rune-gate');
    expect(content.preStory).toHaveLength(4);
    expect(content.preStory[0].text).toContain('只能看清附近的一小段道路');
    expect(content.mission).toContain('選擇正確的符文門');
    expect(content.tutorialSteps).toHaveLength(5);
    expect(content.tutorialSteps.join('')).toContain('選錯符文門');
    expect(content.tutorialSteps.join('')).not.toContain('選擇顯示正確符號的岔路');
    expect(content.postStory).toHaveLength(4);
    expect(content.postStory[2].text).toContain('首席魔法師');
    expect(content.postStory[3].text).toContain('注音水晶產生了共鳴');
  });

  it('keeps level eight as the confirmed abbreviated magic-door flow', () => {
    const content = campaignFlowContent(campaignLevel('campaign-01', 'level-08'));

    expect(content.tutorialId).toBe('sequence-lock-magic-door');
    expect(content.preStory).toHaveLength(4);
    expect(content.preStory[1].text).toContain('第一道封印傳出了一段咒語聲');
    expect(content.mission).toContain('魔法之門的三道封印');
    expect(content.tutorialSteps).toHaveLength(4);
    expect(content.tutorialSteps.join('')).toContain('點擊鎖孔內的卡片');
    expect(content.tutorialSteps.join('')).not.toContain('倒數');
    expect(content.postStory).toHaveLength(4);
    expect(content.postStory[2].text).toContain('昏暗的走廊中瀰漫著黑色霧氣');
    expect(content.postStory[3].text).toContain('迷霧士兵');
  });

  it('keeps level nine battle reminders, shield rules and confirmed story together', () => {
    const content = campaignFlowContent(campaignLevel('campaign-01', 'level-09'));

    expect(content.tutorialId).toBe('battle-castle-reminder');
    expect(content.preStory).toHaveLength(4);
    expect(content.mission).toContain('擊敗五波駐守城堡的迷霧士兵');
    expect(content.tutorialSteps).toHaveLength(6);
    expect(content.tutorialSteps.join('')).toContain('玩家進行 2 回合');
    expect(content.tutorialSteps.join('')).toContain('生命與聲音能量會延續');
    expect(content.howToSteps?.join('')).toContain('護盾敵人');
    expect(content.howToSteps?.join('')).toContain('符音穿透');
    expect(content.howToSteps?.join('')).toContain('消耗一次玩家回合行動');
    expect(content.postStory).toHaveLength(4);
    expect(content.postStory[2].text).toContain('五組迷霧封印');
    expect(content.postStory[3].text).toContain('迷霧將軍就在結界後面');
  });

  it('keeps level ten as the confirmed memory battle flow without energy skills', () => {
    const content = campaignFlowContent(campaignLevel('campaign-01', 'level-10'));

    expect(content.tutorialId).toBe('memory-battle');
    expect(content.preStory).toHaveLength(4);
    expect(content.mission).toContain('在生命歸零前擊破結界');
    expect(content.mission).toContain('五組目標配對');
    expect(content.tutorialSteps).toHaveLength(7);
    expect(content.tutorialSteps.join('')).toContain('結界會發動攻擊');
    expect(content.tutorialSteps.join('')).toContain('補入一組未出現過的新符文');
    expect(content.tutorialSteps.join('')).not.toContain('聲音能量');
    expect(content.tutorialSteps.join('')).not.toContain('符音穿透');
    expect(content.postStory).toHaveLength(5);
    expect(content.postStory[3].text).toContain('我會留在這裡阻止它再生');
    expect(content.postStory[4].text).toContain('獨自走進');
  });

  it('keeps level eleven as the confirmed solo boss battle and seven-page ending', () => {
    const content = campaignFlowContent(campaignLevel('campaign-01', 'level-11'));

    expect(content.tutorialId).toBe('boss-battle-reminder');
    expect(content.preStory).toHaveLength(5);
    expect(content.preStory.map((page) => `${page.speaker ?? ''}${page.text}`).join('')).not.toContain('小亞');
    expect(content.mission).toContain('打倒迷霧將軍');
    expect(content.tutorialSteps).toHaveLength(6);
    expect(content.tutorialSteps.join('')).toContain('消耗一次玩家回合行動');
    expect(content.tutorialSteps.join('')).toContain('從第一波重新挑戰');
    expect(content.postStory).toHaveLength(7);
    expect(content.postStory.map((page) => `${page.speaker ?? ''}${page.text}`).join('')).not.toContain('小亞');
    expect(content.postStory[2].text).toContain('化為黑霧');
    expect(content.postStory[6].text).toContain('遙遠的寂靜王國');
  });

  it('routes a first visit through story, mission and tutorial', () => {
    let state = createCampaignFlowState(true);
    state = campaignFlowReducer(state, { type: 'skip-pre-story' });
    expect(state.phase).toBe('mission');
    state = campaignFlowReducer(state, { type: 'continue-mission' });
    expect(state.phase).toBe('tutorial');
    state = campaignFlowReducer(state, { type: 'complete-tutorial' });
    expect(state.phase).toBe('gameplay');
  });

  it('moves backward and forward through pre-story only through explicit actions', () => {
    let state = createCampaignFlowState(true);
    state = campaignFlowReducer(state, { type: 'advance-pre-story', pageCount: 3 });
    expect(state.storyPage).toBe(1);
    state = campaignFlowReducer(state, { type: 'previous-pre-story' });
    expect(state).toMatchObject({ phase: 'pre-story', storyPage: 0 });
    state = campaignFlowReducer(state, { type: 'previous-pre-story' });
    expect(state.storyPage).toBe(0);
  });

  it('skips the automatic tutorial after it has already been seen', () => {
    let state = createCampaignFlowState(false);
    state = campaignFlowReducer(state, { type: 'skip-pre-story' });
    state = campaignFlowReducer(state, { type: 'continue-mission' });
    expect(state.phase).toBe('gameplay');
  });

  it('returns how-to to the correct paused state without changing gameplay phase', () => {
    let state: CampaignFlowState = { ...createCampaignFlowState(false), phase: 'gameplay' };
    state = campaignFlowReducer(state, { type: 'open-pause' });
    state = campaignFlowReducer(state, { type: 'open-how-to', origin: 'pause' });
    expect(state.overlay).toBe('how-to-paused');
    state = campaignFlowReducer(state, { type: 'close-how-to' });
    expect(state).toMatchObject({ phase: 'gameplay', overlay: 'pause' });
  });

  it('maps system back to the expected gameplay overlay action', () => {
    expect(campaignSystemBackAction(null)).toEqual({ type: 'open-pause' });
    expect(campaignSystemBackAction('pause')).toEqual({ type: 'resume' });
    expect(campaignSystemBackAction('how-to-paused')).toEqual({ type: 'close-how-to' });
    expect(campaignSystemBackAction('abandon-confirm')).toEqual({ type: 'cancel-abandon' });
  });

  it('does not show post-story until a successful save has completed', () => {
    let state: CampaignFlowState = { ...createCampaignFlowState(false), phase: 'gameplay' };
    state = campaignFlowReducer(state, { type: 'begin-saving' });
    expect(state.phase).toBe('saving');
    state = campaignFlowReducer(state, { type: 'save-succeeded' });
    expect(state.phase).toBe('post-story');
  });

  it('can skip saved post-story directly to the result', () => {
    let state: CampaignFlowState = { ...createCampaignFlowState(false), phase: 'saving' };
    state = campaignFlowReducer(state, { type: 'save-succeeded' });
    state = campaignFlowReducer(state, { type: 'skip-post-story' });
    expect(state.phase).toBe('result');
  });

  it('moves backward within post-story without leaving the saved story phase', () => {
    let state: CampaignFlowState = { ...createCampaignFlowState(false), phase: 'post-story' };
    state = campaignFlowReducer(state, { type: 'previous-post-story' });
    expect(state).toMatchObject({ phase: 'post-story', storyPage: 0 });
    state = campaignFlowReducer(state, { type: 'advance-post-story', pageCount: 3 });
    state = campaignFlowReducer(state, { type: 'previous-post-story' });
    expect(state).toMatchObject({ phase: 'post-story', storyPage: 0 });
  });

  it('routes a failed escort to defeat without saving or post-story', () => {
    let state: CampaignFlowState = { ...createCampaignFlowState(false), phase: 'gameplay' };
    state = campaignFlowReducer(state, { type: 'defeat' });
    expect(state).toMatchObject({ phase: 'defeat', overlay: null });
    state = campaignFlowReducer(state, { type: 'retry' });
    expect(state.phase).toBe('mission');
  });
});
