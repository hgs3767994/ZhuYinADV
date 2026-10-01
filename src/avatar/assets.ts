import { assetUrl } from '../utils/assets';
import { FACE_OPTIONS, HAIR_OPTIONS, type FaceOption, type HairOption } from './model';

export type FaceAssetLayer = 'mask' | 'details';

export function faceAssetUrl(face: FaceOption, layer: FaceAssetLayer): string {
  return assetUrl(`assets/avatar-parts/face/face-${face}-${layer}.svg`);
}

export const AVATAR_FACE_ASSETS = FACE_OPTIONS.flatMap((face) => [
  faceAssetUrl(face, 'mask'),
  faceAssetUrl(face, 'details')
]);

export function hairAssetUrl(hair: HairOption): string {
  return assetUrl(`assets/avatar-parts/hair/approved/hair-${hair}.png`);
}

export const AVATAR_HAIR_ASSETS = HAIR_OPTIONS.map(hairAssetUrl);
