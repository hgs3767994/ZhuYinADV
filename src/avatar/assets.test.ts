import { describe, expect, it } from 'vitest';
import { AVATAR_FACE_ASSETS, faceAssetUrl } from './assets';
import { FACE_OPTIONS } from './model';

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
});
