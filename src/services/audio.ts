import { assetUrl } from '../utils/assets';

const ZHUYIN_AUDIO_FILES: Record<string, string> = {
  ㄅ: 'b', ㄆ: 'p', ㄇ: 'm', ㄈ: 'f', ㄉ: 'd', ㄊ: 't', ㄋ: 'n', ㄌ: 'l',
  ㄍ: 'g', ㄎ: 'k', ㄏ: 'h', ㄐ: 'j', ㄑ: 'q', ㄒ: 'x', ㄓ: 'zh', ㄔ: 'ch',
  ㄕ: 'sh', ㄖ: 'r', ㄗ: 'z', ㄘ: 'c', ㄙ: 's', ㄚ: 'a', ㄛ: 'o', ㄜ: 'e',
  ㄝ: 'eh', ㄞ: 'ai', ㄟ: 'ei', ㄠ: 'ao', ㄡ: 'ou', ㄢ: 'an', ㄣ: 'en',
  ㄤ: 'ang', ㄥ: 'eng', ㄦ: 'er', ㄧ: 'yi', ㄨ: 'wu', ㄩ: 'yu'
};

const SFX_FILES = {
  ding: assetUrl('assets/audio/ding.mp3'),
  correct: assetUrl('assets/audio/correct.mp3'),
  wrong: assetUrl('assets/audio/wrong.mp3')
} as const;

type SafariWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

class AudioService {
  private readonly bgm = new Audio();
  private readonly bufferPromises = new Map<string, Promise<AudioBuffer>>();
  private context: AudioContext | null = null;
  private activeVoice: AudioBufferSourceNode | null = null;
  private voiceRequestId = 0;
  private unlocked = false;
  private bgmStartTimer: number | null = null;
  private bgmRequested = false;
  private adventureWarmup: Promise<void> | null = null;
  private criticalLoadCount = 0;
  private criticalIdleResolvers: Array<() => void> = [];

  constructor() {
    this.bgm.loop = true;
    this.bgm.volume = 0.35;
    this.bgm.preload = 'none';
    this.bgm.src = assetUrl('assets/audio/bgm.mp3');
  }

  unlock(): void {
    this.unlocked = true;
    const context = this.ensureContext();
    if (context?.state === 'suspended') void context.resume();
    this.playBgm();
  }

  playBgm(): void {
    this.bgmRequested = true;
    if (
      !this.unlocked ||
      document.hidden ||
      this.adventureWarmup !== null ||
      this.bgmStartTimer !== null ||
      !this.bgm.paused
    ) {
      return;
    }
    this.bgmStartTimer = window.setTimeout(() => {
      this.bgmStartTimer = null;
      if (!this.unlocked || !this.bgmRequested || document.hidden) return;
      this.bgm.play().catch(() => undefined);
    }, 800);
  }

  pauseBgm(): void {
    this.bgmRequested = false;
    if (this.bgmStartTimer !== null) {
      window.clearTimeout(this.bgmStartTimer);
      this.bgmStartTimer = null;
    }
    this.bgm.pause();
  }

  prepareForAdventure(): void {
    if (this.adventureWarmup !== null || !this.ensureContext()) return;
    if (this.bgmStartTimer !== null) {
      window.clearTimeout(this.bgmStartTimer);
      this.bgmStartTimer = null;
    }

    const sources = [
      SFX_FILES.correct,
      SFX_FILES.wrong,
      ...Object.values(ZHUYIN_AUDIO_FILES).map((file) =>
        assetUrl(`assets/audio/zhuyin/${file}.mp3`)
      )
    ];
    this.adventureWarmup = this.preloadInBatches(sources, 2).finally(() => {
      this.adventureWarmup = null;
      if (this.bgmRequested) this.playBgm();
    });
  }

  async prepareVoice(symbol: string): Promise<void> {
    const file = ZHUYIN_AUDIO_FILES[symbol];
    if (!file) return;
    const source = assetUrl(`assets/audio/zhuyin/${file}.mp3`);
    await this.withTimeout(
      this.runCritical(async () => {
        await this.resumeContext();
        await this.loadBuffer(source);
      }),
      8_000
    );
  }

  async prepareEffect(effect: 'correct' | 'wrong'): Promise<void> {
    await this.runCritical(async () => {
      await this.resumeContext();
      await this.loadBuffer(SFX_FILES[effect]);
    });
  }

  speak(symbol: string): void {
    const file = ZHUYIN_AUDIO_FILES[symbol];
    if (!file) return;
    const requestId = ++this.voiceRequestId;
    this.stopVoice();
    void this.playBuffer(
      assetUrl(`assets/audio/zhuyin/${file}.mp3`),
      1,
      'voice',
      requestId
    );
  }

  playDing(): void {
    void this.playBuffer(SFX_FILES.ding, 0.3, 'effect');
  }

  playCorrect(): void {
    void this.playBuffer(SFX_FILES.correct, 0.4, 'effect');
  }

  playWrong(): void {
    void this.playBuffer(SFX_FILES.wrong, 0.75, 'effect');
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    const AudioContextClass = window.AudioContext ?? (window as SafariWindow).webkitAudioContext;
    if (!AudioContextClass) return null;
    this.context = new AudioContextClass({ latencyHint: 'interactive' });
    return this.context;
  }

  private async resumeContext(): Promise<void> {
    const context = this.ensureContext();
    if (!context) throw new Error('Web Audio API is unavailable');
    if (context.state === 'suspended') await context.resume();
  }

  private loadBuffer(source: string): Promise<AudioBuffer> {
    const existing = this.bufferPromises.get(source);
    if (existing) return existing;
    const context = this.ensureContext();
    if (!context) return Promise.reject(new Error('Web Audio API is unavailable'));

    const pending = fetch(source)
      .then((response) => {
        if (!response.ok) throw new Error(`Audio request failed: ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .catch((error) => {
        this.bufferPromises.delete(source);
        throw error;
      });
    this.bufferPromises.set(source, pending);
    return pending;
  }

  private async preloadInBatches(sources: string[], batchSize: number): Promise<void> {
    for (let index = 0; index < sources.length; index += batchSize) {
      await this.waitForCriticalIdle();
      await Promise.allSettled(
        sources.slice(index, index + batchSize).map((source) => this.loadBuffer(source))
      );
      await new Promise<void>((resolve) => window.setTimeout(resolve, 40));
    }
  }

  private async runCritical<T>(task: () => Promise<T>): Promise<T> {
    this.criticalLoadCount += 1;
    try {
      return await task();
    } finally {
      this.criticalLoadCount -= 1;
      if (this.criticalLoadCount === 0) {
        const resolvers = this.criticalIdleResolvers.splice(0);
        resolvers.forEach((resolve) => resolve());
      }
    }
  }

  private waitForCriticalIdle(): Promise<void> {
    if (this.criticalLoadCount === 0) return Promise.resolve();
    return new Promise((resolve) => this.criticalIdleResolvers.push(resolve));
  }

  private async withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutId = 0;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(
        () => reject(new Error('Audio preparation timed out')),
        timeoutMs
      );
    });
    try {
      return await Promise.race([task, timeout]);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  private async playBuffer(
    source: string,
    volume: number,
    channel: 'voice' | 'effect',
    requestId?: number
  ): Promise<void> {
    const context = this.ensureContext();
    if (!context) {
      this.playFallback(source, volume);
      return;
    }

    try {
      if (context.state === 'suspended') await context.resume();
      const buffer = await this.loadBuffer(source);
      if (channel === 'voice' && requestId !== this.voiceRequestId) return;

      const node = context.createBufferSource();
      const gain = context.createGain();
      node.buffer = buffer;
      gain.gain.value = volume;
      node.connect(gain);
      gain.connect(context.destination);
      if (channel === 'voice') this.activeVoice = node;
      node.onended = () => {
        node.disconnect();
        gain.disconnect();
        if (this.activeVoice === node) this.activeVoice = null;
      };
      node.start();
    } catch {
      if (channel === 'voice' && requestId !== this.voiceRequestId) return;
      this.playFallback(source, volume);
    }
  }

  private stopVoice(): void {
    if (!this.activeVoice) return;
    try {
      this.activeVoice.stop();
    } catch {
      // The node may already have ended between frames.
    }
    this.activeVoice = null;
  }

  private playFallback(source: string, volume: number): void {
    const audio = new Audio(source);
    audio.volume = volume;
    audio.play().catch(() => undefined);
  }
}

export const audioService = new AudioService();
