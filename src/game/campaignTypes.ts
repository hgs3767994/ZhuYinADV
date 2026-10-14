import type { ExperienceProgress, RankId } from './experience';
import type { CampaignGameplayId } from './campaignConfig';

export type CampaignStars = 1 | 2 | 3;
export type CampaignContentFlagType = 'chapter-intro' | 'tutorial';
export type CampaignRewardKind =
  | 'clear'
  | 'star-1'
  | 'star-2'
  | 'star-3'
  | 'replay-three-star';

export type CampaignPerformance =
  | { kind: 'maze'; wrongRouteCount: number }
  | { kind: 'memory-explore'; wrongPairCount: number }
  | { kind: 'battle'; remainingLives: number }
  | { kind: 'sequence-lock'; wrongSequenceCount: number }
  | { kind: 'pursuit'; finalSafetyDistance: number; maxSuccessStreak: number };

export interface CampaignResult {
  id: string;
  profileId: string;
  campaignId: string;
  levelId: string;
  gameplayId: CampaignGameplayId;
  stars: CampaignStars;
  performance: CampaignPerformance;
  durationMs: number;
  xpEventIds: string[];
  xpAwarded: number;
  playedAt: string;
  appVersion: string;
  schemaVersion: 1;
}

export interface CampaignLevelProgress {
  id: string;
  profileId: string;
  campaignId: string;
  levelId: string;
  unlockedAt: string;
  firstCompletedAt?: string;
  lastCompletedAt?: string;
  bestStars: 0 | CampaignStars;
  bestResultId?: string;
  updatedAt: string;
  revision: number;
}

export interface CampaignChapterProgress {
  id: string;
  profileId: string;
  campaignId: string;
  completedAt?: string;
  recentLevelId?: string;
  recentLevelAt?: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface CampaignContentFlag {
  id: string;
  profileId: string;
  flagType: CampaignContentFlagType;
  contentId: string;
  seenAt: string;
}

export interface CampaignExperienceEvent {
  eventId: string;
  profileId: string;
  sourceType: 'campaign';
  resultId: string;
  campaignId: string;
  levelId: string;
  rewardKind: CampaignRewardKind;
  xpAwarded: number;
  previousRankId: RankId;
  rankId: RankId;
  createdAt: string;
}

export interface CampaignSnapshot {
  chapter: CampaignChapterProgress | null;
  levels: CampaignLevelProgress[];
  flags: CampaignContentFlag[];
}

export interface CampaignCompletionInput {
  resultId: string;
  profileId: string;
  campaignId: string;
  levelId: string;
  gameplayId: CampaignGameplayId;
  stars: CampaignStars;
  performance: CampaignPerformance;
  durationMs: number;
  playedAt: string;
  appVersion: string;
}

export interface SavedCampaignCompletion {
  result: CampaignResult;
  snapshot: CampaignSnapshot;
  experience: ExperienceProgress;
  previousRankId: RankId;
  duplicate: boolean;
}
