import type { ApprovedHairOption, FaceOption } from './model';

export interface HairFaceCalibration {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
}

type HairCalibrationMap = Record<ApprovedHairOption, Record<FaceOption, HairFaceCalibration>>;

// This is the accepted head layout used by the original hairstyles. Keeping one
// canonical face transform makes neck width and head size independent of hair.
export const CANONICAL_FACE_TRANSFORM = 'matrix(.65 0 0 .78 89.6 80)';

export const HAIR_FACE_CALIBRATIONS: HairCalibrationMap = {
  '01': {
    round: { translateX: -9, translateY: -7, scaleX: 0.92, scaleY: 0.946 },
    oval: { translateX: -9, translateY: -2, scaleX: 0.835, scaleY: 0.994 },
    diamond: { translateX: -9, translateY: -6, scaleX: 0.855, scaleY: 0.983 },
    square01: { translateX: -9, translateY: -6, scaleX: 0.933, scaleY: 0.985 },
    square02: { translateX: -9, translateY: -7, scaleX: 0.91, scaleY: 1.01 },
    long01: { translateX: -9, translateY: -7, scaleX: 0.752, scaleY: 0.947 }
  },
  '02': {
    round: { translateX: -5.6875, translateY: 73.405, scaleX: 1.0741, scaleY: 1.093 },
    oval: { translateX: -5.6875, translateY: 73.405, scaleX: 0.9506, scaleY: 1.17 },
    diamond: { translateX: -5.6875, translateY: 68.53, scaleX: 0.9872, scaleY: 1.1583 },
    square01: { translateX: -6.0667, translateY: 65.28, scaleX: 1.0339, scaleY: 1.2241 },
    square02: { translateX: -6.8114, translateY: 63.3806, scaleX: 1.085, scaleY: 1.3487 },
    long01: { translateX: -5.1181, translateY: 62.5776, scaleX: 0.9963, scaleY: 1.1342 }
  },
  '03': {
    round: { translateX: -6.7507, translateY: 10.95, scaleX: 0.922, scaleY: 1.1064 },
    oval: { translateX: -6.3636, translateY: 23.68, scaleX: 0.9091, scaleY: 1.0909 },
    diamond: { translateX: -6.1737, translateY: 23.68, scaleX: 0.882, scaleY: 1.0583 },
    square01: { translateX: -6.8114, translateY: 12.0034, scaleX: 0.9614, scaleY: 1.1478 },
    square02: { translateX: -6.2102, translateY: 14.9857, scaleX: 1.0319, scaleY: 1.1427 },
    long01: { translateX: -5.7437, translateY: 11.0438, scaleX: 0.875, scaleY: 1.1281 }
  },
  '05': {
    round: { translateX: -3.2178, translateY: -40.6764, scaleX: 1.152, scaleY: 1.0645 },
    oval: { translateX: -3.2995, translateY: -31.7515, scaleX: 0.9975, scaleY: 1.135 },
    diamond: { translateX: -3.2178, translateY: -34.2408, scaleX: 1.0018, scaleY: 1.0735 },
    square01: { translateX: -3.25, translateY: -27.02, scaleX: 1.1137, scaleY: 1.092 },
    square02: { translateX: -3.5009, translateY: -29.5336, scaleX: 1.0514, scaleY: 1.2337 },
    long01: { translateX: -2.226, translateY: -41.7652, scaleX: 1.0618, scaleY: 1.1072 }
  },
  '07': {
    round: { translateX: -2.5031, translateY: 82.6033, scaleX: 1.1076, scaleY: 1.1214 },
    oval: { translateX: -2.5126, translateY: 85.4271, scaleX: 1.0415, scaleY: 1.2563 },
    diamond: { translateX: -2.5031, translateY: 66.3329, scaleX: 1.1865, scaleY: 1.2516 },
    square01: { translateX: -2.5063, translateY: 73.9348, scaleX: 1.1654, scaleY: 1.1328 },
    square02: { translateX: 1.2642, translateY: 73.3249, scaleX: 1.1896, scaleY: 1.2288 },
    long01: { translateX: -2.4881, translateY: 71.3392, scaleX: 1.0538, scaleY: 1.2516 }
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
    round: { translateX: 60.8, translateY: -8.16, scaleX: 1.134, scaleY: 1.101 },
    oval: { translateX: 58.083, translateY: -5.209, scaleX: 1.017, scaleY: 1.114 },
    diamond: { translateX: 57.297, translateY: -8.581, scaleX: 1.095, scaleY: 1.036 },
    square01: { translateX: 65.793, translateY: 9.39, scaleX: 1.159, scaleY: 1 },
    square02: { translateX: 63.557, translateY: -9.463, scaleX: 1.166, scaleY: 1.153 },
    long01: { translateX: 58.107, translateY: -16.508, scaleX: 1.049, scaleY: 1.062 }
  },
  '11': {
    round: { translateX: 0, translateY: -19, scaleX: 1.043, scaleY: 1.153 },
    oval: { translateX: -3.308, translateY: -27.891, scaleX: 0.993, scaleY: 1.237 },
    diamond: { translateX: -3, translateY: -27, scaleX: 1, scaleY: 1.172 },
    square01: { translateX: -4, translateY: -32.671, scaleX: 1.056, scaleY: 1.353 },
    square02: { translateX: -4.511, translateY: -28.613, scaleX: 1.017, scaleY: 1.308 },
    long01: { translateX: -3.236, translateY: -27.836, scaleX: 0.991, scaleY: 1.211 }
  }
};

export function hairTransform(calibration: HairFaceCalibration): string {
  return `translate(${calibration.translateX} ${calibration.translateY}) translate(256 256) scale(${calibration.scaleX} ${calibration.scaleY}) translate(-256 -256)`;
}

export function faceTransform(): string {
  return CANONICAL_FACE_TRANSFORM;
}
