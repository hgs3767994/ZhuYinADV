import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AVATAR_RECIPE,
  APPROVED_HAIR_OPTIONS,
  BROW_OPTIONS,
  FACE_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_OPTIONS,
  MOUTH_OPTIONS,
  NOSE_OPTIONS,
  VECTOR_EYE_OPTIONS,
  EYE_OPTIONS,
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
    expect(first.glasses).toBe('none');
    expect(first.hairAccessory).toBe('none');
  });

  it('keeps an existing v2 recipe unchanged', () => {
    expect(normalizeAvatarRecipe(DEFAULT_AVATAR_RECIPE)).toEqual(DEFAULT_AVATAR_RECIPE);
  });

  it('uses the first visible editor option in every category as the default', () => {
    expect(DEFAULT_AVATAR_RECIPE).toEqual({
      version: 2,
      face: FACE_OPTIONS[0],
      skinTone: 'peach',
      hair: '02',
      hairColor: 'black',
      brows: '01',
      eyes: '02',
      nose: NOSE_OPTIONS[0],
      mouth: '02',
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

  it('offers only the five calibrated vector eyes', () => {
    expect(VECTOR_EYE_OPTIONS).toEqual(['01', '02', '03', '04', '05']);
    expect(EYE_OPTIONS).toEqual(VECTOR_EYE_OPTIONS);
  });

  it('offers the eight calibrated vector noses', () => {
    expect(NOSE_OPTIONS).toEqual(['01', '02', '03', '04', '05', '06', '07', '08']);
  });

  it('migrates every retired procedural nose to a vector nose', () => {
    const mappings = { dot: '01', soft: '03', button: '02' } as const;
    for (const [nose, expected] of Object.entries(mappings)) {
      const retired = { ...DEFAULT_AVATAR_RECIPE, nose } as unknown as AvatarRecipeV2;
      expect(normalizeAvatarRecipe(retired).nose).toBe(expected);
    }
  });

  it('offers the nine retained vector mouths', () => {
    expect(MOUTH_OPTIONS).toEqual(['01', '02', '04', '05', '06', '07', '08', '10', '14']);
  });

  it('migrates every retired procedural mouth to a vector mouth', () => {
    const mappings = {
      smile: '02', 'open-smile': '07', tiny: '02', cat: '06', grin: '08'
    } as const;
    for (const [mouth, expected] of Object.entries(mappings)) {
      const retired = { ...DEFAULT_AVATAR_RECIPE, mouth } as unknown as AvatarRecipeV2;
      expect(normalizeAvatarRecipe(retired).mouth).toBe(expected);
    }
  });

  it('offers the three additional hair colors after the existing choices', () => {
    expect(HAIR_COLOR_OPTIONS).toEqual([
      'black', 'brown', 'chestnut', 'golden', 'blue', 'pink',
      'green', 'wine', 'gray'
    ]);
  });

  it('migrates every retired procedural eye to a vector eye', () => {
    const mappings = {
      round: '02', smile: '04', sparkle: '05', gentle: '02', bright: '05', wink: '01'
    } as const;
    for (const [eyes, expected] of Object.entries(mappings)) {
      const retired = { ...DEFAULT_AVATAR_RECIPE, eyes } as unknown as AvatarRecipeV2;
      expect(normalizeAvatarRecipe(retired).eyes).toBe(expected);
    }
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

  it('offers only the retained calibrated hairstyles', () => {
    expect(APPROVED_HAIR_OPTIONS).toEqual(['01', '02', '03', '05', '07', '08', '09', '11', 'c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c07', 'c08']);
    expect(HAIR_OPTIONS).toEqual(APPROVED_HAIR_OPTIONS);
    expect(HAIR_OPTIONS).toHaveLength(16);
  });

  it('migrates retired procedural hairstyles safely', () => {
    const mappings = {
      short: '02', bob: '01', curly: '02', 'twin-tails': '02',
      'side-sweep': '02', spiky: '02'
    } as const;
    for (const [hair, expected] of Object.entries(mappings)) {
      const legacyV2 = { ...DEFAULT_AVATAR_RECIPE, hair } as unknown as AvatarRecipeV2;
      expect(normalizeAvatarRecipe(legacyV2).hair).toBe(expected);
    }
  });

  it('falls back safely for an unknown hairstyle', () => {
    const legacyV2 = { ...DEFAULT_AVATAR_RECIPE, hair: 'unknown' } as unknown as AvatarRecipeV2;
    expect(normalizeAvatarRecipe(legacyV2).hair).toBe('02');
  });

  it('falls back to the new first hairstyle for all ten removed hairstyle ids', () => {
    for (const hair of ['a01', 'a02', 'a03', 'a06', 'a07', 'a08', 'b01', 'b05', 'b06', 'b07']) {
      const retired = { ...DEFAULT_AVATAR_RECIPE, hair } as unknown as AvatarRecipeV2;
      expect(normalizeAvatarRecipe(retired).hair).toBe('02');
    }
  });

  it('falls back to the first hairstyle for the three removed choices', () => {
    for (const hair of ['a04', 'a05', 'b02']) {
      const retired = { ...DEFAULT_AVATAR_RECIPE, hair } as unknown as AvatarRecipeV2;
      expect(normalizeAvatarRecipe(retired).hair).toBe('02');
    }
  });

  it('keeps deferred glasses and hair accessories disabled in stored avatars', () => {
    const decorated = {
      ...DEFAULT_AVATAR_RECIPE,
      glasses: 'star',
      hairAccessory: 'explorer-hat'
    } as AvatarRecipeV2;
    expect(normalizeAvatarRecipe(decorated)).toEqual(DEFAULT_AVATAR_RECIPE);
  });

  it('keeps the deferred cheek decoration field out of stored avatars', () => {
    const decorated = {
      ...DEFAULT_AVATAR_RECIPE,
      cheeks: 'freckles'
    } as unknown as AvatarRecipeV2;
    expect(normalizeAvatarRecipe(decorated)).toEqual(DEFAULT_AVATAR_RECIPE);
    expect(normalizeAvatarRecipe(decorated)).not.toHaveProperty('cheeks');
  });

  it('creates complete random recipes', () => {
    const recipe = randomAvatarRecipe();
    expect(recipe.version).toBe(2);
    expect(recipe.glasses).toBe('none');
    expect(recipe.hairAccessory).toBe('none');
    expect(Object.keys(recipe)).toHaveLength(Object.keys(DEFAULT_AVATAR_RECIPE).length);
  });
});
