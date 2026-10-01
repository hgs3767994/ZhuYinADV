import type { FaceOption, HairOption } from './model';

export interface HairFaceCalibration {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  faceScale: number;
}

type HairCalibrationMap = Record<HairOption, Record<FaceOption, HairFaceCalibration>>;

const DEFAULT_CALIBRATION: HairFaceCalibration = {
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1,
  faceScale: 1
};

const sameForEveryFace = (calibration: HairFaceCalibration): Record<FaceOption, HairFaceCalibration> => ({
  round: calibration,
  oval: calibration,
  diamond: calibration,
  square01: calibration,
  square02: calibration,
  square03: calibration,
  long01: calibration
});

export const HAIR_FACE_CALIBRATIONS: HairCalibrationMap = {
  '01': sameForEveryFace(DEFAULT_CALIBRATION),
  '02': {
    round: { translateX: -7, translateY: 51, scaleX: 1.322, scaleY: 1.121, faceScale: 0.8 },
    oval: { translateX: -7, translateY: 51, scaleX: 1.17, scaleY: 1.2, faceScale: 0.8 },
    diamond: { translateX: -7, translateY: 46, scaleX: 1.215, scaleY: 1.188, faceScale: 0.8 },
    square01: { translateX: -7, translateY: 40, scaleX: 1.193, scaleY: 1.177, faceScale: 0.75 },
    square02: { translateX: -7, translateY: 34, scaleX: 1.115, scaleY: 1.155, faceScale: 0.668 },
    square03: { translateX: -7, translateY: 35, scaleX: 1.295, scaleY: 1, faceScale: 0.8 },
    long01: { translateX: -6, translateY: 38, scaleX: 1.168, scaleY: 1.108, faceScale: 0.762 }
  },
  '03': {
    round: { translateX: -7, translateY: -11, scaleX: 0.956, scaleY: 0.956, faceScale: 0.674 },
    oval: { translateX: -7, translateY: 0, scaleX: 1, scaleY: 1, faceScale: 0.715 },
    diamond: { translateX: -7, translateY: 0, scaleX: 1, scaleY: 1, faceScale: 0.737 },
    square01: { translateX: -7, translateY: -10, scaleX: 0.988, scaleY: 0.983, faceScale: 0.668 },
    square02: { translateX: -6, translateY: -7, scaleX: 0.997, scaleY: 0.92, faceScale: 0.628 },
    square03: { translateX: -7, translateY: -9, scaleX: 0.991, scaleY: 0.716, faceScale: 0.642 },
    long01: { translateX: -6, translateY: -11, scaleX: 0.914, scaleY: 0.982, faceScale: 0.679 }
  },
  '05': {
    round: { translateX: -3, translateY: -50, scaleX: 1.074, scaleY: 0.827, faceScale: 0.606 },
    oval: { translateX: -3, translateY: -42, scaleX: 0.907, scaleY: 0.86, faceScale: 0.591 },
    diamond: { translateX: -3, translateY: -45, scaleX: 0.934, scaleY: 0.834, faceScale: 0.606 },
    square01: { translateX: -3, translateY: -39, scaleX: 1.028, scaleY: 0.84, faceScale: 0.6 },
    square02: { translateX: -3, translateY: -38, scaleX: 0.901, scaleY: 0.881, faceScale: 0.557 },
    square03: { translateX: -3, translateY: -45, scaleX: 1.068, scaleY: 0.847, faceScale: 0.664 },
    long01: { translateX: -2, translateY: -49, scaleX: 0.954, scaleY: 0.829, faceScale: 0.584 }
  }
};

export function hairTransform(calibration: HairFaceCalibration): string {
  return `translate(${calibration.translateX} ${calibration.translateY}) translate(256 256) scale(${calibration.scaleX} ${calibration.scaleY}) translate(-256 -256)`;
}

export function faceTransform(calibration: HairFaceCalibration): string {
  return `translate(256 256) scale(${calibration.faceScale}) translate(-256 -256)`;
}
