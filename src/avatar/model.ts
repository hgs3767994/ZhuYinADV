export const FACE_OPTIONS = [
  'round',
  'oval',
  'diamond',
  'square01',
  'square02',
  'long01'
] as const;
export const SKIN_TONE_OPTIONS = ['peach', 'warm', 'golden', 'tan', 'deep'] as const;
export const APPROVED_HAIR_OPTIONS = ['01', '02', '03', '05', '07', '08', '09', '11', 'c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c07', 'c08'] as const;
export const HAIR_OPTIONS = APPROVED_HAIR_OPTIONS;
export const HAIR_COLOR_OPTIONS = [
  'black', 'brown', 'chestnut', 'golden', 'blue', 'pink',
  'green', 'wine', 'gray', 'mauve', 'mustard'
] as const;
export const VECTOR_BROW_OPTIONS = ['01', '02', '03', '04', '05', '06', '07', '08', '09'] as const;
export const BROW_OPTIONS = VECTOR_BROW_OPTIONS;
export const VECTOR_EYE_OPTIONS = ['01', '02', '03', '04', '05'] as const;
export const EYE_OPTIONS = VECTOR_EYE_OPTIONS;
export const NOSE_OPTIONS = ['01', '02', '03', '04', '05', '06', '07', '08'] as const;
export const MOUTH_OPTIONS = ['01', '02', '04', '05', '06', '07', '08', '10', '14'] as const;
export const GLASSES_OPTIONS = ['none', 'round', 'square', 'star'] as const;
export const HAIR_ACCESSORY_OPTIONS = ['none', 'star-clip', 'bow', 'leaf', 'explorer-hat'] as const;

export type FaceOption = typeof FACE_OPTIONS[number];
export type SkinToneOption = typeof SKIN_TONE_OPTIONS[number];
export type ApprovedHairOption = typeof APPROVED_HAIR_OPTIONS[number];
export type HairOption = typeof HAIR_OPTIONS[number];
export type HairColorOption = typeof HAIR_COLOR_OPTIONS[number];
export type BrowOption = typeof BROW_OPTIONS[number];
export type VectorEyeOption = typeof VECTOR_EYE_OPTIONS[number];
export type EyeOption = typeof EYE_OPTIONS[number];
export type NoseOption = typeof NOSE_OPTIONS[number];
export type MouthOption = typeof MOUTH_OPTIONS[number];
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
  glasses: GlassesOption;
  hairAccessory: HairAccessoryOption;
}

export type AvatarRecipe = LegacyAvatarRecipe | AvatarRecipeV2;
export type AvatarRecipeKey = Exclude<keyof AvatarRecipeV2, 'version'>;

export const DEFAULT_AVATAR_RECIPE: AvatarRecipeV2 = {
  version: 2,
  face: 'round',
  skinTone: 'peach',
  hair: '02',
  hairColor: 'black',
  brows: '01',
  eyes: '02',
  nose: '01',
  mouth: '02',
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
    glasses: 'none',
    hairAccessory: 'none'
  };
}

export function normalizeAvatarRecipe(recipe: AvatarRecipe): AvatarRecipeV2 {
  if (recipe.version !== 2) return avatarRecipeFromSeed(recipe.seed);

  const storedFace = recipe.face as string;
  const face = storedFace === 'soft-square'
    ? 'square02'
    : storedFace === 'long02'
      ? 'long01'
      : FACE_OPTIONS.includes(storedFace as FaceOption)
        ? storedFace as FaceOption
        : DEFAULT_AVATAR_RECIPE.face;

  const storedHair = recipe.hair as string;
  const retiredHair: Record<string, HairOption> = {
    short: '02',
    bob: '01',
    curly: '02',
    'twin-tails': '02',
    'side-sweep': '02',
    spiky: '02'
  };
  const hair = HAIR_OPTIONS.includes(storedHair as HairOption)
    ? storedHair as HairOption
    : retiredHair[storedHair] ?? DEFAULT_AVATAR_RECIPE.hair;

  const storedBrows = recipe.brows as string;
  const legacyBrows: Record<string, BrowOption> = {
    none: '01',
    soft: '01',
    straight: '02',
    arched: '04',
    cheerful: '07'
  };
  const brows = BROW_OPTIONS.includes(storedBrows as BrowOption)
    ? storedBrows as BrowOption
    : legacyBrows[storedBrows] ?? DEFAULT_AVATAR_RECIPE.brows;

  const storedEyes = recipe.eyes as string;
  const retiredEyes: Record<string, EyeOption> = {
    round: '02',
    smile: '04',
    sparkle: '05',
    gentle: '02',
    bright: '05',
    wink: '01'
  };
  const eyes = EYE_OPTIONS.includes(storedEyes as EyeOption)
    ? storedEyes as EyeOption
    : retiredEyes[storedEyes] ?? DEFAULT_AVATAR_RECIPE.eyes;

  const storedNose = recipe.nose as string;
  const retiredNoses: Record<string, NoseOption> = {
    dot: '01',
    soft: '03',
    button: '02'
  };
  const nose = NOSE_OPTIONS.includes(storedNose as NoseOption)
    ? storedNose as NoseOption
    : retiredNoses[storedNose] ?? DEFAULT_AVATAR_RECIPE.nose;

  const storedMouth = recipe.mouth as string;
  const retiredMouths: Record<string, MouthOption> = {
    smile: '02',
    'open-smile': '07',
    tiny: '02',
    cat: '06',
    grin: '08'
  };
  const mouth = MOUTH_OPTIONS.includes(storedMouth as MouthOption)
    ? storedMouth as MouthOption
    : retiredMouths[storedMouth] ?? DEFAULT_AVATAR_RECIPE.mouth;

  return {
    version: 2,
    face,
    skinTone: recipe.skinTone,
    hair,
    hairColor: recipe.hairColor,
    brows,
    eyes,
    nose,
    mouth,
    glasses: 'none',
    hairAccessory: 'none'
  };
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
    glasses: 'none',
    hairAccessory: 'none'
  };
}
