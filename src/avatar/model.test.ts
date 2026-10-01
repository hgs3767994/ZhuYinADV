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

  it('offers the seven selected face assets', () => {
    expect(FACE_OPTIONS).toEqual([
      'round', 'oval', 'diamond', 'square01',
      'square02', 'square03', 'long01'
    ]);
  });

  it('migrates the retired soft-square face without changing other choices', () => {
    const legacyV2 = { ...DEFAULT_AVATAR_RECIPE, face: 'soft-square' } as unknown as AvatarRecipeV2;
    expect(normalizeAvatarRecipe(legacyV2).face).toBe('square02');
  });

  it('migrates the retired long02 face to long01', () => {
    const legacyV2 = { ...DEFAULT_AVATAR_RECIPE, face: 'long02' } as unknown as AvatarRecipeV2;
    expect(normalizeAvatarRecipe(legacyV2).face).toBe('long01');
  });

  it('allows an avatar to have no eyebrows', () => {
    expect(BROW_OPTIONS).toContain('none');
  });

  it('keeps the thirteen existing hairstyles and adds the four calibrated hairstyles', () => {
    expect(LEGACY_HAIR_OPTIONS).toEqual([
      'a01', 'a02', 'a03', 'a04', 'a05', 'a06', 'a07', 'a08',
      'b01', 'b02', 'b05', 'b06', 'b07'
    ]);
    expect(APPROVED_HAIR_OPTIONS).toEqual(['01', '02', '03', '05']);
    expect(HAIR_OPTIONS).toHaveLength(17);
  });

  it('preserves every existing hairstyle id unchanged', () => {
    for (const hair of LEGACY_HAIR_OPTIONS) {
      const existing = { ...DEFAULT_AVATAR_RECIPE, hair };
      expect(normalizeAvatarRecipe(existing).hair).toBe(hair);
    }
  });

  it('migrates retired procedural hairstyles to the original selected hairstyles', () => {
    const mappings = {
      short: 'a01', bob: 'a05', curly: 'a05', 'twin-tails': 'a05',
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

  it('creates complete random recipes', () => {
    const recipe = randomAvatarRecipe();
    expect(recipe.version).toBe(2);
    expect(Object.keys(recipe)).toHaveLength(Object.keys(DEFAULT_AVATAR_RECIPE).length);
  });
});
