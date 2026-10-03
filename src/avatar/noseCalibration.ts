import type { NoseOption } from './model';

export interface NoseScaleCalibration {
  scaleX: number;
  scaleY: number;
  translateY: number;
}

export const NOSE_SCALE_CALIBRATIONS: Record<NoseOption, NoseScaleCalibration> = {
  '01': { scaleX: 0.577, scaleY: 0.577, translateY: -9 },
  '02': { scaleX: 0.3, scaleY: 0.397, translateY: -5 },
  '03': { scaleX: 0.322, scaleY: 0.322, translateY: -8 },
  '04': { scaleX: 0.316, scaleY: 0.465, translateY: -14 },
  '05': { scaleX: 0.428, scaleY: 0.806, translateY: -11 },
  '06': { scaleX: 0.391, scaleY: 0.521, translateY: -21 },
  '07': { scaleX: 0.602, scaleY: 0.676, translateY: -21 },
  '08': { scaleX: 0.329, scaleY: 0.595, translateY: -28 }
};

export function noseTransform({
  scaleX,
  scaleY,
  translateY
}: NoseScaleCalibration): string {
  return `translate(0 ${translateY}) translate(256 315) scale(${scaleX} ${scaleY}) translate(-256 -315)`;
}
