import type { ApprovedHairOption, FaceOption } from './model';

export interface HairFaceCalibration {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  faceScale?: number;
}

type HairCalibrationMap = Record<ApprovedHairOption, Record<FaceOption, HairFaceCalibration>>;

// This is the accepted head layout used by the original hairstyles. Keeping one
// canonical face transform makes neck width and head size independent of hair.
export const CANONICAL_FACE_TRANSFORM = 'matrix(.65 0 0 .78 89.6 80)';

export const HAIR_FACE_CALIBRATIONS: HairCalibrationMap = {
  '01': {
    round: { translateX: -9, translateY: -11, scaleX: 0.836, scaleY: 0.875, faceScale: 0.9 },
    oval: { translateX: -9, translateY: -11, scaleX: 0.766, scaleY: 0.921, faceScale: 0.9 },
    diamond: { translateX: -9, translateY: -11, scaleX: 0.787, scaleY: 0.889, faceScale: 0.9 },
    square01: { translateX: -9, translateY: -11, scaleX: 0.831, scaleY: 0.879, faceScale: 0.9 },
    square02: { translateX: -9, translateY: -11, scaleX: 0.834, scaleY: 0.913, faceScale: 0.9 },
    long01: { translateX: -9, translateY: -11, scaleX: 0.719, scaleY: 0.886, faceScale: 0.9 }
  },
  '02': {
    round: { translateX: -4.01, translateY: 63.36, scaleX: 0.849, scaleY: 0.849, faceScale: 0.85 },
    oval: { translateX: -4, translateY: 63, scaleX: 0.81, scaleY: 0.886, faceScale: 0.85 },
    diamond: { translateX: -4, translateY: 63, scaleX: 0.816, scaleY: 0.849, faceScale: 0.85 },
    square01: { translateX: -4, translateY: 63, scaleX: 0.875, scaleY: 0.868, faceScale: 0.85 },
    square02: { translateX: -4, translateY: 63.381, scaleX: 0.897, scaleY: 0.988, faceScale: 0.85 },
    long01: { translateX: -4, translateY: 62.578, scaleX: 0.784, scaleY: 0.849, faceScale: 0.85 }
  },
  '03': {
    round: { translateX: -4, translateY: 30, scaleX: 0.763, scaleY: 0.843, faceScale: 0.9 },
    oval: { translateX: -3, translateY: 30, scaleX: 0.791, scaleY: 0.868, faceScale: 0.9 },
    diamond: { translateX: -3, translateY: 30, scaleX: 0.804, scaleY: 0.859, faceScale: 0.9 },
    square01: { translateX: -3, translateY: 30, scaleX: 0.816, scaleY: 0.816, faceScale: 0.9 },
    square02: { translateX: -3, translateY: 30, scaleX: 0.82, scaleY: 0.864, faceScale: 0.9 },
    long01: { translateX: -5, translateY: 30, scaleX: 0.74, scaleY: 0.848, faceScale: 0.9 }
  },
  '05': {
    round: { translateX: -3.526, translateY: -23, scaleX: 0.883, scaleY: 0.919, faceScale: 0.9 },
    oval: { translateX: -4, translateY: -22, scaleX: 0.881, scaleY: 0.909, faceScale: 0.9 },
    diamond: { translateX: -4, translateY: -23, scaleX: 0.883, scaleY: 0.912, faceScale: 0.9 },
    square01: { translateX: -2.988, translateY: -18.483, scaleX: 1.017, scaleY: 0.907, faceScale: 0.9 },
    square02: { translateX: -3, translateY: -18, scaleX: 0.985, scaleY: 0.946, faceScale: 0.9 },
    long01: { translateX: -4, translateY: -23, scaleX: 0.894, scaleY: 0.888, faceScale: 0.9 }
  },
  '07': {
    round: { translateX: -0.357, translateY: 56.409, scaleX: 0.991, scaleY: 0.991, faceScale: 0.85 },
    oval: { translateX: 0.024, translateY: 64, scaleX: 0.908, scaleY: 1.011, faceScale: 0.85 },
    diamond: { translateX: 0, translateY: 59, scaleX: 0.955, scaleY: 0.975, faceScale: 0.85 },
    square01: { translateX: -2, translateY: 60.892, scaleX: 0.98, scaleY: 1.056, faceScale: 0.85 },
    square02: { translateX: -2, translateY: 64, scaleX: 0.98, scaleY: 1.064, faceScale: 0.85 },
    long01: { translateX: 0, translateY: 59, scaleX: 0.928, scaleY: 0.928, faceScale: 0.85 }
  },
  '08': {
    round: { translateX: -3, translateY: -26, scaleX: 0.907, scaleY: 0.901 },
    oval: { translateX: -2, translateY: -15, scaleX: 0.794, scaleY: 0.909 },
    diamond: { translateX: -2, translateY: -25, scaleX: 0.859, scaleY: 0.9 },
    square01: { translateX: 0, translateY: -42, scaleX: 0.901, scaleY: 1.043 },
    square02: { translateX: 1, translateY: -43, scaleX: 0.899, scaleY: 1.084 },
    long01: { translateX: -2, translateY: -17, scaleX: 0.793, scaleY: 0.856 }
  },
  '09': {
    round: { translateX: 51.926, translateY: -23.525, scaleX: 0.961, scaleY: 0.961, faceScale: 0.85 },
    oval: { translateX: 46, translateY: -14, scaleX: 0.875, scaleY: 0.972, faceScale: 0.85 },
    diamond: { translateX: 52, translateY: -24, scaleX: 0.961, scaleY: 0.961, faceScale: 0.85 },
    square01: { translateX: 53, translateY: -20.522, scaleX: 0.962, scaleY: 1.03, faceScale: 0.85 },
    square02: { translateX: 53, translateY: -18, scaleX: 0.962, scaleY: 1.04, faceScale: 0.85 },
    long01: { translateX: 49, translateY: -22, scaleX: 0.925, scaleY: 0.925, faceScale: 0.85 }
  },
  '11': {
    round: { translateX: -3.996, translateY: -15.317, scaleX: 0.901, scaleY: 0.985, faceScale: 0.85 },
    oval: { translateX: -1.749, translateY: -17.296, scaleX: 0.823, scaleY: 0.985, faceScale: 0.85 },
    diamond: { translateX: -3, translateY: -19, scaleX: 0.862, scaleY: 0.959, faceScale: 0.85 },
    square01: { translateX: 0.012, translateY: -16.912, scaleX: 0.9, scaleY: 0.999, faceScale: 0.84 },
    square02: { translateX: -0.94, translateY: -19.525, scaleX: 0.933, scaleY: 1.03, faceScale: 0.85 },
    long01: { translateX: -3.236, translateY: -18.836, scaleX: 0.873, scaleY: 0.918, faceScale: 0.85 }
  },
  'c01': {
    round: { translateX: 0, translateY: -91, scaleX: 0.794, scaleY: 0.732 },
    oval: { translateX: 0, translateY: -91, scaleX: 0.674, scaleY: 0.732 },
    diamond: { translateX: 0, translateY: -91, scaleX: 0.732, scaleY: 0.732 },
    square01: { translateX: 0, translateY: -91, scaleX: 0.743, scaleY: 0.732 },
    square02: { translateX: 0, translateY: -91, scaleX: 0.749, scaleY: 0.732 },
    long01: { translateX: 0, translateY: -91, scaleX: 0.693, scaleY: 0.732 }
  },
  'c02': {
    round: { translateX: 0, translateY: -57, scaleX: 0.726, scaleY: 0.7 },
    oval: { translateX: 0, translateY: -57, scaleX: 0.642, scaleY: 0.7 },
    diamond: { translateX: 0, translateY: -57, scaleX: 0.687, scaleY: 0.7 },
    square01: { translateX: 0, translateY: -57, scaleX: 0.726, scaleY: 0.7 },
    square02: { translateX: 0, translateY: -57, scaleX: 0.7, scaleY: 0.7 },
    long01: { translateX: 0, translateY: -57, scaleX: 0.635, scaleY: 0.7 }
  },
  'c03': {
    round: { translateX: 2, translateY: -46, scaleX: 0.739, scaleY: 0.71 },
    oval: { translateX: 2, translateY: -46, scaleX: 0.66, scaleY: 0.71 },
    diamond: { translateX: 2, translateY: -46, scaleX: 0.692, scaleY: 0.71 },
    square01: { translateX: 3, translateY: -50, scaleX: 0.766, scaleY: 0.71 },
    square02: { translateX: 2, translateY: -46, scaleX: 0.738, scaleY: 0.71 },
    long01: { translateX: 2, translateY: -46, scaleX: 0.638, scaleY: 0.71 }
  },
  'c04': {
    round: { translateX: -1, translateY: -38, scaleX: 0.762, scaleY: 0.762 },
    oval: { translateX: -1, translateY: -38, scaleX: 0.681, scaleY: 0.762 },
    diamond: { translateX: -1, translateY: -38, scaleX: 0.713, scaleY: 0.762 },
    square01: { translateX: -1, translateY: -45, scaleX: 0.778, scaleY: 0.762 },
    square02: { translateX: -1, translateY: -38, scaleX: 0.749, scaleY: 0.762 },
    long01: { translateX: -1, translateY: -38, scaleX: 0.663, scaleY: 0.762 }
  },
  'c05': {
    round: { translateX: 0, translateY: -59, scaleX: 0.814, scaleY: 0.814 },
    oval: { translateX: 0, translateY: -59, scaleX: 0.706, scaleY: 0.814 },
    diamond: { translateX: 0, translateY: -59, scaleX: 0.752, scaleY: 0.814 },
    square01: { translateX: -1, translateY: -62, scaleX: 0.787, scaleY: 0.814 },
    square02: { translateX: 0, translateY: -59, scaleX: 0.778, scaleY: 0.814 },
    long01: { translateX: 0, translateY: -59, scaleX: 0.713, scaleY: 0.814 }
  },
  'c06': {
    round: { translateX: 0, translateY: -59, scaleX: 0.719, scaleY: 0.719 },
    oval: { translateX: 0, translateY: -59, scaleX: 0.646, scaleY: 0.719 },
    diamond: { translateX: 0, translateY: -59, scaleX: 0.673, scaleY: 0.719 },
    square01: { translateX: 0, translateY: -59, scaleX: 0.697, scaleY: 0.719 },
    square02: { translateX: 0, translateY: -59, scaleX: 0.7, scaleY: 0.719 },
    long01: { translateX: 0, translateY: -59, scaleX: 0.633, scaleY: 0.719 }
  },
  'c07': {
    round: { translateX: -3, translateY: -50, scaleX: 0.823, scaleY: 0.823 },
    oval: { translateX: -3, translateY: -50, scaleX: 0.722, scaleY: 0.823 },
    diamond: { translateX: -3, translateY: -50, scaleX: 0.77, scaleY: 0.823 },
    square01: { translateX: -3, translateY: -52, scaleX: 0.784, scaleY: 0.823 },
    square02: { translateX: -3, translateY: -50, scaleX: 0.781, scaleY: 0.823 },
    long01: { translateX: -3, translateY: -50, scaleX: 0.719, scaleY: 0.823 }
  },
  'c08': {
    round: { translateX: 2, translateY: -9, scaleX: 0.71, scaleY: 0.71 },
    oval: { translateX: 2, translateY: -9, scaleX: 0.64, scaleY: 0.71 },
    diamond: { translateX: 2, translateY: -9, scaleX: 0.67, scaleY: 0.71 },
    square01: { translateX: 3, translateY: -13, scaleX: 0.74, scaleY: 0.71 },
    square02: { translateX: 4, translateY: -9, scaleX: 0.7, scaleY: 0.71 },
    long01: { translateX: 2, translateY: -9, scaleX: 0.63, scaleY: 0.71 }
  }
};

export function hairTransform(calibration: HairFaceCalibration): string {
  return `translate(${calibration.translateX} ${calibration.translateY}) translate(256 256) scale(${calibration.scaleX} ${calibration.scaleY}) translate(-256 -256)`;
}

export function faceScaleTransform(calibration: HairFaceCalibration): string {
  return `translate(256 256) scale(${calibration.faceScale ?? 1}) translate(-256 -256)`;
}

export function faceTransform(): string {
  return CANONICAL_FACE_TRANSFORM;
}
