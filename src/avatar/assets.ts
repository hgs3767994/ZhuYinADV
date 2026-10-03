import { assetUrl } from '../utils/assets';
import {
  APPROVED_HAIR_OPTIONS,
  BROW_OPTIONS,
  FACE_OPTIONS,
  LEGACY_HAIR_OPTIONS,
  MOUTH_OPTIONS,
  NOSE_OPTIONS,
  VECTOR_EYE_OPTIONS,
  type ApprovedHairOption,
  type BrowOption,
  type FaceOption,
  type HairOption,
  type LegacyHairOption,
  type MouthOption,
  type NoseOption,
  type VectorEyeOption
} from './model';

export type FaceAssetLayer = 'mask' | 'details';

export function faceAssetUrl(face: FaceOption, layer: FaceAssetLayer): string {
  return assetUrl(`assets/avatar-parts/face/face-${face}-${layer}.svg`);
}

export const AVATAR_FACE_ASSETS = FACE_OPTIONS.flatMap((face) => [
  faceAssetUrl(face, 'mask'),
  faceAssetUrl(face, 'details')
]);

export function browAssetUrl(brows: BrowOption): string {
  return assetUrl(`assets/avatar-parts/brows/brow-${brows}.svg`);
}

export const AVATAR_BROW_ASSETS = BROW_OPTIONS.map(browAssetUrl);

export type EyeAssetSide = 'left' | 'right';

export function eyeAssetUrl(eyes: VectorEyeOption, side: EyeAssetSide): string {
  return assetUrl(`assets/avatar-parts/eyes/eye-${eyes}-${side}.svg`);
}

export const AVATAR_EYE_ASSETS = VECTOR_EYE_OPTIONS.flatMap((eyes) => [
  eyeAssetUrl(eyes, 'left'),
  eyeAssetUrl(eyes, 'right')
]);

export type NoseAssetLayer = 'mask' | 'details';

export function noseAssetUrl(nose: NoseOption, layer: NoseAssetLayer): string {
  return assetUrl(`assets/avatar-parts/noses/nose-${nose}-${layer}.svg`);
}

export const AVATAR_NOSE_ASSETS = NOSE_OPTIONS.flatMap((nose) => [
  noseAssetUrl(nose, 'mask'),
  noseAssetUrl(nose, 'details')
]);

export function mouthAssetUrl(mouth: MouthOption): string {
  return assetUrl(`assets/avatar-parts/mouths/mouth-${mouth}.svg`);
}

export const AVATAR_MOUTH_ASSETS = MOUTH_OPTIONS.map(mouthAssetUrl);

export function isApprovedHair(hair: HairOption): hair is ApprovedHairOption {
  return APPROVED_HAIR_OPTIONS.includes(hair as ApprovedHairOption);
}

export function approvedHairAssetUrl(hair: ApprovedHairOption): string {
  return assetUrl(`assets/avatar-parts/hair/approved/hair-${hair}.png`);
}

export type LegacyHairAssetLayer = 'mask' | 'details';

export function legacyHairAssetUrl(hair: LegacyHairOption, layer: LegacyHairAssetLayer): string {
  return assetUrl(`assets/avatar-parts/hair/candidates/hair-${hair}-${layer}.svg`);
}

export const AVATAR_HAIR_ASSETS = [
  ...LEGACY_HAIR_OPTIONS.flatMap((hair) => [
    legacyHairAssetUrl(hair, 'mask'),
    legacyHairAssetUrl(hair, 'details')
  ]),
  ...APPROVED_HAIR_OPTIONS.map(approvedHairAssetUrl)
];
