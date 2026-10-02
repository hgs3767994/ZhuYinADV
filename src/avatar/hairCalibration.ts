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
  }
};

export function hairTransform(calibration: HairFaceCalibration): string {
  return `translate(${calibration.translateX} ${calibration.translateY}) translate(256 256) scale(${calibration.scaleX} ${calibration.scaleY}) translate(-256 -256)`;
}

export function faceTransform(): string {
  return CANONICAL_FACE_TRANSFORM;
}
