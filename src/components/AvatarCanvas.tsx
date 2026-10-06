import { useId } from 'react';
import {
  approvedHairAssetUrl,
  browAssetUrl,
  eyeAssetUrl,
  faceAssetUrl,
  mouthAssetUrl,
  noseAssetUrl
} from '../avatar/assets';
import { EYE_SCALE_CALIBRATIONS, eyeTransform } from '../avatar/eyeCalibration';
import {
  HAIR_FACE_CALIBRATIONS,
  faceTransform,
  hairTransform
} from '../avatar/hairCalibration';
import { NOSE_SCALE_CALIBRATIONS, noseTransform } from '../avatar/noseCalibration';
import { MOUTH_CALIBRATIONS, mouthTransform } from '../avatar/mouthCalibration';
import type {
  AvatarRecipeV2,
  HairColorOption,
  SkinToneOption
} from '../avatar/model';

interface AvatarCanvasProps {
  recipe: AvatarRecipeV2;
  className?: string;
  label?: string;
  showBackground?: boolean;
}

export const SKIN_COLORS: Record<SkinToneOption, string> = {
  peach: '#ffd7bd',
  warm: '#f7c59f',
  golden: '#dda879',
  tan: '#b97a56',
  deep: '#754b38'
};

export const HAIR_COLORS: Record<HairColorOption, string> = {
  black: '#181921',
  brown: '#5d4037',
  chestnut: '#8d4b32',
  golden: '#d9a62e',
  blue: '#315f8c',
  pink: '#b84f78',
  green: '#6B8E23',
  wine: '#82074e',
  gray: '#8E8E8E',
  mauve: '#B7ACB6',
  mustard: '#DACC4A'
};

function hairTintMatrix(color: string): string {
  const channels = color.match(/[a-f\d]{2}/gi)?.map((channel) => Number.parseInt(channel, 16));
  const [red = 93, green = 64, blue = 55] = channels ?? [];
  const referenceLuminance = 86;
  const redScale = red / referenceLuminance;
  const greenScale = green / referenceLuminance;
  const blueScale = blue / referenceLuminance;
  return [
    0.2126 * redScale, 0.7152 * redScale, 0.0722 * redScale, 0, 0,
    0.2126 * greenScale, 0.7152 * greenScale, 0.0722 * greenScale, 0, 0,
    0.2126 * blueScale, 0.7152 * blueScale, 0.0722 * blueScale, 0, 0,
    0, 0, 0, 1, 0
  ].join(' ');
}

function Brows({ recipe }: { recipe: AvatarRecipeV2 }) {
  return (
    <image
      href={browAssetUrl(recipe.brows)}
      x="0"
      y="0"
      width="512"
      height="512"
    />
  );
}

function Eyes({ recipe }: { recipe: AvatarRecipeV2 }) {
  const calibration = EYE_SCALE_CALIBRATIONS[recipe.eyes];
  return (
    <g data-avatar-layer="eyes">
      {(['left', 'right'] as const).map((side) => (
        <image
          key={side}
          href={eyeAssetUrl(recipe.eyes, side)}
          x="0"
          y="0"
          width="512"
          height="512"
          transform={eyeTransform(calibration, side)}
        />
      ))}
    </g>
  );
}

interface NoseProps {
  recipe: AvatarRecipeV2;
  skin: string;
  maskId: string;
}

function Nose({ recipe, skin, maskId }: NoseProps) {
  const transform = noseTransform(NOSE_SCALE_CALIBRATIONS[recipe.nose]);
  return (
    <g data-avatar-layer="nose">
      <rect
        x="0"
        y="0"
        width="512"
        height="512"
        fill={skin}
        mask={`url(#${maskId})`}
      />
      <image
        href={noseAssetUrl(recipe.nose, 'details')}
        x="0"
        y="0"
        width="512"
        height="512"
        transform={transform}
      />
    </g>
  );
}

function Mouth({ recipe }: { recipe: AvatarRecipeV2 }) {
  return (
    <image
      data-avatar-layer="mouth"
      href={mouthAssetUrl(recipe.mouth)}
      x="0"
      y="0"
      width="512"
      height="512"
      transform={mouthTransform(MOUTH_CALIBRATIONS[recipe.mouth])}
    />
  );
}

export function AvatarCanvas({
  recipe,
  className = '',
  label = '冒險家頭像',
  showBackground = true
}: AvatarCanvasProps) {
  const skin = SKIN_COLORS[recipe.skinTone];
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const faceMaskId = `face-mask-${instanceId}`;
  const hairTintId = `hair-tint-${instanceId}`;
  const noseMaskId = `nose-mask-${instanceId}`;
  const maskSource = faceAssetUrl(recipe.face, 'mask');
  const detailsSource = faceAssetUrl(recipe.face, 'details');
  const calibration = HAIR_FACE_CALIBRATIONS[recipe.hair][recipe.face];
  const calibratedHairTransform = hairTransform(calibration);
  const canonicalFaceTransform = faceTransform();
  const tintHair = recipe.hairColor !== 'brown';
  return (
    <svg
      className={`avatar-canvas ${className}`.trim()}
      viewBox="0 0 512 512"
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <mask id={faceMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
          <image href={maskSource} x="0" y="0" width="512" height="512" />
        </mask>
        <mask id={noseMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
          <image
            href={noseAssetUrl(recipe.nose, 'mask')}
            x="0"
            y="0"
            width="512"
            height="512"
            transform={noseTransform(NOSE_SCALE_CALIBRATIONS[recipe.nose])}
          />
        </mask>
        <filter id={hairTintId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={hairTintMatrix(HAIR_COLORS[recipe.hairColor])} />
        </filter>
      </defs>
      {showBackground && <circle cx="256" cy="256" r="244" fill="#dff4f0" />}
      <g transform={canonicalFaceTransform}>
        <rect x="0" y="0" width="512" height="512" fill={skin} mask={`url(#${faceMaskId})`} />
        <image href={detailsSource} x="0" y="0" width="512" height="512" />
      </g>
      <Brows recipe={recipe} />
      <g data-avatar-layer="features" transform="translate(0 18)">
        <Eyes recipe={recipe} />
        <Nose recipe={recipe} skin={skin} maskId={noseMaskId} />
        <Mouth recipe={recipe} />
      </g>
      <g data-avatar-layer="hair">
        <image
          href={approvedHairAssetUrl(recipe.hair)}
          x="0"
          y="0"
          width="512"
          height="512"
          transform={calibratedHairTransform}
          filter={tintHair ? `url(#${hairTintId})` : undefined}
        />
      </g>
    </svg>
  );
}
