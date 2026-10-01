import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AVATAR_RECIPE,
  BROW_OPTIONS,
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

  it('offers only the four approved hairstyles', () => {
    expect(HAIR_OPTIONS).toEqual(['01', '02', '03', '05']);
  });

  it('migrates matching retired hairstyles to the approved replacements', () => {
    const mappings = {
      a01: '01', a02: '02', a03: '03', a05: '05',
      short: '01', bob: '05', curly: '05', 'twin-tails': '05',
      'side-sweep': '01', spiky: '01'
    } as const;
    for (const [hair, expected] of Object.entries(mappings)) {
      const legacyV2 = { ...DEFAULT_AVATAR_RECIPE, hair } as unknown as AvatarRecipeV2;
      expect(normalizeAvatarRecipe(legacyV2).hair).toBe(expected);
    }
  });

  it('falls back safely when a retired hairstyle has no approved replacement', () => {
    const legacyV2 = { ...DEFAULT_AVATAR_RECIPE, hair: 'b07' } as unknown as AvatarRecipeV2;
    expect(normalizeAvatarRecipe(legacyV2).hair).toBe('01');
  });

  it('creates complete random recipes', () => {
    const recipe = randomAvatarRecipe();
    expect(recipe.version).toBe(2);
    expect(Object.keys(recipe)).toHaveLength(Object.keys(DEFAULT_AVATAR_RECIPE).length);
  });
});
