import { assetUrl } from '../utils/assets';
import {
  APPROVED_HAIR_OPTIONS,
  FACE_OPTIONS,
  LEGACY_HAIR_OPTIONS,
  type ApprovedHairOption,
  type FaceOption,
  type HairOption,
  type LegacyHairOption
} from './model';

export type FaceAssetLayer = 'mask' | 'details';

export function faceAssetUrl(face: FaceOption, layer: FaceAssetLayer): string {
  return assetUrl(`assets/avatar-parts/face/face-${face}-${layer}.svg`);
}

export const AVATAR_FACE_ASSETS = FACE_OPTIONS.flatMap((face) => [
  faceAssetUrl(face, 'mask'),
  faceAssetUrl(face, 'details')
]);

export function isApprovedHair(hair: HairOption): hair is ApprovedHairOption {
  return APPROVED_HAIR_OPTIONS.includes(hair as ApprovedHairOption);
}

export function approvedHairAssetUrl(hair: ApprovedHairOption): string {
  return assetUrl(`assets/avatar-parts/hair/approved/hair-${hair}.png`);
}

export type LegacyHairAssetLayer = 'mask' | 'details' | 'back-mask' | 'back-details';

export function legacyHairAssetUrl(hair: LegacyHairOption, layer: LegacyHairAssetLayer): string {
  return assetUrl(`assets/avatar-parts/hair/candidates/hair-${hair}-${layer}.svg`);
}

export function legacyHairHasBackLayer(hair: LegacyHairOption): boolean {
  return hair === 'a05';
}

export const AVATAR_HAIR_ASSETS = [
  ...LEGACY_HAIR_OPTIONS.flatMap((hair) => {
    const front = [legacyHairAssetUrl(hair, 'mask'), legacyHairAssetUrl(hair, 'details')];
    return legacyHairHasBackLayer(hair)
      ? [...front, legacyHairAssetUrl(hair, 'back-mask'), legacyHairAssetUrl(hair, 'back-details')]
      : front;
  }),
  ...APPROVED_HAIR_OPTIONS.map(approvedHairAssetUrl)
];
