import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AVATAR_RECIPE,
  FACE_OPTIONS,
  HAIR_OPTIONS,
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

  it('offers all eight finished face assets', () => {
    expect(FACE_OPTIONS).toEqual([
      'round', 'oval', 'diamond', 'square01',
      'square02', 'square03', 'long01', 'long02'
    ]);
  });

  it('migrates the retired soft-square face without changing other choices', () => {
    const legacyV2 = { ...DEFAULT_AVATAR_RECIPE, face: 'soft-square' } as unknown as AvatarRecipeV2;
    expect(normalizeAvatarRecipe(legacyV2).face).toBe('square02');
  });

  it('offers the thirteen selected hairstyles', () => {
    expect(HAIR_OPTIONS).toEqual([
      'a01', 'a02', 'a03', 'a04', 'a05', 'a06', 'a07', 'a08',
      'b01', 'b02', 'b05', 'b06', 'b07'
    ]);
  });

  it('migrates every retired procedural hairstyle to a selected SVG hairstyle', () => {
    const mappings = {
      short: 'a01', bob: 'a05', curly: 'a05', 'twin-tails': 'a05',
      'side-sweep': 'a06', spiky: 'a08'
    } as const;
    for (const [hair, expected] of Object.entries(mappings)) {
      const legacyV2 = { ...DEFAULT_AVATAR_RECIPE, hair } as unknown as AvatarRecipeV2;
      expect(normalizeAvatarRecipe(legacyV2).hair).toBe(expected);
    }
  });

  it('creates complete random recipes', () => {
    const recipe = randomAvatarRecipe();
    expect(recipe.version).toBe(2);
    expect(Object.keys(recipe)).toHaveLength(Object.keys(DEFAULT_AVATAR_RECIPE).length);
  });
});
