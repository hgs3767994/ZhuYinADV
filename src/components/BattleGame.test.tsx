import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/audio', () => ({
  audioService: {
    speakSequence: vi.fn().mockResolvedValue(undefined),
    stopSpeech: vi.fn(),
    playWrong: vi.fn(),
    playCorrect: vi.fn()
  }
}));

import { BattleGame } from './BattleGame';
import { DEFAULT_AVATAR_RECIPE } from '../avatar/model';
import { CAMPAIGN_IMAGES } from '../game/campaignAssets';

describe('level-five battle shell', () => {
  it('starts with one selected enemy, hidden answer, two runes and unavailable skills', () => {
    const html = renderToStaticMarkup(<BattleGame variant="beginner" avatarRecipe={DEFAULT_AVATAR_RECIPE}
      resultId="battle-preview" paused inputEnabled={false}
      tutorialTipsSeen={{ correct: false, wrong: false, energy: false, shield: true }}
      onTutorialTipSeen={() => undefined} onStatusChange={() => undefined}
      onInteractionLockChange={() => undefined} onDefeat={() => undefined} onSolved={() => undefined} />);

    expect(html).toContain('已選定迷霧哨兵');
    expect(html).toContain('重播目標讀音');
    expect((html.match(/battle-runes/g) ?? [])).toHaveLength(1);
    expect((html.match(/aria-label="選擇 [^\"]+"/g) ?? [])).toHaveLength(2);
    expect(html).toContain('符音穿透');
    expect(html).toContain('回音護盾（被動技能）');
    expect(html).toContain('battle-fog-soldier.png');
    expect(html).toContain('battle-skill-attack.png');
    expect(html).toContain('battle-echo-shield.png');
    expect(html).toContain('battle-adventurer-puppet');
    expect(html).toContain('level-04-forest-backdrop.jpg');
    expect(html).toContain('level-04-forest-foreground.png');
    expect(html).not.toContain('小亞在後方觀戰');
    expect(html).toContain('玩家回合');
    expect(html).not.toContain('注音水晶化為光芒攻擊敵人');
    expect(html).not.toContain('迷霧哨兵發動攻擊');
    expect(html).not.toContain('目標符文');
    expect(html).not.toContain('倒數');
  });

  it('registers every formal level-five battle artwork asset', () => {
    expect([
      CAMPAIGN_IMAGES.battleFogSoldier,
      CAMPAIGN_IMAGES.battleFogSoldierShielded,
      CAMPAIGN_IMAGES.battleRegularAttack,
      CAMPAIGN_IMAGES.battleSkillAttack,
      CAMPAIGN_IMAGES.battleEnemyAttack,
      CAMPAIGN_IMAGES.battleDefenseSuccess,
      CAMPAIGN_IMAGES.battleEchoShield
    ]).toEqual([
      '/assets/images/campaign/battle-fog-soldier.png',
      '/assets/images/campaign/battle-fog-soldier-shielded.png',
      '/assets/images/campaign/battle-regular-attack.png',
      '/assets/images/campaign/battle-skill-attack.png',
      '/assets/images/campaign/battle-enemy-attack.png',
      '/assets/images/campaign/battle-defense-success.png',
      '/assets/images/campaign/battle-echo-shield.png'
    ]);
  });

  it('starts the castle battle with three runes and keeps the shield tutorial for wave five', () => {
    const html = renderToStaticMarkup(<BattleGame variant="castle" avatarRecipe={DEFAULT_AVATAR_RECIPE}
      resultId="castle-preview" paused inputEnabled={false}
      tutorialTipsSeen={{ correct: true, wrong: true, energy: true, shield: false }}
      onTutorialTipSeen={() => undefined} onStatusChange={() => undefined}
      onInteractionLockChange={() => undefined} onDefeat={() => undefined} onSolved={() => undefined} />);

    expect(html).toContain('已選定迷霧哨兵');
    expect((html.match(/aria-label="選擇 [^"]+"/g) ?? [])).toHaveLength(3);
    expect(html).not.toContain('護盾敵人');
    expect(html).not.toContain('倒數');
  });

  it('starts the boss battle without Xiao Ya and shows the general commanding from the crystal', () => {
    const html = renderToStaticMarkup(<BattleGame variant="boss" avatarRecipe={DEFAULT_AVATAR_RECIPE}
      resultId="boss-preview" paused inputEnabled={false}
      tutorialTipsSeen={{ correct: true, wrong: true, energy: true, shield: true }}
      onTutorialTipSeen={() => undefined} onStatusChange={() => undefined}
      onInteractionLockChange={() => undefined} onDefeat={() => undefined} onSolved={() => undefined} />);

    expect(html).toContain('迷霧將軍在封印水晶前指揮戰鬥');
    expect(html).not.toContain('小亞在後方觀戰');
    expect((html.match(/aria-label="選擇 [^"]+"/g) ?? [])).toHaveLength(3);
    expect(html).not.toContain('倒數');
  });
});
