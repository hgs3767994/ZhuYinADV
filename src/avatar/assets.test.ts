import { describe, expect, it } from 'vitest';
import {
  AVATAR_FACE_ASSETS,
  AVATAR_HAIR_ASSETS,
  faceAssetUrl,
  hairAssetUrl
} from './assets';
import { FACE_OPTIONS, HAIR_OPTIONS } from './model';

describe('avatar face assets', () => {
  it('maps every face to one mask and one details SVG', () => {
    expect(AVATAR_FACE_ASSETS).toHaveLength(FACE_OPTIONS.length * 2);

    for (const face of FACE_OPTIONS) {
      for (const layer of ['mask', 'details'] as const) {
        expect(faceAssetUrl(face, layer)).toMatch(
          new RegExp(`assets/avatar-parts/face/face-${face}-${layer}\\.svg$`)
        );
      }
    }
  });

  it('maps every approved hairstyle to one calibrated transparent PNG', () => {
    expect(AVATAR_HAIR_ASSETS).toHaveLength(HAIR_OPTIONS.length);
    for (const hair of HAIR_OPTIONS) {
      expect(hairAssetUrl(hair)).toMatch(
        new RegExp(`assets/avatar-parts/hair/approved/hair-${hair}\\.png$`)
      );
    }
  });
});
