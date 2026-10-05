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
  ADVENTURE_AUDIO_CACHE_STEPS,
  audioService
} from './services/audio';
import { parentSecurity } from './services/parentSecurity';
import {
  createGuestProfile,
  profileRepository,
  type PlayerProfile
} from './services/profileRepository';
import { resultRepository } from './services/resultsRepository';
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
  ...AVATAR_FACE_ASSETS,
  ...AVATAR_HAIR_ASSETS,
  ...AVATAR_BROW_ASSETS,
  ...AVATAR_EYE_ASSETS,
  ...AVATAR_NOSE_ASSETS,
  ...AVATAR_MOUTH_ASSETS
]));
const IMAGE_ASSET_VERSION = '18';
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
      'mode', 'rank-guide', 'edit-avatar', 'difficulty', 'game'
    ]
      .includes(state.screen ?? '');
}

export function App() {
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
  const [experience, setExperience] = useState<ExperienceProgress>(() => experienceProgress(0));
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
    if (screen === 'game') audioService.pauseBgm();
    else audioService.playBgm();
    if (screen === 'profiles') {
      if (activeProfile?.isGuest) resultRepository.clearGuestResults();
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
    const pauseWhenHidden = () => {
      if (document.hidden) audioService.pauseBgm();
      else if (screenRef.current !== 'game') audioService.playBgm();
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
        ['mode', 'rank-guide', 'edit-avatar', 'difficulty', 'game'].includes(destination.screen) &&
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

  const startGame = (mode: GameMode, difficulty: Difficulty | null) => {
    press(() => {
      setGameSetup({ mode, difficulty });
      setResult(null);
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

  const finishGame = async (nextResult: GameResult) => {
    let displayedResult = nextResult;
    try {
      const saved = await resultRepository.save(nextResult);
      displayedResult = saved.result;
      setExperience(saved.experience);
      setUpgradedRankName(
        !saved.duplicate && saved.previousRankId !== saved.experience.rankId
          ? rankById(saved.experience.rankId).name
          : null
      );
    } catch (error) {
      console.warn('無法保存冒險紀錄', error);
    } finally {
      resultRef.current = displayedResult;
      setResult(displayedResult);
    }
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
    setUpgradedRankName(null);
    setRunId((current) => current + 1);
  };

  return (
    <div
      className="app-shell"
      style={{
        '--account-background-image': `url(${assetUrl('assets/images/start_banner.webp')})`
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
        </main>
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
