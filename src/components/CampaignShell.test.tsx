import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CampaignSnapshot } from '../game/campaignTypes';
import { CampaignGuestNotice } from './CampaignGuestNotice';
import { CampaignIntro } from './CampaignIntro';
import { CampaignMap } from './CampaignMap';
import { CampaignDefeatScreen, CampaignSuccessScreen } from './CampaignOutcomeScreen';
import { CampaignAudioReplayButton } from './CampaignAudioReplayButton';
import { CampaignGameplayFrame } from './CampaignGameplayFrame';
import { CampaignStatusSlots } from './CampaignStatusSlots';

describe('campaign entry shell', () => {
  it('renders the exact guest warning and both confirmed choices', () => {
    const html = renderToStaticMarkup(
      <CampaignGuestNotice onContinue={() => undefined} onBack={() => undefined} />
    );

    expect(html).toContain('訪客進度不會永久保存，跳出訪客模式後記錄即會清空');
    expect(html).toContain('繼續以訪客遊玩');
    expect(html).toContain('返回模式選擇');
    expect(html).not.toContain('無法轉移');
  });

  it('starts the five-page chapter intro on the confirmed first narration', () => {
    const html = renderToStaticMarkup(
      <CampaignIntro onComplete={() => undefined} onBack={() => undefined} />
    );

    expect(html).toContain('第一章・被封印的王國之聲');
    expect(html).toContain('很久以前，注音王國是一個充滿聲音與魔法的祥和國度。');
    expect(html).toContain('第 1 頁，共 5 頁');
    expect(html).toContain('跳過');
    expect(html).toContain('下一頁');
  });
});

describe('first chapter map shell', () => {
  it('renders all eleven nodes with unlocked and locked states', () => {
    const snapshot: CampaignSnapshot = {
      chapter: {
        id: 'chapter',
        profileId: 'player',
        campaignId: 'campaign-01',
        createdAt: '2026-10-12T00:00:00.000Z',
        updatedAt: '2026-10-12T00:00:00.000Z',
        revision: 1
      },
      levels: [{
        id: 'level',
        profileId: 'player',
        campaignId: 'campaign-01',
        levelId: 'level-01',
        unlockedAt: '2026-10-12T00:00:00.000Z',
        bestStars: 0,
        updatedAt: '2026-10-12T00:00:00.000Z',
        revision: 1
      }],
      flags: []
    };
    const html = renderToStaticMarkup(
      <CampaignMap
        snapshot={snapshot}
        onBack={() => undefined}
        onReplayIntro={() => undefined}
      />
    );

    expect((html.match(/campaign-level-node/g) ?? []).length).toBe(11);
    expect(html).toContain('第 1 關 封印的門扉，可挑戰');
    expect(html).toContain('第 2 關 迷霧之路，尚未解鎖');
    expect(html).toContain('決戰迷霧將軍');
    expect(html).not.toContain('通關 0/11');
    expect(html).toContain('/assets/images/campaign/chapter-01-map.webp');
    expect(html).toContain('/assets/images/campaign/star.png');
    expect(html).toContain('0/33');
    expect(html).not.toContain('campaign-map-road');
  });

  it('shows chapter completion using the level eleven result without extra stars', () => {
    const snapshot: CampaignSnapshot = {
      chapter: {
        id: 'chapter',
        profileId: 'player',
        campaignId: 'campaign-01',
        completedAt: '2026-10-12T00:00:00.000Z',
        recentLevelId: 'level-11',
        recentLevelAt: '2026-10-12T00:00:00.000Z',
        createdAt: '2026-10-12T00:00:00.000Z',
        updatedAt: '2026-10-12T00:00:00.000Z',
        revision: 12
      },
      levels: Array.from({ length: 11 }, (_, index) => ({
        id: `level-${index + 1}`,
        profileId: 'player',
        campaignId: 'campaign-01',
        levelId: `level-${String(index + 1).padStart(2, '0')}`,
        unlockedAt: '2026-10-12T00:00:00.000Z',
        firstCompletedAt: '2026-10-12T00:00:00.000Z',
        lastCompletedAt: '2026-10-12T00:00:00.000Z',
        bestStars: 3 as const,
        bestResultId: `result-${index + 1}`,
        updatedAt: '2026-10-12T00:00:00.000Z',
        revision: 2
      })),
      flags: []
    };
    const html = renderToStaticMarkup(
      <CampaignMap
        snapshot={snapshot}
        onBack={() => undefined}
        onReplayIntro={() => undefined}
      />
    );

    expect(html).toContain('第一章完成');
    expect(html).not.toContain('通關 11/11');
    expect(html).toContain('33/33');
    expect((html.match(/campaign-map-node-stars/g) ?? []).length).toBe(11);
    expect(html).not.toContain('XP');
  });
});

describe('campaign outcome shell', () => {
  const level = {
    id: 'level-01',
    gameplayId: 'sequence-lock' as const,
    number: 1,
    title: '封印的門扉',
    difficultyLabel: '入門',
    objective: '解開三道封印。'
  };

  it('shows only the confirmed success summary fields and actions', () => {
    const html = renderToStaticMarkup(
      <CampaignSuccessScreen
        level={level}
        stars={3}
        performanceLabel="錯誤序列次數"
        performanceValue="0 次"
        xpAwarded={50}
        newBest
        newLevelUnlocked
        onReturnToMap={() => undefined}
        onRetry={() => undefined}
      />
    );

    expect(html).toContain('挑戰成功');
    expect(html).toContain('錯誤序列次數');
    expect(html).toContain('本次獲得 50 XP');
    expect(html).toContain('新關卡已解鎖');
    expect((html.match(/<img src="\/assets\/images\/campaign\/star\.png"/g) ?? []).length).toBe(3);
    expect(html).toContain('返回地圖');
    expect(html).toContain('重新挑戰');
    expect(html).not.toContain('下一關');
  });

  it('shows chapter completion for the boss result without a new-level notice', () => {
    const html = renderToStaticMarkup(
      <CampaignSuccessScreen
        level={{ ...level, id: 'level-11', gameplayId: 'boss-battle', number: 11, title: '決戰迷霧將軍' }}
        stars={3}
        performanceLabel="剩餘生命"
        performanceValue="5 點"
        xpAwarded={50}
        newBest
        newLevelUnlocked={false}
        chapterComplete
        onReturnToMap={() => undefined}
        onRetry={() => undefined}
      />
    );

    expect(html).toContain('第一章完成');
    expect(html).not.toContain('新關卡已解鎖');
    expect(html).toContain('本次獲得 50 XP');
  });

  it('keeps defeat free of stars, XP and unlock information', () => {
    const html = renderToStaticMarkup(
      <CampaignDefeatScreen
        level={level}
        message="封印尚未解除，再試一次吧！"
        onReturnToMap={() => undefined}
        onRetry={() => undefined}
      />
    );

    expect(html).toContain('挑戰失敗');
    expect(html).toContain('重新挑戰');
    expect(html).toContain('返回地圖');
    expect(html).not.toContain('XP');
    expect(html).not.toContain('★');
    expect(html).not.toContain('解鎖');
  });
});

describe('campaign shared gameplay controls', () => {
  const gameplayLevel = {
    id: 'level-01',
    gameplayId: 'sequence-lock' as const,
    number: 1,
    title: '封印的門扉',
    difficultyLabel: '入門',
    objective: '解開三道封印。'
  };

  const gameplayFrameProps = {
    level: gameplayLevel,
    progressLabel: '封印進度',
    progress: <CampaignStatusSlots kind="seal" current={0} maximum={3} />,
    tutorialSteps: ['依序放入符文。'],
    onOpenPause: () => undefined,
    onOpenHowTo: () => undefined,
    onCloseHowTo: () => undefined,
    onResume: () => undefined,
    onRequestAbandon: () => undefined,
    onCancelAbandon: () => undefined,
    onAbandon: () => undefined,
    children: <div>遊戲內容</div>
  };

  it('removes the direct gameplay how-to button while keeping how-to in the pause menu', () => {
    const gameplayHtml = renderToStaticMarkup(
      <CampaignGameplayFrame {...gameplayFrameProps} overlay={null} />
    );
    const pausedHtml = renderToStaticMarkup(
      <CampaignGameplayFrame {...gameplayFrameProps} overlay="pause" />
    );

    expect(gameplayHtml).not.toContain('campaign-how-to-button');
    expect(gameplayHtml).toContain('campaign-gameplay-header-spacer');
    expect(gameplayHtml).toContain('pause-button.png');
    expect(gameplayHtml).not.toContain('&gt;Ⅱ&lt;');
    expect(pausedHtml).toContain('查看玩法');
  });

  it('allows sequence-lock levels to keep seal progress only in the central game scene', () => {
    const html = renderToStaticMarkup(
      <CampaignGameplayFrame
        {...gameplayFrameProps}
        progress={null}
        progressLabel={undefined}
        overlay={null}
      />
    );

    expect(html).not.toContain('封印進度');
    expect(html).not.toContain('campaign-status-seal');
  });

  it('renders replay as an unlimited action without score or penalty copy', () => {
    const html = renderToStaticMarkup(
      <CampaignAudioReplayButton onReplay={() => undefined} />
    );

    expect(html).toContain('重播讀音');
    expect(html).toContain('campaign-speaker-icon');
    expect(html).not.toContain('播放中…');
    expect(html).not.toContain('扣分');
    expect(html).not.toContain('次數');
  });

  it('renders fixed visual slots while keeping a numeric accessible label', () => {
    const html = renderToStaticMarkup(
      <CampaignStatusSlots kind="energy" current={3} maximum={5} />
    );

    expect(html).toContain('聲音能量 3／5');
    expect((html.match(/class="filled"/g) ?? [])).toHaveLength(3);
    expect((html.match(/class="empty"/g) ?? [])).toHaveLength(2);
    expect((html.match(/<img src="\/assets\/images\/campaign\/energy-full\.png"/g) ?? [])).toHaveLength(3);
    expect((html.match(/<img src="\/assets\/images\/campaign\/energy-empty\.png"/g) ?? [])).toHaveLength(2);
    expect(html).not.toContain('&gt;3/5&lt;');
  });

  it('renders collected and pending sound fragments from the shared fragment art', () => {
    const html = renderToStaticMarkup(
      <CampaignStatusSlots kind="fragment" current={1} maximum={3} />
    );

    expect(html).toContain('聲音碎片 1／3');
    expect((html.match(/<img[^>]+sound-fragment-small\.png/g) ?? [])).toHaveLength(3);
    expect((html.match(/class="filled"/g) ?? [])).toHaveLength(1);
    expect((html.match(/class="empty"/g) ?? [])).toHaveLength(2);
  });

});
