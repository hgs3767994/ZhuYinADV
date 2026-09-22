import { assetUrl } from '../utils/assets';

const ZHUYIN_AUDIO_FILES: Record<string, string> = {
  ㄅ: 'b', ㄆ: 'p', ㄇ: 'm', ㄈ: 'f', ㄉ: 'd', ㄊ: 't', ㄋ: 'n', ㄌ: 'l',
  ㄍ: 'g', ㄎ: 'k', ㄏ: 'h', ㄐ: 'j', ㄑ: 'q', ㄒ: 'x', ㄓ: 'zh', ㄔ: 'ch',
  ㄕ: 'sh', ㄖ: 'r', ㄗ: 'z', ㄘ: 'c', ㄙ: 's', ㄚ: 'a', ㄛ: 'o', ㄜ: 'e',
  ㄝ: 'eh', ㄞ: 'ai', ㄟ: 'ei', ㄠ: 'ao', ㄡ: 'ou', ㄢ: 'an', ㄣ: 'en',
  ㄤ: 'ang', ㄥ: 'eng', ㄦ: 'er', ㄧ: 'yi', ㄨ: 'wu', ㄩ: 'yu'
};

class AudioService {
  private readonly bgm = new Audio(assetUrl('assets/audio/bgm.mp3'));
  private readonly voice = new Audio();
  private readonly sfxPool = Array.from({ length: 5 }, () => new Audio());
  private sfxIndex = 0;
  private unlocked = false;

  constructor() {
    this.bgm.loop = true;
    this.bgm.volume = 0.35;
    this.voice.volume = 1;
  }

  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.playBgm();
  }

  playBgm(): void {
    if (!this.unlocked || document.hidden) return;
    this.bgm.play().catch(() => undefined);
  }

  pauseBgm(): void {
    this.bgm.pause();
  }

  speak(symbol: string): void {
    const file = ZHUYIN_AUDIO_FILES[symbol];
    if (!file) return;
    this.voice.pause();
    this.voice.currentTime = 0;
    this.voice.src = assetUrl(`assets/audio/zhuyin/${file}.mp3`);
    this.voice.play().catch(() => undefined);
  }

  playDing(): void {
    this.playSfx(assetUrl('assets/audio/ding.mp3'), 0.3);
  }

  playCorrect(): void {
    this.playSfx(assetUrl('assets/audio/correct.mp3'), 0.4);
  }

  playWrong(): void {
    this.playSfx(assetUrl('assets/audio/wrong.mp3'), 0.75);
  }

  private playSfx(source: string, volume: number): void {
    const audio = this.sfxPool[this.sfxIndex];
    this.sfxIndex = (this.sfxIndex + 1) % this.sfxPool.length;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = volume;
    audio.src = source;
    audio.play().catch(() => undefined);
  }
}

export const audioService = new AudioService();
