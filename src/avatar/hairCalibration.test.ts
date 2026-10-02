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
      round: { translateX: -3.058, translateY: -1.437, scaleX: 1.069, scaleY: 1.036 },
      oval: { translateX: -1.522, translateY: 14.502, scaleX: 0.926, scaleY: 1.004 },
      diamond: { translateX: -3, translateY: 6.006, scaleX: 0.991, scaleY: 1 },
      square01: { translateX: -1, translateY: -6.671, scaleX: 1.056, scaleY: 1.153 },
      square02: { translateX: -2.284, translateY: 0.097, scaleX: 1.017, scaleY: 1.14 },
      long01: { translateX: -3.236, translateY: -8.836, scaleX: 0.991, scaleY: 1.044 }
    });
  });
});
