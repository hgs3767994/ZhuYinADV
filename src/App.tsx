import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { GameScreen } from './components/GameScreen';
import { AvatarEditor } from './components/AvatarEditor';
import { ImageMenuButton } from './components/ImageMenuButton';
import { Leaderboard } from './components/Leaderboard';
import { Modal } from './components/Modal';
import { CreateProfile } from './components/CreateProfile';
import { ChangeParentPin } from './components/ChangeParentPin';
import { ParentGate } from './components/ParentGate';
import { ParentManagement } from './components/ParentManagement';
import { ParentRecovery } from './components/ParentRecovery';
import { ParentSetup } from './components/ParentSetup';
import { ProfileAvatar } from './components/ProfileAvatar';
import { ProfileLogin } from './components/ProfileLogin';
import { ProfileSelection } from './components/ProfileSelection';
import { ResetProfilePassword } from './components/ResetProfilePassword';
import { ResultModal } from './components/ResultModal';
import { RankGuide } from './components/RankGuide';
import { CampaignGuestNotice } from './components/CampaignGuestNotice';
import { CampaignIntro } from './components/CampaignIntro';
import { CampaignMap } from './components/CampaignMap';
import { CampaignLevelFlow } from './components/CampaignLevelFlow';
import { DEFAULT_AVATAR_RECIPE, type AvatarRecipeV2 } from './avatar/model';
import { AVATAR_BROW_ASSETS, AVATAR_EYE_ASSETS, AVATAR_FACE_ASSETS, AVATAR_HAIR_ASSETS, AVATAR_MOUTH_ASSETS, AVATAR_NOSE_ASSETS } from './avatar/assets';
import { APP_VERSION, DIFFICULTY_CONFIG } from './game/config';
import {
  experienceProgress,
  RANKS,
  rankById,
  type ExperienceProgress
} from './game/experience';
import type {
  Difficulty,
  GameMode,
  GameResult,
  LeaderboardPage
} from './game/types';
import {
  FIRST_CAMPAIGN,
  FIRST_CAMPAIGN_ID,
  type CampaignLevelDefinition
} from './game/campaignConfig';
import { CAMPAIGN_IMAGES, CAMPAIGN_IMAGE_PRELOADS } from './game/campaignAssets';
import { campaignFlowContent, hasCampaignFlowContent } from './game/campaignFlow';
import type { CampaignCompletionInput, CampaignSnapshot } from './game/campaignTypes';
import {
  ADVENTURE_AUDIO_CACHE_STEPS,
  audioService
} from './services/audio';
import { shouldPlayBackgroundMusic } from './services/backgroundMusicPolicy';
import { parentSecurity } from './services/parentSecurity';
import {
  createGuestProfile,
  profileRepository,
  type PlayerProfile
} from './services/profileRepository';
import { resultRepository } from './services/resultsRepository';
import { campaignRepository } from './services/campaignRepository';
import {
  assetUrl,
  cacheOfflineImage,
  cleanupPreviousImageCache,
  hasMissingOfflineImages,
  preloadImage,
  resetImagePreloads
} from './utils/assets';
import { delay, isResourceTimeoutError, runTaskPool, trackLoadingTasks } from './utils/loading';
import {
  OfflineShellUnavailableError,
  ensureOfflineShellControl,
  requestPersistentOfflineStorage
} from './utils/offline';
import { runCriticalResource } from './utils/resourcePriority';
import {
  requestPortraitOrientation,
  type LockableScreenOrientation
} from './utils/orientation';

type Screen =
  | 'welcome'
  | 'profiles'
  | 'create-profile'
  | 'avatar-builder'
  | 'login'
  | 'parent-setup'
  | 'parent-gate'
  | 'parent-recovery'
  | 'parent-management'
  | 'change-parent-pin'
  | 'reset-password'
  | 'mode'
  | 'rank-guide'
  | 'edit-avatar'
  | 'campaign-guest-warning'
  | 'campaign-intro'
  | 'campaign-intro-replay'
  | 'campaign-map'
  | 'campaign-level'
  | 'difficulty'
  | 'game';

interface GameSetup {
  mode: GameMode;
  difficulty: Difficulty | null;
}

interface ProfileDraft {
  name: string;
  password: string;
  avatar: AvatarRecipeV2;
}

interface AppHistoryState {
  zhuyinApp: true;
  screen: Screen;
  gameGuard?: boolean;
  campaignGuard?: boolean;
  overlay?: 'quit' | 'leaderboard';
}

interface PageLoadingState {
  progress: number;
  error: 'timeout' | 'network' | null;
  cancellable: boolean;
}

interface PendingPageLoad {
  sources: string[];
  onReady: () => void;
  cancellable: boolean;
}

interface AdventurePreparationState {
  progress: number;
  error: 'timeout' | 'network' | 'offline-shell' | null;
}

type LeaderboardOrigin = 'menu' | 'result';
type QuitConfirmationOrigin = 'back' | 'button';
type GameHistoryPosition = 'base' | 'guard' | null;
type ParentAction = 'create' | 'manage' | 'reset-password';

const START_BUTTON_IMAGE = assetUrl('assets/images/start_adventure_button_v2.webp');
const RANK_IMAGES = RANKS.map((rank) => assetUrl(`assets/images/ranks/${rank.id}.png`));

const WELCOME_IMAGES = [
  assetUrl('assets/images/start_banner.webp'),
  assetUrl('assets/images/title.webp'),
  START_BUTTON_IMAGE
];

const MODE_IMAGES = [
  assetUrl('assets/images/start_banner.webp'),
  CAMPAIGN_IMAGES.modeButton,
  assetUrl('assets/images/normal_mode_button.webp'),
  assetUrl('assets/images/infinity_mode_button.webp'),
  assetUrl('assets/images/record_button.webp'),
  assetUrl('assets/images/Backward_button.webp'),
  ...RANK_IMAGES
];

const DIFFICULTY_IMAGES = [
  ...Object.values(DIFFICULTY_CONFIG).map((config) => config.image),
  assetUrl('assets/images/Backward_button.webp')
];

const CORE_ADVENTURE_IMAGES = Array.from(new Set([
  ...WELCOME_IMAGES,
  ...MODE_IMAGES,
  ...DIFFICULTY_IMAGES,
  assetUrl('assets/images/bg_endless.webp'),
  ...Object.values(DIFFICULTY_CONFIG).map((config) => config.background)
]));

const ADVENTURE_IMAGES = Array.from(new Set([
  ...CORE_ADVENTURE_IMAGES,
  ...CAMPAIGN_IMAGE_PRELOADS,
  ...AVATAR_FACE_ASSETS,
  ...AVATAR_HAIR_ASSETS,
  ...AVATAR_BROW_ASSETS,
  ...AVATAR_EYE_ASSETS,
  ...AVATAR_NOSE_ASSETS,
  ...AVATAR_MOUTH_ASSETS
]));
const IMAGE_ASSET_VERSION = '24';
const AUDIO_ASSET_VERSION = '3';
const IMAGE_ASSET_VERSION_KEY = 'zhuyin-image-asset-version';
const AUDIO_ASSET_VERSION_KEY = 'zhuyin-audio-asset-version';

function hasAssetVersion(key: string, version: string): boolean {
  try {
    return localStorage.getItem(key) === version;
  } catch {
    return false;
  }
}

function rememberAssetVersion(key: string, version: string): void {
  try {
    localStorage.setItem(key, version);
  } catch {
    // Cache checks still protect offline use when localStorage is unavailable.
  }
}

function isAppHistoryState(value: unknown): value is AppHistoryState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<AppHistoryState>;
  return state.zhuyinApp === true &&
    [
      'welcome', 'profiles', 'create-profile', 'avatar-builder', 'login', 'parent-setup', 'parent-gate',
      'parent-recovery', 'parent-management', 'change-parent-pin', 'reset-password',
      'mode', 'rank-guide', 'edit-avatar', 'campaign-guest-warning', 'campaign-intro',
      'campaign-intro-replay', 'campaign-map', 'campaign-level', 'difficulty', 'game'
    ]
      .includes(state.screen ?? '');
}

export function App() {
  const accountBackgroundImage = new URL(
    assetUrl('assets/images/start_banner.webp'),
    document.baseURI
  ).href;
  const [bootReady, setBootReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('welcome');
  const screenRef = useRef<Screen>('welcome');
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null);
  const profileDraftRef = useRef<ProfileDraft | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
  const selectedProfileRef = useRef<PlayerProfile | null>(null);
  const [activeProfile, setActiveProfile] = useState<PlayerProfile | null>(null);
  const activeProfileRef = useRef<PlayerProfile | null>(null);
  const [parentConfigured, setParentConfigured] = useState(false);
  const [parentAction, setParentAction] = useState<ParentAction>('manage');
  const parentAuthorizedRef = useRef(false);
  const [managedProfiles, setManagedProfiles] = useState<PlayerProfile[]>([]);
  const [managedProfilesLoading, setManagedProfilesLoading] = useState(false);
  const [parentManagementNotice, setParentManagementNotice] = useState<string | null>(null);
  const [passwordResetNotice, setPasswordResetNotice] = useState<string | null>(null);
  const [gameSetup, setGameSetup] = useState<GameSetup>({ mode: 'normal', difficulty: 'easy' });
  const [runId, setRunId] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const resultRef = useRef<GameResult | null>(null);
  const [resultSaveError, setResultSaveError] = useState(false);
  const [resultSaving, setResultSaving] = useState(false);
  const [experience, setExperience] = useState<ExperienceProgress>(() => experienceProgress(0));
  const [campaignSnapshot, setCampaignSnapshot] = useState<CampaignSnapshot | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [guestCampaignNoticeSeen, setGuestCampaignNoticeSeen] = useState(false);
  const [activeCampaignLevel, setActiveCampaignLevel] = useState<CampaignLevelDefinition | null>(null);
  const [campaignLevelStarting, setCampaignLevelStarting] = useState(false);
  const [campaignLevelError, setCampaignLevelError] = useState<string | null>(null);
  const [upgradedRankName, setUpgradedRankName] = useState<string | null>(null);
  const [leaderboardPage, setLeaderboardPage] = useState<LeaderboardPage | null>(null);
  const leaderboardPageRef = useRef<LeaderboardPage | null>(null);
  const leaderboardOriginRef = useRef<LeaderboardOrigin | null>(null);
  const [quitConfirmation, setQuitConfirmation] = useState(false);
  const quitConfirmationRef = useRef(false);
  const quitConfirmationOriginRef = useRef<QuitConfirmationOrigin | null>(null);
  const [pageLoading, setPageLoading] = useState<PageLoadingState | null>(null);
  const [adventurePreparation, setAdventurePreparation] =
    useState<AdventurePreparationState | null>(null);
  const [offlineContentReady, setOfflineContentReady] = useState(false);
  const pageLoadSequenceRef = useRef(0);
  const pendingPageLoadRef = useRef<PendingPageLoad | null>(null);
  const gameHistoryPositionRef = useRef<GameHistoryPosition>(null);
  const campaignGameplayBackHandlerRef = useRef<(() => void) | null>(null);
  const campaignStoryBackHandlerRef = useRef<(() => void) | null>(null);
  const campaignMapBackHandlerRef = useRef<(() => void) | null>(null);
  const campaignHistoryPositionRef = useRef<GameHistoryPosition>(null);
  const campaignHistoryRestorationPendingRef = useRef(false);
  const campaignPageRestorationPendingRef = useRef(false);
  const campaignHistoryDisarmPendingRef = useRef(false);
  const campaignExitPendingRef = useRef(false);
  const historyRestorationPendingRef = useRef(false);
  const completedExitPendingRef = useRef(false);
  const adventurePreparedRef = useRef(false);
  const adventurePreparationRunningRef = useRef(false);
  const profileCreationCompletionRef = useRef(false);
  const serviceWorkerRegistrationFailedRef = useRef(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW: (_url, registration) => {
      serviceWorkerRegistrationFailedRef.current = !registration;
    },
    onRegisterError: () => {
      serviceWorkerRegistrationFailedRef.current = true;
    }
  });

  const applyScreen = useCallback((next: Screen) => {
    screenRef.current = next;
    setScreen(next);
  }, []);

  const navigate = useCallback((next: Screen) => {
    const state: AppHistoryState = { zhuyinApp: true, screen: next };
    history.pushState(state, '', location.href);
    gameHistoryPositionRef.current = null;
    applyScreen(next);
  }, [applyScreen]);

  const replaceScreen = useCallback((next: Screen) => {
    history.replaceState(
      { zhuyinApp: true, screen: next } satisfies AppHistoryState,
      '',
      location.href
    );
    gameHistoryPositionRef.current = null;
    applyScreen(next);
  }, [applyScreen]);

  const armCampaignGameplayHistory = useCallback(() => {
    if (campaignHistoryPositionRef.current === 'guard') return;
    if (campaignHistoryPositionRef.current === 'base') {
      campaignHistoryRestorationPendingRef.current = true;
      history.forward();
      return;
    }
    history.pushState(
      { zhuyinApp: true, screen: 'campaign-level' } satisfies AppHistoryState,
      '',
      location.href
    );
    history.pushState(
      { zhuyinApp: true, screen: 'campaign-level', campaignGuard: true } satisfies AppHistoryState,
      '',
      location.href
    );
    campaignHistoryPositionRef.current = 'guard';
  }, []);

  const disarmCampaignGameplayHistory = useCallback(() => {
    const position = campaignHistoryPositionRef.current;
    if (position === null) {
      campaignHistoryPositionRef.current = null;
      return;
    }
    campaignHistoryDisarmPendingRef.current = true;
    history.go(position === 'guard' ? -2 : -1);
  }, []);

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true);
    setProfilesError(null);
    try {
      const [nextProfiles, configured] = await Promise.all([
        profileRepository.list(),
        parentSecurity.isConfigured()
      ]);
      setProfiles(nextProfiles);
      setParentConfigured(configured);
    } catch {
      setProfilesError('無法讀取這台裝置上的帳號');
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  const loadManagedProfiles = useCallback(async () => {
    setManagedProfilesLoading(true);
    try {
      setManagedProfiles(await profileRepository.listManaged());
    } finally {
      setManagedProfilesLoading(false);
    }
  }, []);

  resultRef.current = result;
  leaderboardPageRef.current = leaderboardPage;
  quitConfirmationRef.current = quitConfirmation;

  const loadPageImages = useCallback((
    sources: string[],
    onReady: () => void,
    cancellable = true
  ) => {
    const sequence = ++pageLoadSequenceRef.current;
    pendingPageLoadRef.current = { sources, onReady, cancellable };
    setPageLoading(null);
    let latestProgress = 0;
    let shownAt = 0;
    const showTimer = window.setTimeout(() => {
      if (pageLoadSequenceRef.current !== sequence) return;
      shownAt = performance.now();
      setPageLoading({ progress: latestProgress, error: null, cancellable });
    }, 150);

    void runCriticalResource(() => trackLoadingTasks(
      sources.map(preloadImage),
      (progress) => {
        latestProgress = progress;
        if (shownAt > 0 && pageLoadSequenceRef.current === sequence) {
          setPageLoading({ progress, error: null, cancellable });
        }
      }
    )).then(async () => {
      window.clearTimeout(showTimer);
      if (pageLoadSequenceRef.current !== sequence) return;
      if (shownAt > 0) {
        setPageLoading({ progress: 100, error: null, cancellable });
        await delay(Math.max(0, 250 - (performance.now() - shownAt)));
      }
      if (pageLoadSequenceRef.current !== sequence) return;
      pendingPageLoadRef.current = null;
      setPageLoading(null);
      onReady();
    }).catch((error: unknown) => {
      window.clearTimeout(showTimer);
      if (pageLoadSequenceRef.current !== sequence) return;
      resetImagePreloads(sources);
      setPageLoading({
        progress: latestProgress,
        error: isResourceTimeoutError(error) ? 'timeout' : 'network',
        cancellable
      });
    });
  }, []);

  const retryPageLoad = () => {
    const pending = pendingPageLoadRef.current;
    if (pending) loadPageImages(pending.sources, pending.onReady, pending.cancellable);
  };

  const cancelPageLoad = () => {
    pageLoadSequenceRef.current += 1;
    pendingPageLoadRef.current = null;
    setPageLoading(null);
  };

  useEffect(() => {
    loadPageImages(WELCOME_IMAGES, () => setBootReady(true), false);
  }, [loadPageImages]);

  useEffect(() => {
    if (screenRef.current !== screen) return;
    if (shouldPlayBackgroundMusic(screen)) audioService.playBgm();
    else audioService.pauseBgm();
    if (screen === 'profiles') {
      if (activeProfile?.isGuest) resultRepository.clearGuestResults();
      setCampaignSnapshot(null);
      setCampaignLoading(false);
      setCampaignError(null);
      setActiveCampaignLevel(null);
      setCampaignLevelStarting(false);
      setCampaignLevelError(null);
      setGuestCampaignNoticeSeen(false);
      activeProfileRef.current = null;
      setActiveProfile(null);
      selectedProfileRef.current = null;
      setSelectedProfile(null);
      profileDraftRef.current = null;
      setProfileDraft(null);
      void loadProfiles();
    }
    if (screen === 'profiles' || screen === 'login') parentAuthorizedRef.current = false;
  }, [loadProfiles, screen]);

  useEffect(() => {
    if (!activeProfile) {
      setExperience(experienceProgress(0));
      return;
    }
    const profileId = activeProfile.id;
    setExperience(experienceProgress(0));
    void resultRepository.experience(profileId).then((progress) => {
      if (activeProfileRef.current?.id === profileId) setExperience(progress);
    }).catch((error: unknown) => {
      console.warn('無法讀取冒險家經驗值', error);
    });
  }, [activeProfile]);

  useEffect(() => {
    if (!activeProfile) return;
    const profileId = activeProfile.id;
    let cancelled = false;
    setCampaignSnapshot(null);
    setCampaignError(null);
    void campaignRepository.loadCampaign(profileId, FIRST_CAMPAIGN_ID).then((snapshot) => {
      if (!cancelled && activeProfileRef.current?.id === profileId) setCampaignSnapshot(snapshot);
    }).catch((error: unknown) => {
      console.warn('無法讀取闖關進度', error);
      if (!cancelled && activeProfileRef.current?.id === profileId) {
        setCampaignError('無法讀取闖關進度，請再試一次。');
      }
    });
    return () => { cancelled = true; };
  }, [activeProfile]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden || !shouldPlayBackgroundMusic(screenRef.current)) {
        audioService.pauseBgm();
      } else {
        audioService.playBgm();
      }
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);

  useEffect(() => {
    history.replaceState(
      { zhuyinApp: true, screen: 'welcome' } satisfies AppHistoryState,
      '',
      location.href
    );

    const handleBack = (event: PopStateEvent) => {
      pageLoadSequenceRef.current += 1;
      pendingPageLoadRef.current = null;
      setPageLoading(null);
      const destination = isAppHistoryState(event.state) ? event.state : null;
      if (profileCreationCompletionRef.current) {
        profileCreationCompletionRef.current = false;
        history.pushState(
          { zhuyinApp: true, screen: 'mode' } satisfies AppHistoryState,
          '',
          location.href
        );
        applyScreen('mode');
        return;
      }
      if (
        destination &&
        [
          'create-profile', 'avatar-builder', 'parent-management',
          'change-parent-pin', 'reset-password'
        ].includes(destination.screen) &&
        !parentAuthorizedRef.current
      ) {
        const fallback = selectedProfileRef.current ? 'login' : 'profiles';
        history.replaceState(
          { zhuyinApp: true, screen: fallback } satisfies AppHistoryState,
          '',
          location.href
        );
        applyScreen(fallback);
        return;
      }
      if (
        destination &&
        [
          'mode', 'rank-guide', 'edit-avatar', 'campaign-guest-warning', 'campaign-intro',
          'campaign-intro-replay', 'campaign-map', 'campaign-level', 'difficulty', 'game'
        ].includes(destination.screen) &&
        activeProfileRef.current === null
      ) {
        history.replaceState(
          { zhuyinApp: true, screen: 'profiles' } satisfies AppHistoryState,
          '',
          location.href
        );
        applyScreen('profiles');
        return;
      }

      if (campaignHistoryDisarmPendingRef.current) {
        campaignHistoryDisarmPendingRef.current = false;
        campaignHistoryPositionRef.current = null;
        if (destination) applyScreen(destination.screen);
        return;
      }

      if (campaignPageRestorationPendingRef.current) {
        campaignPageRestorationPendingRef.current = false;
        if (destination) applyScreen(destination.screen);
        return;
      }

      if (campaignHistoryRestorationPendingRef.current) {
        campaignHistoryRestorationPendingRef.current = false;
        campaignHistoryPositionRef.current = destination?.screen === 'campaign-level'
          ? destination.campaignGuard ? 'guard' : 'base'
          : null;
        if (destination) applyScreen(destination.screen);
        return;
      }

      if (
        screenRef.current === 'campaign-map' &&
        campaignMapBackHandlerRef.current
      ) {
        campaignMapBackHandlerRef.current();
        campaignPageRestorationPendingRef.current = true;
        history.forward();
        applyScreen('campaign-map');
        return;
      }

      if (
        screenRef.current === 'campaign-level' &&
        !campaignExitPendingRef.current &&
        campaignStoryBackHandlerRef.current
      ) {
        campaignStoryBackHandlerRef.current();
        campaignPageRestorationPendingRef.current = true;
        history.forward();
        applyScreen('campaign-level');
        return;
      }

      if (
        screenRef.current === 'campaign-level' &&
        !campaignExitPendingRef.current &&
        campaignGameplayBackHandlerRef.current
      ) {
        const restoreDistance = destination?.screen === 'campaign-level' && !destination.campaignGuard ? 1 : 2;
        campaignGameplayBackHandlerRef.current();
        campaignHistoryPositionRef.current = destination?.screen === 'campaign-level'
          ? destination.campaignGuard ? 'guard' : 'base'
          : null;
        campaignHistoryRestorationPendingRef.current = true;
        history.go(restoreDistance);
        applyScreen('campaign-level');
        return;
      }

      if (screenRef.current === 'campaign-level' && campaignHistoryPositionRef.current !== null) {
        campaignHistoryPositionRef.current = destination?.screen === 'campaign-level'
          ? destination.campaignGuard ? 'guard' : 'base'
          : null;
      }

      if (campaignExitPendingRef.current) campaignExitPendingRef.current = false;
      gameHistoryPositionRef.current = destination?.screen === 'game'
        ? destination.gameGuard ? 'guard' : 'base'
        : null;

      if (historyRestorationPendingRef.current) {
        historyRestorationPendingRef.current = false;
        if (destination) applyScreen(destination.screen);
        return;
      }

      if (completedExitPendingRef.current) {
        completedExitPendingRef.current = false;
        resultRef.current = null;
        leaderboardPageRef.current = null;
        leaderboardOriginRef.current = null;
        setResult(null);
        setLeaderboardPage(null);
        if (destination) applyScreen(destination.screen);
        return;
      }

      if (quitConfirmationRef.current) {
        const origin = quitConfirmationOriginRef.current;
        quitConfirmationRef.current = false;
        quitConfirmationOriginRef.current = null;
        setQuitConfirmation(false);
        historyRestorationPendingRef.current = true;
        history.go(origin === 'back' ? 2 : 1);
        applyScreen('game');
        return;
      }

      if (leaderboardPageRef.current !== null) {
        if (leaderboardOriginRef.current === 'result') {
          completedExitPendingRef.current = true;
          history.back();
          return;
        }
        leaderboardPageRef.current = null;
        leaderboardOriginRef.current = null;
        setLeaderboardPage(null);
        if (destination) applyScreen(destination.screen);
        return;
      }

      if (resultRef.current !== null) {
        completedExitPendingRef.current = true;
        history.back();
        return;
      }

      if (
        screenRef.current === 'game' &&
        destination?.screen === 'game' &&
        !destination.gameGuard
      ) {
        quitConfirmationRef.current = true;
        quitConfirmationOriginRef.current = 'back';
        setQuitConfirmation(true);
        return;
      }

      if (destination) applyScreen(destination.screen);
    };

    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [applyScreen]);

  useEffect(() => {
    requestPortraitOrientation(
      window.screen.orientation as LockableScreenOrientation | undefined
    );
  }, []);

  const press = (action: () => void) => {
    audioService.unlock();
    audioService.playDing();
    action();
  };

  const prepareAdventure = async () => {
    if (adventurePreparedRef.current) {
      navigate('profiles');
      return;
    }
    if (adventurePreparationRunningRef.current) return;
    adventurePreparationRunningRef.current = true;

    try {
      if (serviceWorkerRegistrationFailedRef.current) {
        throw new OfflineShellUnavailableError();
      }
      await ensureOfflineShellControl();
      const [missingAudio, missingImages] = await Promise.all([
        audioService.hasMissingOfflineAudio(),
        hasMissingOfflineImages(ADVENTURE_IMAGES)
      ]);
      const needsAudio = !hasAssetVersion(AUDIO_ASSET_VERSION_KEY, AUDIO_ASSET_VERSION) || missingAudio;
      const needsImages = !hasAssetVersion(IMAGE_ASSET_VERSION_KEY, IMAGE_ASSET_VERSION) || missingImages;
      if (!needsAudio && !needsImages) {
        adventurePreparedRef.current = true;
        setOfflineContentReady(true);
        void requestPersistentOfflineStorage();
        navigate('profiles');
        void (async () => {
          for (const source of CORE_ADVENTURE_IMAGES) {
            await preloadImage(source);
          }
          await audioService.warmAdventureAudio();
        })().catch((error: unknown) => {
          console.warn('無法在背景完成冒險元件預熱', error);
        });
        return;
      }

      audioService.pauseBgm();
      const total = (needsImages ? ADVENTURE_IMAGES.length : 0) +
        (needsAudio ? ADVENTURE_AUDIO_CACHE_STEPS : 0);
      let completed = 0;
      setAdventurePreparation({
        progress: 0,
        error: null
      });

      if (needsImages) {
        await runTaskPool(ADVENTURE_IMAGES, cacheOfflineImage, (imageCompleted) => {
          setAdventurePreparation({
            progress: Math.round(((completed + imageCompleted) / total) * 100),
            error: null
          });
        });
        completed += ADVENTURE_IMAGES.length;
        await cleanupPreviousImageCache();
        rememberAssetVersion(IMAGE_ASSET_VERSION_KEY, IMAGE_ASSET_VERSION);
      }

      if (needsAudio) {
        await audioService.cacheAdventureAudio((completedAudio) => {
          setAdventurePreparation({
            progress: Math.round(((completed + completedAudio) / total) * 100),
            error: null
          });
        });
        completed += ADVENTURE_AUDIO_CACHE_STEPS;
        rememberAssetVersion(AUDIO_ASSET_VERSION_KEY, AUDIO_ASSET_VERSION);
      }

      await requestPersistentOfflineStorage();
      adventurePreparedRef.current = true;
      setOfflineContentReady(true);
      setAdventurePreparation(null);
      navigate('profiles');
      void (async () => {
        for (const source of CORE_ADVENTURE_IMAGES) await preloadImage(source);
        await audioService.warmAdventureAudio();
      })().catch((error: unknown) => {
        console.warn('無法在背景完成冒險元件預熱', error);
      });
    } catch (error) {
      resetImagePreloads(ADVENTURE_IMAGES);
      setAdventurePreparation((current) => ({
        progress: current?.progress ?? 0,
        error: error instanceof OfflineShellUnavailableError
          ? 'offline-shell'
          : isResourceTimeoutError(error) ? 'timeout' : 'network'
      }));
    } finally {
      adventurePreparationRunningRef.current = false;
    }
  };

  const cancelAdventurePreparation = () => {
    if (adventurePreparationRunningRef.current) return;
    setAdventurePreparation(null);
    audioService.playBgm();
  };

  const enterMode = (profile: PlayerProfile) => {
    activeProfileRef.current = profile;
    setActiveProfile(profile);
    loadPageImages(MODE_IMAGES, () => {
      if (screenRef.current === 'profiles') navigate('mode');
      else replaceScreen('mode');
    });
  };

  const beginProfileAvatar = async (name: string, password: string) => {
    await profileRepository.validateNewProfile(name, password);
    const draft: ProfileDraft = {
      name,
      password,
      avatar: profileDraftRef.current?.avatar ?? { ...DEFAULT_AVATAR_RECIPE }
    };
    profileDraftRef.current = draft;
    setProfileDraft(draft);
    navigate('avatar-builder');
  };

  const completeProfileCreation = async (avatar: AvatarRecipeV2) => {
    const draft = profileDraftRef.current;
    if (!draft) throw new Error('找不到尚未完成的帳號資料');
    const profile = await profileRepository.create(
      draft.name,
      draft.password,
      avatar
    );
    setProfiles((current) => [...current, profile]);
    activeProfileRef.current = profile;
    setActiveProfile(profile);
    profileDraftRef.current = null;
    setProfileDraft(null);
    loadPageImages(MODE_IMAGES, () => {
      profileCreationCompletionRef.current = true;
      history.go(-2);
    }, false);
  };

  const saveActiveAvatar = async (avatar: AvatarRecipeV2) => {
    const current = activeProfileRef.current;
    if (!current || current.isGuest) throw new Error('訪客無法保存頭像');
    const updated = await profileRepository.updateAvatar(current.id, avatar);
    activeProfileRef.current = updated;
    setActiveProfile(updated);
    setProfiles((items) => items.map((profile) => profile.id === updated.id ? updated : profile));
    history.back();
  };

  const loginProfile = async (password: string) => {
    if (!selectedProfile) throw new Error('找不到要登入的帳號');
    const profile = await profileRepository.authenticate(selectedProfile.id, password);
    if (!profile) throw new Error('密碼不正確');
    enterMode(profile);
  };

  const beginParentAction = (action: ParentAction) => {
    setParentAction(action);
    navigate(parentConfigured ? 'parent-gate' : 'parent-setup');
  };

  const continueParentAction = () => {
    parentAuthorizedRef.current = true;
    const destination: Screen = parentAction === 'create'
      ? 'create-profile'
      : parentAction === 'manage' ? 'parent-management' : 'reset-password';
    if (destination === 'parent-management') void loadManagedProfiles();
    setParentManagementNotice(null);
    replaceScreen(destination);
  };

  const completeParentPinChange = () => {
    setParentManagementNotice('家長 PIN 已變更。');
    history.back();
  };

  const completePasswordReset = () => {
    setPasswordResetNotice('密碼已更新，請使用新密碼登入。');
    parentAuthorizedRef.current = false;
    history.back();
  };

  const hasSeenCampaignIntro = (snapshot: CampaignSnapshot | null): boolean =>
    Boolean(snapshot?.flags.some((flag) =>
      flag.flagType === 'chapter-intro' && flag.contentId === FIRST_CAMPAIGN_ID
    ));

  const campaignEntryLabel = (() => {
    if (!campaignSnapshot?.chapter) return '開始第一章';
    const completedLevelNumbers = campaignSnapshot.levels
      .filter((progress) => progress.bestStars > 0)
      .map((progress) => FIRST_CAMPAIGN.levels.find((level) => level.id === progress.levelId)?.number ?? 0);
    const latestCompletedLevel = Math.max(0, ...completedLevelNumbers);
    return latestCompletedLevel > 0 ? `已完成 1-${latestCompletedLevel}` : '開始第一章';
  })();

  const openCampaignMode = async () => {
    const profile = activeProfileRef.current;
    if (!profile || campaignLoading) return;
    setCampaignLoading(true);
    setCampaignError(null);
    try {
      const snapshot = await campaignRepository.loadCampaign(profile.id, FIRST_CAMPAIGN_ID);
      if (activeProfileRef.current?.id !== profile.id) return;
      setCampaignSnapshot(snapshot);
      const destination: Screen = profile.isGuest && !guestCampaignNoticeSeen
        ? 'campaign-guest-warning'
        : hasSeenCampaignIntro(snapshot) ? 'campaign-map' : 'campaign-intro';
      loadPageImages(CAMPAIGN_IMAGE_PRELOADS, () => navigate(destination));
    } catch (error) {
      console.warn('無法進入闖關模式', error);
      setCampaignError('無法讀取闖關進度，請再試一次。');
      if (shouldPlayBackgroundMusic(screenRef.current)) audioService.playBgm();
    } finally {
      setCampaignLoading(false);
    }
  };

  const continueGuestCampaign = () => {
    setGuestCampaignNoticeSeen(true);
    replaceScreen(hasSeenCampaignIntro(campaignSnapshot) ? 'campaign-map' : 'campaign-intro');
  };

  const completeCampaignIntro = async () => {
    const profile = activeProfileRef.current;
    if (!profile) throw new Error('找不到目前玩家');
    const snapshot = await campaignRepository.startCampaign(
      profile.id,
      FIRST_CAMPAIGN_ID,
      new Date().toISOString()
    );
    if (activeProfileRef.current?.id !== profile.id) return;
    setCampaignSnapshot(snapshot);
    replaceScreen('campaign-map');
  };

  const startCampaignLevel = async (level: CampaignLevelDefinition) => {
    const profile = activeProfileRef.current;
    if (!profile || campaignLevelStarting || !hasCampaignFlowContent(level.id)) return;
    audioService.pauseBgm();
    setCampaignLevelStarting(true);
    setCampaignLevelError(null);
    try {
      await campaignRepository.enterLevel(
        profile.id,
        FIRST_CAMPAIGN_ID,
        level.id,
        new Date().toISOString()
      );
      const snapshot = await campaignRepository.loadCampaign(profile.id, FIRST_CAMPAIGN_ID);
      if (activeProfileRef.current?.id !== profile.id) return;
      setCampaignSnapshot(snapshot);
      setActiveCampaignLevel(level);
      campaignHistoryPositionRef.current = null;
      navigate('campaign-level');
    } catch (error) {
      console.warn('無法進入闖關關卡', error);
      setCampaignLevelError('無法準備這個關卡，請重新嘗試。');
      audioService.playBgm();
    } finally {
      setCampaignLevelStarting(false);
    }
  };

  const markCampaignTutorialSeen = async (tutorialId: string) => {
    const profile = activeProfileRef.current;
    if (!profile) throw new Error('找不到目前玩家');
    await campaignRepository.markContentSeen(
      profile.id,
      'tutorial',
      tutorialId,
      new Date().toISOString()
    );
    const snapshot = await campaignRepository.loadCampaign(profile.id, FIRST_CAMPAIGN_ID);
    if (activeProfileRef.current?.id === profile.id) setCampaignSnapshot(snapshot);
  };

  const completeCampaignLevel = async (input: CampaignCompletionInput) => {
    const saved = await campaignRepository.completeLevel(input);
    if (activeProfileRef.current?.id === input.profileId) {
      setCampaignSnapshot(saved.snapshot);
      setExperience(saved.experience);
    }
    return saved;
  };

  const startGame = (mode: GameMode, difficulty: Difficulty | null) => {
    press(() => {
      setGameSetup({ mode, difficulty });
      setResult(null);
      setResultSaveError(false);
      setResultSaving(false);
      setUpgradedRankName(null);
      setRunId((current) => current + 1);
      history.pushState(
        { zhuyinApp: true, screen: 'game' } satisfies AppHistoryState,
        '',
        location.href
      );
      history.pushState(
        { zhuyinApp: true, screen: 'game', gameGuard: true } satisfies AppHistoryState,
        '',
        location.href
      );
      gameHistoryPositionRef.current = 'guard';
      applyScreen('game');
    });
  };

  const saveGameResult = async (nextResult: GameResult): Promise<boolean> => {
    setResultSaving(true);
    try {
      const saved = await resultRepository.save(nextResult);
      resultRef.current = saved.result;
      setResult(saved.result);
      setExperience(saved.experience);
      setUpgradedRankName(
        !saved.duplicate && saved.previousRankId !== saved.experience.rankId
          ? rankById(saved.experience.rankId).name
          : null
      );
      setResultSaveError(false);
      return true;
    } catch (error) {
      console.warn('無法保存冒險紀錄', error);
      setResultSaveError(true);
      return false;
    } finally {
      setResultSaving(false);
    }
  };

  const finishGame = async (nextResult: GameResult) => {
    setResultSaveError(false);
    if (await saveGameResult(nextResult)) return;
    resultRef.current = nextResult;
    setResult(nextResult);
  };

  const openLeaderboardFromMenu = () => {
    press(() => {
      history.pushState(
        { zhuyinApp: true, screen: 'mode', overlay: 'leaderboard' } satisfies AppHistoryState,
        '',
        location.href
      );
      leaderboardOriginRef.current = 'menu';
      leaderboardPageRef.current = 'easy';
      setLeaderboardPage('easy');
    });
  };

  const openLeaderboardFromResult = (page: LeaderboardPage) => {
    resultRef.current = null;
    leaderboardOriginRef.current = 'result';
    leaderboardPageRef.current = page;
    setResult(null);
    setResultSaveError(false);
    setLeaderboardPage(page);
  };

  const closeMenuLeaderboard = () => {
    history.back();
  };

  const openQuitConfirmation = () => {
    if (quitConfirmationRef.current) return;
    quitConfirmationRef.current = true;
    quitConfirmationOriginRef.current = 'button';
    setQuitConfirmation(true);
  };

  const returnToMode = () => {
    resultRef.current = null;
    leaderboardPageRef.current = null;
    leaderboardOriginRef.current = null;
    quitConfirmationRef.current = false;
    setResult(null);
    setResultSaveError(false);
    setUpgradedRankName(null);
    setLeaderboardPage(null);
    setQuitConfirmation(false);
    const distance = gameHistoryPositionRef.current === 'guard' ? -2 : -1;
    gameHistoryPositionRef.current = null;
    history.go(distance);
  };

  const abandonGame = () => {
    const distance = quitConfirmationOriginRef.current === 'button' ? -2 : -1;
    quitConfirmationRef.current = false;
    quitConfirmationOriginRef.current = null;
    setQuitConfirmation(false);
    gameHistoryPositionRef.current = null;
    history.go(distance);
  };

  const continueGame = () => {
    const origin = quitConfirmationOriginRef.current;
    quitConfirmationRef.current = false;
    quitConfirmationOriginRef.current = null;
    setQuitConfirmation(false);
    if (origin === 'back') {
      historyRestorationPendingRef.current = true;
      history.forward();
    }
  };

  const replay = () => {
    resultRef.current = null;
    setResult(null);
    setResultSaveError(false);
    setUpgradedRankName(null);
    setRunId((current) => current + 1);
  };

  return (
    <div
      className="app-shell"
      style={{
        '--account-background-image': `url("${accountBackgroundImage}")`
      } as CSSProperties}
    >
      {bootReady && screen === 'welcome' && (
        <main
          className="screen welcome-screen"
          style={{ backgroundImage: `url(${assetUrl('assets/images/start_banner.webp')})` }}
        >
          <img className="title-image" src={assetUrl('assets/images/title.webp')} alt="小小注音冒險家" />
          <button
            className="start-button"
            onClick={() => press(() => void prepareAdventure())}
            aria-label="開始冒險"
          >
            <img src={START_BUTTON_IMAGE} alt="" draggable="false" />
          </button>
          <span className="version-tag">v {APP_VERSION}</span>
        </main>
      )}

      {screen === 'profiles' && (
        <ProfileSelection
          profiles={profiles}
          loading={profilesLoading}
          error={profilesError}
          onSelect={(profile) => press(() => {
            selectedProfileRef.current = profile;
            setSelectedProfile(profile);
            setPasswordResetNotice(null);
            navigate('login');
          })}
          onCreate={() => press(() => beginParentAction('create'))}
          onGuest={() => press(() => enterMode(createGuestProfile()))}
          parentConfigured={parentConfigured}
          onParentManagement={() => press(() => beginParentAction('manage'))}
          onBack={() => press(() => history.back())}
          onRetry={() => void loadProfiles()}
          offlineContentReady={offlineContentReady}
        />
      )}

      {screen === 'create-profile' && (
        <CreateProfile
          initialName={profileDraftRef.current?.name}
          initialPassword={profileDraftRef.current?.password}
          onContinue={beginProfileAvatar}
          onBack={() => press(() => {
            profileDraftRef.current = null;
            setProfileDraft(null);
            history.back();
          })}
        />
      )}

      {screen === 'avatar-builder' && profileDraft && (
        <AvatarEditor
          initialRecipe={profileDraft.avatar}
          title="建立冒險家頭像"
          saveLabel="完成並建立帳號"
          onSave={completeProfileCreation}
          onBack={(avatar) => press(() => {
            const draft = { ...profileDraft, avatar };
            profileDraftRef.current = draft;
            setProfileDraft(draft);
            history.back();
          })}
        />
      )}

      {screen === 'login' && selectedProfile && (
        <ProfileLogin
          profile={selectedProfile}
          onLogin={loginProfile}
          notice={passwordResetNotice}
          onForgotPassword={() => press(() => beginParentAction('reset-password'))}
          onBack={() => press(() => history.back())}
        />
      )}

      {screen === 'parent-setup' && (
        <ParentSetup
          onSetup={async (pin) => {
            const code = await parentSecurity.setup(pin);
            setParentConfigured(true);
            return code;
          }}
          onComplete={continueParentAction}
          onBack={() => press(() => history.back())}
        />
      )}

      {screen === 'parent-gate' && (
        <ParentGate
          title={parentAction === 'manage'
            ? '進入家長管理'
            : parentAction === 'create' ? '新增冒險家' : '重設使用者密碼'}
          onVerify={(pin) => parentSecurity.verifyPin(pin)}
          onSuccess={continueParentAction}
          onRecovery={() => press(() => replaceScreen('parent-recovery'))}
          onBack={() => press(() => history.back())}
        />
      )}

      {screen === 'parent-recovery' && (
        <ParentRecovery
          onReset={(code, pin) => parentSecurity.resetWithRecovery(code, pin)}
          onComplete={continueParentAction}
          onBack={() => press(() => history.back())}
        />
      )}

      {screen === 'parent-management' && (
        <ParentManagement
          profiles={managedProfiles}
          loading={managedProfilesLoading}
          onDelete={(profile, confirmationName) =>
            profileRepository.scheduleDeletion(profile.id, confirmationName)}
          onRestore={(profile) => profileRepository.restore(profile.id)}
          onRefresh={loadManagedProfiles}
          onChangePin={() => press(() => {
            setParentManagementNotice(null);
            navigate('change-parent-pin');
          })}
          notice={parentManagementNotice}
          onBack={() => press(() => history.back())}
        />
      )}

      {screen === 'change-parent-pin' && (
        <ChangeParentPin
          onChange={(currentPin, newPin) => parentSecurity.changePin(currentPin, newPin)}
          onComplete={completeParentPinChange}
          onBack={() => press(() => history.back())}
        />
      )}

      {screen === 'reset-password' && selectedProfile && (
        <ResetProfilePassword
          profile={selectedProfile}
          onReset={(password) => profileRepository.resetPassword(selectedProfile.id, password)}
          onComplete={completePasswordReset}
          onBack={() => press(() => history.back())}
        />
      )}

      {screen === 'mode' && activeProfile && (
        <main
          className="screen menu-screen"
          style={{ backgroundImage: `url(${assetUrl('assets/images/start_banner.webp')})` }}
        >
          <div className="dark-overlay" />
          <header className="mode-progress-header">
            {activeProfile.isGuest ? (
              <div className="active-profile-badge">
                <ProfileAvatar profile={activeProfile} frameless />
                <span>{activeProfile.name}</span>
              </div>
            ) : (
              <button
                type="button"
                className="active-profile-badge editable"
                aria-label={`編輯 ${activeProfile.name} 的頭像`}
                onClick={() => press(() => navigate('edit-avatar'))}
              >
                <ProfileAvatar profile={activeProfile} frameless />
                <span>{activeProfile.name}</span>
              </button>
            )}
            <div className="mode-progress-row">
              <div className="experience-panel">
                <div
                  className="experience-track"
                  role="progressbar"
                  aria-label={`${experience.rankName}等級進度`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={experience.percent}
                >
                  <div className="experience-fill" style={{ width: `${experience.percent}%` }} />
                  <strong>{experience.isMaxRank
                    ? '最高等級'
                    : `${experience.levelXp}/${experience.levelXpRequired} XP`}</strong>
                </div>
              </div>
              <button
                type="button"
                className="animal-rank"
                data-rank-id={experience.rankId}
                aria-label={`查看${experience.rankName}等級說明`}
                onClick={() => press(() => navigate('rank-guide'))}
              >
                <img
                  className="animal-rank-image"
                  src={assetUrl(`assets/images/ranks/${experience.rankId}.png`)}
                  alt={`${experience.rankName}等級`}
                />
              </button>
            </div>
          </header>
          <div className="menu-stack mode-menu-stack">
            <button
              type="button"
              className="campaign-mode-button"
              onClick={() => press(() => void openCampaignMode())}
              disabled={campaignLoading}
            >
              <img src={CAMPAIGN_IMAGES.modeButton} alt="" draggable="false" />
              <strong className="campaign-mode-progress">{campaignLoading ? '正在讀取進度…' : campaignEntryLabel}</strong>
            </button>
            <ImageMenuButton
              image={assetUrl('assets/images/normal_mode_button.webp')}
              label="一般模式"
              className="normal-mode-button"
              onClick={() => press(() => loadPageImages(
                DIFFICULTY_IMAGES,
                () => navigate('difficulty')
              ))}
            />
            <ImageMenuButton
              image={assetUrl('assets/images/infinity_mode_button.webp')}
              label="無限模式"
              className="infinity-mode-button"
              onClick={() => startGame('endless', null)}
            />
            <ImageMenuButton
              image={assetUrl('assets/images/record_button.webp')}
              label="冒險紀錄"
              className="record-menu-button"
              onClick={openLeaderboardFromMenu}
            />
            <ImageMenuButton
              image={assetUrl('assets/images/Backward_button.webp')}
              label="返回帳號選擇"
              className="back-image-button"
              onClick={() => press(() => history.back())}
            />
          </div>
          {campaignError && (
            <Modal title="無法開啟闖關模式" className="campaign-entry-error-modal">
              <p className="modal-copy">{campaignError}</p>
              <div className="modal-actions">
                <button type="button" className="primary-button" onClick={() => void openCampaignMode()}>
                  重新讀取
                </button>
                <button type="button" className="secondary-button" onClick={() => setCampaignError(null)}>
                  返回模式選擇
                </button>
              </div>
            </Modal>
          )}
        </main>
      )}

      {screen === 'campaign-guest-warning' && activeProfile?.isGuest && (
        <CampaignGuestNotice
          onContinue={() => press(continueGuestCampaign)}
          onBack={() => press(() => history.back())}
        />
      )}

      {screen === 'campaign-intro' && activeProfile && (
        <CampaignIntro
          onComplete={completeCampaignIntro}
          onBack={() => press(() => history.back())}
        />
      )}

      {screen === 'campaign-intro-replay' && activeProfile && (
        <CampaignIntro
          replay
          onComplete={() => history.back()}
          onBack={() => press(() => history.back())}
        />
      )}

      {screen === 'campaign-map' && activeProfile && campaignSnapshot && (
        <CampaignMap
          snapshot={campaignSnapshot}
          onBack={() => press(() => history.back())}
          onReplayIntro={() => press(() => navigate('campaign-intro-replay'))}
          onStartLevel={(level) => void startCampaignLevel(level)}
          canStartLevel={(level) => hasCampaignFlowContent(level.id)}
          levelStarting={campaignLevelStarting}
          startError={campaignLevelError}
          onDismissStartError={() => setCampaignLevelError(null)}
          onSystemBackHandlerChange={(handler) => {
            campaignMapBackHandlerRef.current = handler;
          }}
        />
      )}

      {screen === 'campaign-level' && activeProfile && campaignSnapshot && activeCampaignLevel && (
        <CampaignLevelFlow
          key={`${activeProfile.id}:${activeCampaignLevel.id}`}
          level={activeCampaignLevel}
          profileId={activeProfile.id}
          campaignId={FIRST_CAMPAIGN_ID}
          appVersion={APP_VERSION}
          tutorialSeen={campaignSnapshot.flags.some((flag) =>
            flag.flagType === 'tutorial' &&
            flag.contentId === campaignFlowContent(activeCampaignLevel).tutorialId
          )}
          initialBestStars={campaignSnapshot.levels.find((progress) =>
            progress.levelId === activeCampaignLevel.id
          )?.bestStars ?? 0}
          initialCompleted={Boolean(campaignSnapshot.levels.find((progress) =>
            progress.levelId === activeCampaignLevel.id
          )?.firstCompletedAt)}
          onTutorialSeen={markCampaignTutorialSeen}
          onComplete={completeCampaignLevel}
          onGameplayHistoryArm={armCampaignGameplayHistory}
          onGameplayHistoryDisarm={disarmCampaignGameplayHistory}
          onGameplayBackHandlerChange={(handler) => {
            campaignGameplayBackHandlerRef.current = handler;
          }}
          onStoryBackHandlerChange={(handler) => {
            campaignStoryBackHandlerRef.current = handler;
          }}
          onReturnToMap={() => {
            campaignExitPendingRef.current = true;
            press(() => {
              const distance = campaignHistoryPositionRef.current === 'guard'
                ? -3
                : campaignHistoryPositionRef.current === 'base' ? -2 : -1;
              campaignHistoryPositionRef.current = null;
              history.go(distance);
            });
          }}
        />
      )}

      {screen === 'rank-guide' && activeProfile && (
        <RankGuide onBack={() => press(() => history.back())} />
      )}

      {screen === 'edit-avatar' && activeProfile && !activeProfile.isGuest && (
        <AvatarEditor
          initialRecipe={activeProfile.avatar}
          title="編輯冒險家頭像"
          saveLabel="保存頭像"
          onSave={saveActiveAvatar}
          onBack={() => press(() => history.back())}
        />
      )}

      {screen === 'difficulty' && activeProfile && (
        <main
          className="screen menu-screen"
          style={{ backgroundImage: `url(${assetUrl('assets/images/start_banner.webp')})` }}
        >
          <div className="dark-overlay" />
          <div className="menu-stack difficulty-menu-stack">
            {(Object.entries(DIFFICULTY_CONFIG) as Array<[
              Difficulty,
              (typeof DIFFICULTY_CONFIG)[Difficulty]
            ]>).map(([difficulty, config]) => (
              <ImageMenuButton
                key={difficulty}
                image={config.image}
                label={config.label}
                className={`difficulty-${difficulty}-button`}
                onClick={() => startGame('normal', difficulty)}
              />
            ))}
            <ImageMenuButton
              image={assetUrl('assets/images/Backward_button.webp')}
              label="返回模式選擇"
              className="back-image-button"
              onClick={() => press(() => history.back())}
            />
          </div>
        </main>
      )}

      {screen === 'game' && activeProfile && (
        <GameScreen
          key={`${gameSetup.mode}-${gameSetup.difficulty}-${runId}`}
          mode={gameSetup.mode}
          difficulty={gameSetup.difficulty}
          runId={runId}
          profileId={activeProfile.id}
          paused={quitConfirmation}
          onFinish={finishGame}
          onRequestQuit={openQuitConfirmation}
          onLoadingBack={returnToMode}
        />
      )}

      {result && (
        <ResultModal
          result={result}
          upgradedRankName={upgradedRankName}
          saveError={resultSaveError}
          saving={resultSaving}
          onRetrySave={() => void saveGameResult(result)}
          onReplay={replay}
          onLeaderboard={openLeaderboardFromResult}
          onMenu={returnToMode}
        />
      )}

      {leaderboardPage && activeProfile && (
        <Leaderboard
          initialPage={leaderboardPage}
          profileId={activeProfile.id}
          onClose={() => {
            if (leaderboardOriginRef.current === 'result') returnToMode();
            else closeMenuLeaderboard();
          }}
        />
      )}

      {quitConfirmation && (
        <Modal title="要放棄這次冒險嗎？" labelledBy="quit-title">
          <p className="modal-copy">本次尚未完成的分數不會列入冒險紀錄。</p>
          <div className="modal-actions horizontal">
            <button className="danger-button" onClick={abandonGame}>放棄冒險</button>
            <button className="primary-button" onClick={continueGame}>繼續遊戲</button>
          </div>
        </Modal>
      )}

      {pageLoading && (
        <aside className="page-loading" role="status" aria-live="polite">
          <div className="page-loading-card">
            <strong>{pageLoading.error
              ? pageLoading.error === 'timeout' ? '載入時間較久' : '載入失敗'
              : '載入中…'}</strong>
            {!pageLoading.error && (
              <>
                <div
                  className="loading-progress-track"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pageLoading.progress}
                >
                  <div
                    className="loading-progress-fill"
                    style={{ width: `${pageLoading.progress}%` }}
                  />
                </div>
                <span>{pageLoading.progress}%</span>
              </>
            )}
            {pageLoading.error && (
              <>
                <p>{pageLoading.error === 'timeout'
                  ? '裝置仍在準備資源，請再試一次。'
                  : '請檢查網路連線後再試一次。'}</p>
                <div className="modal-actions horizontal">
                  {pageLoading.cancellable && (
                    <button className="secondary-button" onClick={cancelPageLoad}>返回</button>
                  )}
                  <button className="primary-button" onClick={retryPageLoad}>重新載入</button>
                </div>
              </>
            )}
          </div>
        </aside>
      )}

      {adventurePreparation && (
        <aside className="page-loading adventure-preparation" role="status" aria-live="polite">
          <div className="page-loading-card">
            <strong>{adventurePreparation.error
              ? adventurePreparation.error === 'timeout'
                ? '準備時間較久'
                : adventurePreparation.error === 'offline-shell'
                  ? '離線功能尚未就緒'
                  : '準備失敗'
              : '發現新冒險元件，正在為您準備中'}</strong>
            {!adventurePreparation.error && (
              <>
                <div
                  className="loading-progress-track"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={adventurePreparation.progress}
                >
                  <div
                    className="loading-progress-fill"
                    style={{ width: `${adventurePreparation.progress}%` }}
                  />
                </div>
                <span>{adventurePreparation.progress}%</span>
              </>
            )}
            {adventurePreparation.error && (
              <>
                <p>{adventurePreparation.error === 'timeout'
                  ? '裝置準備冒險元件的時間較久，請再試一次。'
                  : adventurePreparation.error === 'offline-shell'
                    ? '請先保持網路連線並重新開啟程式，完成離線功能安裝。'
                    : '尚有冒險元件未完成，請檢查網路連線後再試一次。'}</p>
                <div className="modal-actions horizontal">
                  <button className="secondary-button" onClick={cancelAdventurePreparation}>
                    返回
                  </button>
                  <button className="primary-button" onClick={() => void prepareAdventure()}>
                    重新準備
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      )}

      {needRefresh && screen !== 'game' && !result && !pageLoading && !adventurePreparation && (
        <aside className="update-banner" role="status">
          <span>新版本已準備好</span>
          <button onClick={() => updateServiceWorker(true)}>安全更新</button>
          <button aria-label="稍後更新" onClick={() => setNeedRefresh(false)}>稍後</button>
        </aside>
      )}

      <aside className="orientation-lock" role="status" aria-live="polite">
        <span aria-hidden="true">📱</span>
        <strong>請將裝置轉為直式</strong>
        <p>小小注音冒險家限定使用直式螢幕。</p>
      </aside>
    </div>
  );
}
