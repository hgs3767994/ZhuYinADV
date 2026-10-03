import type { MouthOption } from './model';

export interface MouthCalibration {
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
}

export const MOUTH_CALIBRATIONS: Record<MouthOption, MouthCalibration> = {
  '01': { scaleX: 0.561, scaleY: 0.561, translateX: 0, translateY: 1 },
  '02': { scaleX: 0.806, scaleY: 0.806, translateX: 0, translateY: 0 },
  '04': { scaleX: 0.66, scaleY: 0.66, translateX: 0, translateY: 0 },
  '05': { scaleX: 0.695, scaleY: 0.695, translateX: 0, translateY: 5 },
  '06': { scaleX: 0.818, scaleY: 0.818, translateX: 0, translateY: 9 },
  '07': { scaleX: 0.73, scaleY: 0.73, translateX: 0, translateY: 5 },
  '08': { scaleX: 0.619, scaleY: 0.432, translateX: 0, translateY: 0 },
  '10': { scaleX: 0.648, scaleY: 0.648, translateX: 0, translateY: 9 },
  '14': { scaleX: 0.567, scaleY: 0.567, translateX: 0, translateY: 8 }
};

export function mouthTransform({
  scaleX,
  scaleY,
  translateX,
  translateY
}: MouthCalibration): string {
  return `translate(${translateX} ${translateY}) translate(256 356) scale(${scaleX} ${scaleY}) translate(-256 -356)`;
}
