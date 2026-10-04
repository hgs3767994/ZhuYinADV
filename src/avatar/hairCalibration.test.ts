import { describe, expect, it } from 'vitest';
import { APPROVED_HAIR_OPTIONS, FACE_OPTIONS } from './model';
import {
  HAIR_FACE_CALIBRATIONS,
  faceTransform,
  hairTransform
} from './hairCalibration';

describe('approved hair calibration', () => {
  it('contains one calibration for every approved hair and face combination', () => {
    for (const hair of APPROVED_HAIR_OPTIONS) {
      expect(Object.keys(HAIR_FACE_CALIBRATIONS[hair])).toEqual([...FACE_OPTIONS]);
      for (const face of FACE_OPTIONS) {
        expect(HAIR_FACE_CALIBRATIONS[hair][face]).not.toHaveProperty('faceScale');
      }
    }
  });

  it('uses hair-only calibration with one canonical face transform', () => {
    const calibration = HAIR_FACE_CALIBRATIONS['02'].round;
    expect(hairTransform(calibration)).toBe(
      'translate(-5.6875 73.405) translate(256 256) scale(1.0741 1.093) translate(-256 -256)'
    );
    expect(faceTransform()).toBe('matrix(.65 0 0 .78 89.6 80)');
  });

  it('uses the confirmed per-face calibration for hairstyle 11 (asset 01)', () => {
    expect(HAIR_FACE_CALIBRATIONS['01']).toEqual({
      round: { translateX: -9, translateY: -7, scaleX: 0.92, scaleY: 0.946 },
      oval: { translateX: -9, translateY: -2, scaleX: 0.835, scaleY: 0.994 },
      diamond: { translateX: -9, translateY: -6, scaleX: 0.855, scaleY: 0.983 },
      square01: { translateX: -9, translateY: -6, scaleX: 0.933, scaleY: 0.985 },
      square02: { translateX: -9, translateY: -7, scaleX: 0.91, scaleY: 1.01 },
      long01: { translateX: -9, translateY: -7, scaleX: 0.752, scaleY: 0.947 }
    });
  });

  it('normalizes hairstyle 7 face scaling into its hair transform', () => {
    expect(HAIR_FACE_CALIBRATIONS['07']).toEqual({
      round: { translateX: -2.5031, translateY: 82.6033, scaleX: 1.1076, scaleY: 1.1214 },
      oval: { translateX: -2.5126, translateY: 85.4271, scaleX: 1.0415, scaleY: 1.2563 },
      diamond: { translateX: -2.5031, translateY: 66.3329, scaleX: 1.1865, scaleY: 1.2516 },
      square01: { translateX: -2.5063, translateY: 73.9348, scaleX: 1.1654, scaleY: 1.1328 },
      square02: { translateX: 1.2642, translateY: 73.3249, scaleX: 1.1896, scaleY: 1.2288 },
      long01: { translateX: -2.4881, translateY: 71.3392, scaleX: 1.0538, scaleY: 1.2516 }
    });
  });

  it('uses the confirmed per-face calibration for hairstyle 8', () => {
    expect(HAIR_FACE_CALIBRATIONS['08']).toEqual({
      round: { translateX: -3, translateY: -26, scaleX: 0.907, scaleY: 0.901 },
      oval: { translateX: -2, translateY: -15, scaleX: 0.794, scaleY: 0.909 },
      diamond: { translateX: -2, translateY: -25, scaleX: 0.859, scaleY: 0.9 },
      square01: { translateX: 0, translateY: -42, scaleX: 0.901, scaleY: 1.043 },
      square02: { translateX: 1, translateY: -43, scaleX: 0.899, scaleY: 1.084 },
      long01: { translateX: -2, translateY: -17, scaleX: 0.793, scaleY: 0.856 }
    });
  });

  it('uses the confirmed per-face calibration for hairstyle 9', () => {
    expect(HAIR_FACE_CALIBRATIONS['09']).toEqual({
      round: { translateX: 60.8, translateY: -8.16, scaleX: 1.134, scaleY: 1.101 },
      oval: { translateX: 58.083, translateY: -5.209, scaleX: 1.017, scaleY: 1.114 },
      diamond: { translateX: 57.297, translateY: -8.581, scaleX: 1.095, scaleY: 1.036 },
      square01: { translateX: 65.793, translateY: 9.39, scaleX: 1.159, scaleY: 1 },
      square02: { translateX: 63.557, translateY: -9.463, scaleX: 1.166, scaleY: 1.153 },
      long01: { translateX: 58.107, translateY: -16.508, scaleX: 1.049, scaleY: 1.062 }
    });
  });

  it('uses the confirmed per-face calibration for hairstyle 11', () => {
    expect(HAIR_FACE_CALIBRATIONS['11']).toEqual({
      round: { translateX: 0, translateY: -19, scaleX: 1.043, scaleY: 1.153 },
      oval: { translateX: -3.308, translateY: -27.891, scaleX: 0.993, scaleY: 1.237 },
      diamond: { translateX: -3, translateY: -27, scaleX: 1, scaleY: 1.172 },
      square01: { translateX: -4, translateY: -32.671, scaleX: 1.056, scaleY: 1.353 },
      square02: { translateX: -4.511, translateY: -28.613, scaleX: 1.017, scaleY: 1.308 },
      long01: { translateX: -3.236, translateY: -27.836, scaleX: 0.991, scaleY: 1.211 }
    });
  });

  it('uses the confirmed per-face calibration for new hairstyle 01', () => {
    expect(HAIR_FACE_CALIBRATIONS.c01).toEqual({
      round: { translateX: 0, translateY: -91, scaleX: 0.794, scaleY: 0.732 },
      oval: { translateX: 0, translateY: -91, scaleX: 0.674, scaleY: 0.732 },
      diamond: { translateX: 0, translateY: -91, scaleX: 0.732, scaleY: 0.732 },
      square01: { translateX: 0, translateY: -91, scaleX: 0.743, scaleY: 0.732 },
      square02: { translateX: 0, translateY: -91, scaleX: 0.749, scaleY: 0.732 },
      long01: { translateX: 0, translateY: -91, scaleX: 0.693, scaleY: 0.732 }
    });
  });

  it('uses the confirmed per-face calibration for new hairstyle 02', () => {
    expect(HAIR_FACE_CALIBRATIONS.c02).toEqual({
      round: { translateX: 0, translateY: -57, scaleX: 0.726, scaleY: 0.7 },
      oval: { translateX: 0, translateY: -57, scaleX: 0.642, scaleY: 0.7 },
      diamond: { translateX: 0, translateY: -57, scaleX: 0.687, scaleY: 0.7 },
      square01: { translateX: 0, translateY: -57, scaleX: 0.726, scaleY: 0.7 },
      square02: { translateX: 0, translateY: -57, scaleX: 0.7, scaleY: 0.7 },
      long01: { translateX: 0, translateY: -57, scaleX: 0.635, scaleY: 0.7 }
    });
  });

  it('uses the confirmed per-face calibration for new hairstyle 03', () => {
    expect(HAIR_FACE_CALIBRATIONS.c03).toEqual({
      round: { translateX: 2, translateY: -46, scaleX: 0.739, scaleY: 0.71 },
      oval: { translateX: 2, translateY: -46, scaleX: 0.66, scaleY: 0.71 },
      diamond: { translateX: 2, translateY: -46, scaleX: 0.692, scaleY: 0.71 },
      square01: { translateX: 3, translateY: -50, scaleX: 0.766, scaleY: 0.71 },
      square02: { translateX: 2, translateY: -46, scaleX: 0.738, scaleY: 0.71 },
      long01: { translateX: 2, translateY: -46, scaleX: 0.638, scaleY: 0.71 }
    });
  });

  it('uses the confirmed per-face calibration for new hairstyle 04', () => {
    expect(HAIR_FACE_CALIBRATIONS.c04).toEqual({
      round: { translateX: -1, translateY: -38, scaleX: 0.762, scaleY: 0.762 },
      oval: { translateX: -1, translateY: -38, scaleX: 0.681, scaleY: 0.762 },
      diamond: { translateX: -1, translateY: -38, scaleX: 0.713, scaleY: 0.762 },
      square01: { translateX: -1, translateY: -45, scaleX: 0.778, scaleY: 0.762 },
      square02: { translateX: -1, translateY: -38, scaleX: 0.749, scaleY: 0.762 },
      long01: { translateX: -1, translateY: -38, scaleX: 0.663, scaleY: 0.762 }
    });
  });

  it('uses the confirmed per-face calibration for new hairstyle 05', () => {
    expect(HAIR_FACE_CALIBRATIONS.c05).toEqual({
      round: { translateX: 0, translateY: -59, scaleX: 0.814, scaleY: 0.814 },
      oval: { translateX: 0, translateY: -59, scaleX: 0.706, scaleY: 0.814 },
      diamond: { translateX: 0, translateY: -59, scaleX: 0.752, scaleY: 0.814 },
      square01: { translateX: -1, translateY: -62, scaleX: 0.787, scaleY: 0.814 },
      square02: { translateX: 0, translateY: -59, scaleX: 0.778, scaleY: 0.814 },
      long01: { translateX: 0, translateY: -59, scaleX: 0.713, scaleY: 0.814 }
    });
  });

  it('uses the confirmed per-face calibration for new hairstyle 06', () => {
    expect(HAIR_FACE_CALIBRATIONS.c06).toEqual({
      round: { translateX: 0, translateY: -59, scaleX: 0.719, scaleY: 0.719 },
      oval: { translateX: 0, translateY: -59, scaleX: 0.646, scaleY: 0.719 },
      diamond: { translateX: 0, translateY: -59, scaleX: 0.673, scaleY: 0.719 },
      square01: { translateX: 0, translateY: -59, scaleX: 0.697, scaleY: 0.719 },
      square02: { translateX: 0, translateY: -59, scaleX: 0.7, scaleY: 0.719 },
      long01: { translateX: 0, translateY: -59, scaleX: 0.633, scaleY: 0.719 }
    });
  });

  it('uses the confirmed per-face calibration for new hairstyle 07', () => {
    expect(HAIR_FACE_CALIBRATIONS.c07).toEqual({
      round: { translateX: -3, translateY: -50, scaleX: 0.823, scaleY: 0.823 },
      oval: { translateX: -3, translateY: -50, scaleX: 0.722, scaleY: 0.823 },
      diamond: { translateX: -3, translateY: -50, scaleX: 0.77, scaleY: 0.823 },
      square01: { translateX: -3, translateY: -52, scaleX: 0.784, scaleY: 0.823 },
      square02: { translateX: -3, translateY: -50, scaleX: 0.781, scaleY: 0.823 },
      long01: { translateX: -3, translateY: -50, scaleX: 0.719, scaleY: 0.823 }
    });
  });

  it('uses the confirmed per-face calibration for new hairstyle 08', () => {
    expect(HAIR_FACE_CALIBRATIONS.c08).toEqual({
      round: { translateX: 2, translateY: -9, scaleX: 0.71, scaleY: 0.71 },
      oval: { translateX: 2, translateY: -9, scaleX: 0.64, scaleY: 0.71 },
      diamond: { translateX: 2, translateY: -9, scaleX: 0.67, scaleY: 0.71 },
      square01: { translateX: 3, translateY: -13, scaleX: 0.74, scaleY: 0.71 },
      square02: { translateX: 4, translateY: -9, scaleX: 0.7, scaleY: 0.71 },
      long01: { translateX: 2, translateY: -9, scaleX: 0.63, scaleY: 0.71 }
    });
  });
});
