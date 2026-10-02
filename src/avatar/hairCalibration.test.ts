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
});
