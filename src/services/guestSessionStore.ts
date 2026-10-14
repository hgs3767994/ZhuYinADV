import type { GameResult } from '../game/types';
import type {
  CampaignChapterProgress,
  CampaignContentFlag,
  CampaignExperienceEvent,
  CampaignLevelProgress,
  CampaignResult
} from '../game/campaignTypes';

class GuestSessionStore {
  gameResults: GameResult[] = [];
  gameEvents = new Map<string, GameResult>();
  campaignResults = new Map<string, CampaignResult>();
  campaignEvents = new Map<string, CampaignExperienceEvent>();
  campaignLevels = new Map<string, CampaignLevelProgress>();
  campaignChapters = new Map<string, CampaignChapterProgress>();
  campaignFlags = new Map<string, CampaignContentFlag>();
  totalXp = 0;

  clear(): void {
    this.gameResults = [];
    this.gameEvents.clear();
    this.campaignResults.clear();
    this.campaignEvents.clear();
    this.campaignLevels.clear();
    this.campaignChapters.clear();
    this.campaignFlags.clear();
    this.totalXp = 0;
  }
}

export const guestSessionStore = new GuestSessionStore();
