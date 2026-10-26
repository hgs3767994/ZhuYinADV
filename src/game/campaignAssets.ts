import { assetUrl } from '../utils/assets';

const campaignImage = (name: string) => assetUrl(`assets/images/campaign/${name}`);
const soundMazeImage = (name: string) => campaignImage(`sound-maze/${name}`);

export const soundMazeRoadTile = (name: string) => soundMazeImage(`road-tiles/${name}.png`);

export const CAMPAIGN_IMAGES = {
  modeButton: campaignImage('campaign-mode-button.webp'),
  chapterOneMap: campaignImage('chapter-01-map.webp'),
  lifeFull: campaignImage('life-full.png'),
  lifeEmpty: campaignImage('life-empty.png'),
  energyFull: campaignImage('energy-full.png'),
  energyEmpty: campaignImage('energy-empty.png'),
  sealLocked: campaignImage('seal-locked.png'),
  sealUnlocked: campaignImage('seal-unlocked.png'),
  levelOneGate: campaignImage('level-01-gate.png'),
  star: campaignImage('star.png'),
  shieldFull: campaignImage('shield-full.png'),
  shieldBroken: campaignImage('shield-broken.png'),
  soundFragmentSmall: campaignImage('sound-fragment-small.png'),
  soundFragmentLarge: campaignImage('sound-fragment-large.png'),
  runeCardFront: campaignImage('rune-card-front.png'),
  runeCardBack: campaignImage('rune-card-back.png'),
  pauseButton: campaignImage('pause-button.png'),
  soundMazeForestGround: soundMazeImage('level-02-forest-ground.webp'),
  soundMazeForestBankLeft: soundMazeImage('level-02-forest-bank-left.webp'),
  soundMazeRoadClearingTexture: soundMazeImage('level-02-road-clearing-texture.webp'),
  soundMazeRoadTexture: soundMazeImage('level-02-road-texture.webp'),
  soundMazeLandmarkStone: soundMazeImage('level-02-landmark-01-stele.png'),
  soundMazeLandmarkFence: soundMazeImage('level-02-landmark-02-fence.png'),
  soundMazeLandmarkSign: soundMazeImage('level-02-landmark-03-sign.png'),
  soundMazeLandmarkRocks: soundMazeImage('level-02-landmark-04-rocks.png'),
  soundMazeLandmarkArch: soundMazeImage('level-02-landmark-05-arch.png'),
  soundMazeMagicMistWall: soundMazeImage('level-02-magic-mist-wall-wide-stretched-192x180.png'),
  soundMazeExitPortal: soundMazeImage('level-02-exit-portal-soft-v01.png')
} as const;

export const CAMPAIGN_IMAGE_PRELOADS = Object.values(CAMPAIGN_IMAGES);
