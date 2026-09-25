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

export type HairAssetLayer = 'mask' | 'details' | 'back-mask' | 'back-details';

export function hairAssetUrl(hair: HairOption, layer: HairAssetLayer): string {
  return assetUrl(`assets/avatar-parts/hair/candidates/hair-${hair}-${layer}.svg`);
}

export function hairHasBackLayer(hair: HairOption): boolean {
  return hair === 'a05';
}

export const AVATAR_HAIR_ASSETS = HAIR_OPTIONS.flatMap((hair) => {
  const front = [hairAssetUrl(hair, 'mask'), hairAssetUrl(hair, 'details')];
  return hairHasBackLayer(hair)
    ? [...front, hairAssetUrl(hair, 'back-mask'), hairAssetUrl(hair, 'back-details')]
    : front;
});
