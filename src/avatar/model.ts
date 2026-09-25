export const FACE_OPTIONS = [
  'round',
  'oval',
  'diamond',
  'square01',
  'square02',
  'square03',
  'long01',
  'long02'
] as const;
export const SKIN_TONE_OPTIONS = ['peach', 'warm', 'golden', 'tan', 'deep'] as const;
export const HAIR_OPTIONS = ['short', 'bob', 'curly', 'twin-tails', 'side-sweep', 'spiky'] as const;
export const HAIR_COLOR_OPTIONS = ['black', 'brown', 'chestnut', 'golden', 'blue', 'pink'] as const;
export const BROW_OPTIONS = ['soft', 'straight', 'arched', 'cheerful'] as const;
export const EYE_OPTIONS = ['round', 'smile', 'sparkle', 'gentle', 'bright', 'wink'] as const;
export const NOSE_OPTIONS = ['dot', 'soft', 'button'] as const;
export const MOUTH_OPTIONS = ['smile', 'open-smile', 'tiny', 'cat', 'grin'] as const;
export const CHEEK_OPTIONS = ['none', 'blush', 'freckles', 'swirl', 'shy-lines', 'stars'] as const;
export const GLASSES_OPTIONS = ['none', 'round', 'square', 'star'] as const;
export const HAIR_ACCESSORY_OPTIONS = ['none', 'star-clip', 'bow', 'leaf', 'explorer-hat'] as const;

export type FaceOption = typeof FACE_OPTIONS[number];
export type SkinToneOption = typeof SKIN_TONE_OPTIONS[number];
export type HairOption = typeof HAIR_OPTIONS[number];
export type HairColorOption = typeof HAIR_COLOR_OPTIONS[number];
export type BrowOption = typeof BROW_OPTIONS[number];
export type EyeOption = typeof EYE_OPTIONS[number];
export type NoseOption = typeof NOSE_OPTIONS[number];
export type MouthOption = typeof MOUTH_OPTIONS[number];
export type CheekOption = typeof CHEEK_OPTIONS[number];
export type GlassesOption = typeof GLASSES_OPTIONS[number];
export type HairAccessoryOption = typeof HAIR_ACCESSORY_OPTIONS[number];

export interface LegacyAvatarRecipe {
  version: 1;
  seed: string;
}

export interface AvatarRecipeV2 {
  version: 2;
  face: FaceOption;
  skinTone: SkinToneOption;
  hair: HairOption;
  hairColor: HairColorOption;
  brows: BrowOption;
  eyes: EyeOption;
  nose: NoseOption;
  mouth: MouthOption;
  cheeks: CheekOption;
  glasses: GlassesOption;
  hairAccessory: HairAccessoryOption;
}

export type AvatarRecipe = LegacyAvatarRecipe | AvatarRecipeV2;
export type AvatarRecipeKey = Exclude<keyof AvatarRecipeV2, 'version'>;

export const DEFAULT_AVATAR_RECIPE: AvatarRecipeV2 = {
  version: 2,
  face: 'round',
  skinTone: 'warm',
  hair: 'short',
  hairColor: 'brown',
  brows: 'soft',
  eyes: 'round',
  nose: 'soft',
  mouth: 'smile',
  cheeks: 'blush',
  glasses: 'none',
  hairAccessory: 'none'
};

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededIndex(seed: number, salt: number, length: number): number {
  let value = (seed + Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x85ebca6b) >>> 0;
  value ^= value >>> 13;
  return value % length;
}

function pickFromSeed<T>(options: readonly T[], seed: number, salt: number): T {
  return options[seededIndex(seed, salt, options.length)];
}

function randomIndex(length: number): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % length;
}

function randomFrom<T>(options: readonly T[]): T {
  return options[randomIndex(options.length)];
}

export function avatarRecipeFromSeed(seedValue: string): AvatarRecipeV2 {
  const seed = hashSeed(seedValue);
  return {
    version: 2,
    face: pickFromSeed(FACE_OPTIONS, seed, 0),
    skinTone: pickFromSeed(SKIN_TONE_OPTIONS, seed, 1),
    hair: pickFromSeed(HAIR_OPTIONS, seed, 2),
    hairColor: pickFromSeed(HAIR_COLOR_OPTIONS, seed, 3),
    brows: pickFromSeed(BROW_OPTIONS, seed, 4),
    eyes: pickFromSeed(EYE_OPTIONS, seed, 5),
    nose: pickFromSeed(NOSE_OPTIONS, seed, 6),
    mouth: pickFromSeed(MOUTH_OPTIONS, seed, 7),
    cheeks: pickFromSeed(CHEEK_OPTIONS, seed, 8),
    glasses: pickFromSeed(GLASSES_OPTIONS, seed, 9),
    hairAccessory: pickFromSeed(HAIR_ACCESSORY_OPTIONS, seed, 10)
  };
}

export function normalizeAvatarRecipe(recipe: AvatarRecipe): AvatarRecipeV2 {
  if (recipe.version !== 2) return avatarRecipeFromSeed(recipe.seed);

  const storedFace = recipe.face as string;
  const face = storedFace === 'soft-square'
    ? 'square02'
    : FACE_OPTIONS.includes(storedFace as FaceOption)
      ? storedFace as FaceOption
      : DEFAULT_AVATAR_RECIPE.face;

  return { ...recipe, face };
}

export function randomAvatarRecipe(): AvatarRecipeV2 {
  return {
    version: 2,
    face: randomFrom(FACE_OPTIONS),
    skinTone: randomFrom(SKIN_TONE_OPTIONS),
    hair: randomFrom(HAIR_OPTIONS),
    hairColor: randomFrom(HAIR_COLOR_OPTIONS),
    brows: randomFrom(BROW_OPTIONS),
    eyes: randomFrom(EYE_OPTIONS),
    nose: randomFrom(NOSE_OPTIONS),
    mouth: randomFrom(MOUTH_OPTIONS),
    cheeks: randomFrom(CHEEK_OPTIONS),
    glasses: randomFrom(GLASSES_OPTIONS),
    hairAccessory: randomFrom(HAIR_ACCESSORY_OPTIONS)
  };
}
