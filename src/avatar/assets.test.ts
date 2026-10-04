import { describe, expect, it } from 'vitest';
import {
  AVATAR_FACE_ASSETS,
  AVATAR_BROW_ASSETS,
  AVATAR_EYE_ASSETS,
  AVATAR_HAIR_ASSETS,
  AVATAR_MOUTH_ASSETS,
  AVATAR_NOSE_ASSETS,
  approvedHairAssetUrl,
  browAssetUrl,
  eyeAssetUrl,
  faceAssetUrl,
  mouthAssetUrl,
  noseAssetUrl
} from './assets';
import { APPROVED_HAIR_OPTIONS, FACE_OPTIONS, MOUTH_OPTIONS, NOSE_OPTIONS, VECTOR_BROW_OPTIONS, VECTOR_EYE_OPTIONS } from './model';

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

  it('maps every calibrated hairstyle to its transparent asset', () => {
    for (const hair of APPROVED_HAIR_OPTIONS) {
      expect(approvedHairAssetUrl(hair)).toMatch(
        new RegExp(`assets/avatar-parts/hair/approved/hair-${hair}\\.${hair.startsWith('c') ? 'svg' : 'png'}$`)
      );
    }
  });

  it('maps every eyebrow to one vector SVG', () => {
    expect(AVATAR_BROW_ASSETS).toHaveLength(VECTOR_BROW_OPTIONS.length);
    for (const brows of VECTOR_BROW_OPTIONS) {
      expect(browAssetUrl(brows)).toMatch(
        new RegExp(`assets/avatar-parts/brows/brow-${brows}\\.svg$`)
      );
    }
  });

  it('maps every calibrated vector eye to isolated left and right SVGs', () => {
    expect(AVATAR_EYE_ASSETS).toHaveLength(VECTOR_EYE_OPTIONS.length * 2);
    for (const eyes of VECTOR_EYE_OPTIONS) {
      for (const side of ['left', 'right'] as const) {
        expect(eyeAssetUrl(eyes, side)).toMatch(
          new RegExp(`assets/avatar-parts/eyes/eye-${eyes}-${side}\\.svg$`)
        );
      }
    }
  });

  it('maps every calibrated vector nose to a mask and details SVG', () => {
    expect(AVATAR_NOSE_ASSETS).toHaveLength(NOSE_OPTIONS.length * 2);
    for (const nose of NOSE_OPTIONS) {
      for (const layer of ['mask', 'details'] as const) {
        expect(noseAssetUrl(nose, layer)).toMatch(
          new RegExp(`assets/avatar-parts/noses/nose-${nose}-${layer}\\.svg$`)
        );
      }
    }
  });

  it('maps every calibrated vector mouth to one SVG', () => {
    expect(AVATAR_MOUTH_ASSETS).toHaveLength(MOUTH_OPTIONS.length);
    for (const mouth of MOUTH_OPTIONS) {
      expect(mouthAssetUrl(mouth)).toMatch(
        new RegExp(`assets/avatar-parts/mouths/mouth-${mouth}\\.svg$`)
      );
    }
  });

  it('preloads only the retained calibrated hairstyles', () => {
    expect(AVATAR_HAIR_ASSETS).toHaveLength(APPROVED_HAIR_OPTIONS.length);
    expect(AVATAR_HAIR_ASSETS.every((asset) => asset.includes('/hair/approved/'))).toBe(true);
  });
});
