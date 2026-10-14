import { assetUrl } from '../utils/assets';

const campaignImage = (name: string) => assetUrl(`assets/images/campaign/${name}`);

export const CAMPAIGN_IMAGES = {
  modeButton: campaignImage('campaign-mode-button.webp'),
  chapterOneMap: campaignImage('chapter-01-map.webp'),
  lifeFull: campaignImage('life-full.png'),
  lifeEmpty: campaignImage('life-empty.png'),
  energyFull: campaignImage('energy-full.png'),
  energyEmpty: campaignImage('energy-empty.png'),
  sealLocked: campaignImage('seal-locked.png'),
  sealUnlocked: campaignImage('seal-unlocked.png'),
  star: campaignImage('star.png'),
  shieldFull: campaignImage('shield-full.png'),
  shieldBroken: campaignImage('shield-broken.png')
} as const;

export const CAMPAIGN_IMAGE_PRELOADS = Object.values(CAMPAIGN_IMAGES);
