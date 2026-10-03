import { describe, expect, it } from 'vitest';
import { MOUTH_OPTIONS } from './model';
import { MOUTH_CALIBRATIONS, mouthTransform } from './mouthCalibration';

describe('mouth calibration', () => {
  it('contains the exported calibration for every retained mouth', () => {
    expect(Object.keys(MOUTH_CALIBRATIONS).sort()).toEqual([...MOUTH_OPTIONS].sort());
    expect(MOUTH_CALIBRATIONS['01']).toEqual({
      scaleX: 0.561,
      scaleY: 0.561,
      translateX: 0,
      translateY: 1
    });
    expect(MOUTH_CALIBRATIONS['14']).toEqual({
      scaleX: 0.567,
      scaleY: 0.567,
      translateX: 0,
      translateY: 8
    });
  });

  it('applies position before scaling around the mouth calibration origin', () => {
    expect(mouthTransform(MOUTH_CALIBRATIONS['08'])).toBe(
      'translate(0 0) translate(256 356) scale(0.619 0.432) translate(-256 -356)'
    );
  });
});
