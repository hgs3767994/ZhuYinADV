import { describe, expect, it } from 'vitest';
import { EYE_SCALE_CALIBRATIONS, eyeTransform } from './eyeCalibration';
import { VECTOR_EYE_OPTIONS } from './model';

describe('vector eye calibration', () => {
  it('contains one shared all-face calibration for every vector eye', () => {
    expect(Object.keys(EYE_SCALE_CALIBRATIONS)).toEqual([...VECTOR_EYE_OPTIONS]);
    expect(EYE_SCALE_CALIBRATIONS).toEqual({
      '01': { scaleX: 0.375, scaleY: 0.412, eyeDistance: 31 },
      '02': { scaleX: 0.362, scaleY: 0.331, eyeDistance: 35 },
      '03': { scaleX: 0.406, scaleY: 0.368, eyeDistance: 15 },
      '04': { scaleX: 0.509, scaleY: 0.509, eyeDistance: 0 },
      '05': { scaleX: 0.356, scaleY: 0.399, eyeDistance: 44 }
    });
  });

  it('moves isolated eyes symmetrically around the fixed eye center', () => {
    expect(eyeTransform(EYE_SCALE_CALIBRATIONS['03'], 'left')).toBe(
      'translate(-7.5 0) translate(256 263) scale(0.406 0.368) translate(-256 -263)'
    );
    expect(eyeTransform(EYE_SCALE_CALIBRATIONS['03'], 'right')).toBe(
      'translate(7.5 0) translate(256 263) scale(0.406 0.368) translate(-256 -263)'
    );
  });
});
