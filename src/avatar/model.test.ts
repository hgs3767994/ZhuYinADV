import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AVATAR_RECIPE,
  APPROVED_HAIR_OPTIONS,
  BROW_OPTIONS,
  FACE_OPTIONS,
  HAIR_OPTIONS,
  LEGACY_HAIR_OPTIONS,
  avatarRecipeFromSeed,
  normalizeAvatarRecipe,
  randomAvatarRecipe,
  type AvatarRecipeV2
} from './model';

describe('avatar recipes', () => {
  it('converts a legacy seed into a stable v2 recipe', () => {
    const first = avatarRecipeFromSeed('same-player');
    const second = avatarRecipeFromSeed('same-player');
    expect(first).toEqual(second);
    expect(first.version).toBe(2);
  });

  it('keeps an existing v2 recipe unchanged', () => {
    expect(normalizeAvatarRecipe(DEFAULT_AVATAR_RECIPE)).toEqual(DEFAULT_AVATAR_RECIPE);
  });

  it('uses the first remaining option in every category as the default', () => {
    expect(DEFAULT_AVATAR_RECIPE).toEqual({
      version: 2,
      face: FACE_OPTIONS[0],
      skinTone: 'peach',
      hair: HAIR_OPTIONS[0],
      hairColor: 'black',
      brows: BROW_OPTIONS[0],
      eyes: 'round',
      nose: 'dot',
      mouth: 'smile',
      cheeks: 'none',
      glasses: 'none',
      hairAccessory: 'none'
    });
  });

  it('offers the six remaining face assets', () => {
    expect(FACE_OPTIONS).toEqual([
      'round', 'oval', 'diamond', 'square01',
      'square02', 'long01'
    ]);
  });

  it('falls back to the first face for the removed sixth face', () => {
    const retired = { ...DEFAULT_AVATAR_RECIPE, face: 'square03' } as unknown as AvatarRecipeV2;
    expect(normalizeAvatarRecipe(retired).face).toBe('round');
  });

  it('migrates the retired soft-square face without changing other choices', () => {
    const legacyV2 = { ...DEFAULT_AVATAR_RECIPE, face: 'soft-square' } as unknown as AvatarRecipeV2;
    expect(normalizeAvatarRecipe(legacyV2).face).toBe('square02');
  });

  it('migrates the retired long02 face to long01', () => {
    const legacyV2 = { ...DEFAULT_AVATAR_RECIPE, face: 'long02' } as unknown as AvatarRecipeV2;
    expect(normalizeAvatarRecipe(legacyV2).face).toBe('long01');
  });

  it('offers the nine vector eyebrow choices', () => {
    expect(BROW_OPTIONS).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09']);
  });

  it('migrates every retired procedural eyebrow safely', () => {
    const mappings = {
      none: '01', soft: '01', straight: '02', arched: '04', cheerful: '07'
    } as const;
    for (const [brows, expected] of Object.entries(mappings)) {
      const legacyV2 = { ...DEFAULT_AVATAR_RECIPE, brows } as unknown as AvatarRecipeV2;
      expect(normalizeAvatarRecipe(legacyV2).brows).toBe(expected);
    }
  });

  it('keeps the ten remaining existing hairstyles and adds the calibrated hairstyles', () => {
    expect(LEGACY_HAIR_OPTIONS).toEqual([
      'a01', 'a02', 'a03', 'a06', 'a07', 'a08',
      'b01', 'b05', 'b06', 'b07'
    ]);
    expect(APPROVED_HAIR_OPTIONS).toEqual(['01', '02', '03', '05', '07', '08', '09', '11']);
    expect(HAIR_OPTIONS).toHaveLength(18);
  });

  it('preserves every existing hairstyle id unchanged', () => {
    for (const hair of LEGACY_HAIR_OPTIONS) {
      const existing = { ...DEFAULT_AVATAR_RECIPE, hair };
      expect(normalizeAvatarRecipe(existing).hair).toBe(hair);
    }
  });

  it('migrates retired procedural hairstyles to the original selected hairstyles', () => {
    const mappings = {
      short: 'a01', bob: '01', curly: 'b07', 'twin-tails': '02',
      'side-sweep': 'a06', spiky: 'a08'
    } as const;
    for (const [hair, expected] of Object.entries(mappings)) {
      const legacyV2 = { ...DEFAULT_AVATAR_RECIPE, hair } as unknown as AvatarRecipeV2;
      expect(normalizeAvatarRecipe(legacyV2).hair).toBe(expected);
    }
  });

  it('falls back safely for an unknown hairstyle', () => {
    const legacyV2 = { ...DEFAULT_AVATAR_RECIPE, hair: 'unknown' } as unknown as AvatarRecipeV2;
    expect(normalizeAvatarRecipe(legacyV2).hair).toBe('a01');
  });

  it('falls back to the first hairstyle for the three removed choices', () => {
    for (const hair of ['a04', 'a05', 'b02']) {
      const retired = { ...DEFAULT_AVATAR_RECIPE, hair } as unknown as AvatarRecipeV2;
      expect(normalizeAvatarRecipe(retired).hair).toBe('a01');
    }
  });

  it('removes retired glasses and hair accessories from stored avatars', () => {
    const decorated = {
      ...DEFAULT_AVATAR_RECIPE,
      glasses: 'star',
      hairAccessory: 'explorer-hat'
    } as AvatarRecipeV2;
    expect(normalizeAvatarRecipe(decorated)).toEqual(DEFAULT_AVATAR_RECIPE);
  });

  it('creates complete random recipes', () => {
    const recipe = randomAvatarRecipe();
    expect(recipe.version).toBe(2);
    expect(recipe.glasses).toBe('none');
    expect(recipe.hairAccessory).toBe('none');
    expect(Object.keys(recipe)).toHaveLength(Object.keys(DEFAULT_AVATAR_RECIPE).length);
  });
});
