import type { Difficulty } from './types';
import { assetUrl } from '../utils/assets';

export const APP_VERSION = '3.7.0';

export const ZHUYIN_LIST = [
  'ㄅ', 'ㄆ', 'ㄇ', 'ㄈ', 'ㄉ', 'ㄊ', 'ㄋ', 'ㄌ', 'ㄍ', 'ㄎ', 'ㄏ',
  'ㄐ', 'ㄑ', 'ㄒ', 'ㄓ', 'ㄔ', 'ㄕ', 'ㄖ', 'ㄗ', 'ㄘ', 'ㄙ',
  'ㄚ', 'ㄛ', 'ㄜ', 'ㄝ', 'ㄞ', 'ㄟ', 'ㄠ', 'ㄡ', 'ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ',
  'ㄧ', 'ㄨ', 'ㄩ'
] as const;

export const DIFFICULTY_CONFIG: Record<Difficulty, {
  label: string;
  optionCount: number;
  background: string;
  image: string;
}> = {
  easy: {
    label: '新手難度',
    optionCount: 2,
    background: assetUrl('assets/images/bg_prairie.webp'),
    image: assetUrl('assets/images/Newbie_button.webp')
  },
  normal: {
    label: '專家難度',
    optionCount: 4,
    background: assetUrl('assets/images/bg_jungle.webp'),
    image: assetUrl('assets/images/Expert_button.webp')
  },
  hard: {
    label: '菁英難度',
    optionCount: 6,
    background: assetUrl('assets/images/bg_wasteland.webp'),
    image: assetUrl('assets/images/Elite_button.webp')
  }
};

export const NORMAL_QUESTION_COUNT = 20;
export const INITIAL_LIVES = 3;
