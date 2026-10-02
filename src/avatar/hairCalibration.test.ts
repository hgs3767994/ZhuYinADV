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
});
