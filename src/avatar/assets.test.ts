import { describe, expect, it } from 'vitest';
import {
  AVATAR_FACE_ASSETS,
  AVATAR_HAIR_ASSETS,
  approvedHairAssetUrl,
  faceAssetUrl,
  legacyHairAssetUrl
} from './assets';
import { APPROVED_HAIR_OPTIONS, FACE_OPTIONS, LEGACY_HAIR_OPTIONS } from './model';

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

  it('maps every calibrated hairstyle to one transparent PNG', () => {
    for (const hair of APPROVED_HAIR_OPTIONS) {
      expect(approvedHairAssetUrl(hair)).toMatch(
        new RegExp(`assets/avatar-parts/hair/approved/hair-${hair}\\.png$`)
      );
    }
  });

  it('maps every existing hairstyle to its original SVG layers', () => {
    const expectedLegacyAssets = LEGACY_HAIR_OPTIONS.length * 2;
    expect(AVATAR_HAIR_ASSETS).toHaveLength(
      expectedLegacyAssets + APPROVED_HAIR_OPTIONS.length
    );
    for (const hair of LEGACY_HAIR_OPTIONS) {
      expect(legacyHairAssetUrl(hair, 'mask')).toMatch(
        new RegExp(`assets/avatar-parts/hair/candidates/hair-${hair}-mask\\.svg$`)
      );
      expect(legacyHairAssetUrl(hair, 'details')).toMatch(
        new RegExp(`assets/avatar-parts/hair/candidates/hair-${hair}-details\\.svg$`)
      );
    }
  });
});
