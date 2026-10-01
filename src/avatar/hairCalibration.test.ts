import { describe, expect, it } from 'vitest';
import { FACE_OPTIONS, HAIR_OPTIONS } from './model';
import {
  HAIR_FACE_CALIBRATIONS,
  faceTransform,
  hairTransform
} from './hairCalibration';

describe('approved hair calibration', () => {
  it('contains one calibration for every approved hair and face combination', () => {
    for (const hair of HAIR_OPTIONS) {
      expect(Object.keys(HAIR_FACE_CALIBRATIONS[hair])).toEqual([...FACE_OPTIONS]);
    }
  });

  it('preserves the exact transform order exported by the calibration tool', () => {
    const calibration = HAIR_FACE_CALIBRATIONS['02'].round;
    expect(hairTransform(calibration)).toBe(
      'translate(-7 51) translate(256 256) scale(1.322 1.121) translate(-256 -256)'
    );
    expect(faceTransform(calibration)).toBe(
      'translate(256 256) scale(0.8) translate(-256 -256)'
    );
  });
});
