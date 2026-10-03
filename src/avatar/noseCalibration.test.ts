import { describe, expect, it } from 'vitest';
import { NOSE_OPTIONS } from './model';
import { NOSE_SCALE_CALIBRATIONS, noseTransform } from './noseCalibration';

describe('nose calibration', () => {
  it('contains the exported calibration for every nose', () => {
    expect(Object.keys(NOSE_SCALE_CALIBRATIONS)).toEqual([...NOSE_OPTIONS]);
    expect(NOSE_SCALE_CALIBRATIONS['01']).toEqual({
      scaleX: 0.577,
      scaleY: 0.577,
      translateY: -9
    });
    expect(NOSE_SCALE_CALIBRATIONS['08']).toEqual({
      scaleX: 0.329,
      scaleY: 0.595,
      translateY: -28
    });
  });

  it('applies vertical position before scaling around the calibration origin', () => {
    expect(noseTransform(NOSE_SCALE_CALIBRATIONS['06'])).toBe(
      'translate(0 -21) translate(256 315) scale(0.391 0.521) translate(-256 -315)'
    );
  });
});
