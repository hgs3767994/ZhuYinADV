export type CampaignGameplayId =
  | 'sequence-lock'
  | 'sound-maze'
  | 'memory-explore'
  | 'escort'
  | 'zhuyin-battle'
  | 'chase'
  | 'memory-battle'
  | 'boss-battle';

export interface CampaignLevelDefinition {
  id: string;
  gameplayId: CampaignGameplayId;
  number: number;
  title: string;
  difficultyLabel: string;
  objective: string;
}

export interface CampaignDefinition {
  id: string;
  levels: readonly CampaignLevelDefinition[];
}

export const FIRST_CAMPAIGN_ID = 'campaign-01';

export const FIRST_CAMPAIGN: CampaignDefinition = {
  id: FIRST_CAMPAIGN_ID,
  levels: [
    { id: 'level-01', gameplayId: 'sequence-lock', number: 1, title: '封印的門扉', difficultyLabel: '入門', objective: '依照聽到的順序排列注音符文，解開門上的三道封印。' },
    { id: 'level-02', gameplayId: 'sound-maze', number: 2, title: '迷霧之路', difficultyLabel: '入門', objective: '在迷霧中找齊三枚聲音碎片，走出通往村落的道路。' },
    { id: 'level-03', gameplayId: 'memory-explore', number: 3, title: '失聲的引路人', difficultyLabel: '入門', objective: '找出五組注音符文，解除小亞身上的迷霧封印。' },
    { id: 'level-04', gameplayId: 'escort', number: 4, title: '前往秘道', difficultyLabel: '入門', objective: '辨認安全道路，護送小亞前往地下秘道。' },
    { id: 'level-05', gameplayId: 'zhuyin-battle', number: 5, title: '迷霧哨兵', difficultyLabel: '入門', objective: '擊敗巡邏的迷霧哨兵，學會運用生命與聲音能量。' },
    { id: 'level-06', gameplayId: 'chase', number: 6, title: '逃離追兵', difficultyLabel: '一般', objective: '穿過十個路段，與小亞一起甩開追兵。' },
    { id: 'level-07', gameplayId: 'sound-maze', number: 7, title: '地下秘道', difficultyLabel: '一般', objective: '在黑暗的地下秘道中找出通往城堡內部的道路。' },
    { id: 'level-08', gameplayId: 'sequence-lock', number: 8, title: '魔法之門', difficultyLabel: '一般', objective: '依正確順序排列符文，解除秘道出口的三道封印。' },
    { id: 'level-09', gameplayId: 'zhuyin-battle', number: 9, title: '城堡守衛戰', difficultyLabel: '一般', objective: '擊敗城堡守衛與護盾敵人，突破前往封印水晶的道路。' },
    { id: 'level-10', gameplayId: 'memory-battle', number: 10, title: '破除結界', difficultyLabel: '特殊關卡', objective: '完成五組符文配對，擊破阻擋在迷霧將軍前的結界。' },
    { id: 'level-11', gameplayId: 'boss-battle', number: 11, title: '決戰迷霧將軍', difficultyLabel: '頭目戰', objective: '擊敗迷霧將軍並破壞封印魔法水晶，讓王國恢復聲音。' }
  ]
} as const;

const CAMPAIGNS = new Map<string, CampaignDefinition>([
  [FIRST_CAMPAIGN.id, FIRST_CAMPAIGN]
]);

export function campaignDefinition(campaignId: string): CampaignDefinition {
  const campaign = CAMPAIGNS.get(campaignId);
  if (!campaign) throw new Error('找不到闖關章節');
  return campaign;
}

export function campaignLevel(
  campaignId: string,
  levelId: string
): CampaignLevelDefinition {
  const level = campaignDefinition(campaignId).levels.find((item) => item.id === levelId);
  if (!level) throw new Error('找不到闖關關卡');
  return level;
}

export function nextCampaignLevel(
  campaignId: string,
  levelId: string
): CampaignLevelDefinition | null {
  const levels = campaignDefinition(campaignId).levels;
  const index = levels.findIndex((item) => item.id === levelId);
  if (index < 0) throw new Error('找不到闖關關卡');
  return levels[index + 1] ?? null;
}
