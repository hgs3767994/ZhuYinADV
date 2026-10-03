import type { VectorEyeOption } from './model';

export interface EyeScaleCalibration {
  scaleX: number;
  scaleY: number;
  eyeDistance: number;
}

export const EYE_SCALE_CALIBRATIONS: Record<VectorEyeOption, EyeScaleCalibration> = {
  '01': { scaleX: 0.375, scaleY: 0.412, eyeDistance: 31 },
  '02': { scaleX: 0.362, scaleY: 0.331, eyeDistance: 35 },
  '03': { scaleX: 0.406, scaleY: 0.368, eyeDistance: 15 },
  '04': { scaleX: 0.509, scaleY: 0.509, eyeDistance: 0 },
  '05': { scaleX: 0.356, scaleY: 0.399, eyeDistance: 44 }
};

export function eyeTransform(
  { scaleX, scaleY, eyeDistance }: EyeScaleCalibration,
  side: 'left' | 'right'
): string {
  const direction = side === 'left' ? -1 : 1;
  const horizontalOffset = direction * eyeDistance / 2;
  return `translate(${horizontalOffset} 0) translate(256 263) scale(${scaleX} ${scaleY}) translate(-256 -263)`;
}
