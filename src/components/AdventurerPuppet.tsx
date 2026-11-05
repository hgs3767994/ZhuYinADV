import type { CSSProperties } from 'react';
import { HAIR_FACE_CALIBRATIONS } from '../avatar/hairCalibration';
import {
  DEFAULT_AVATAR_RECIPE,
  normalizeAvatarRecipe,
  type AvatarRecipeV2
} from '../avatar/model';
import { assetUrl } from '../utils/assets';
import { AvatarCanvas } from './AvatarCanvas';

const ADVENTURER_BODY_URL = `${assetUrl('assets/images/campaign/level-04-adventurer-body.png')}?v=2`;

interface AdventurerPuppetProps {
  recipe: AvatarRecipeV2;
  className?: string;
  headOffsetX?: number;
  headOffsetY?: number;
  headScale?: number;
}

type PuppetStyle = CSSProperties & {
  '--puppet-head-x': string;
  '--puppet-head-y': string;
  '--puppet-head-scale': string;
};

export function AdventurerPuppet({
  recipe,
  className = '',
  headOffsetX = 0,
  headOffsetY = 4.5,
  headScale = 1.22
}: AdventurerPuppetProps) {
  const normalizedRecipe = normalizeAvatarRecipe(recipe);
  const safeRecipe = HAIR_FACE_CALIBRATIONS[normalizedRecipe.hair]?.[normalizedRecipe.face]
    ? normalizedRecipe
    : DEFAULT_AVATAR_RECIPE;
  const style: PuppetStyle = {
    '--puppet-head-x': `${headOffsetX}%`,
    '--puppet-head-y': `${headOffsetY}%`,
    '--puppet-head-scale': String(headScale)
  };

  return (
    <div
      className={`adventurer-puppet ${className}`.trim()}
      style={style}
      role="img"
      aria-label="套用玩家頭像的冒險者紙偶"
    >
      <img
        className="adventurer-puppet-body"
        src={ADVENTURER_BODY_URL}
        alt=""
        aria-hidden="true"
        draggable="false"
      />
      <div className="adventurer-puppet-head" aria-hidden="true">
        <AvatarCanvas
          recipe={safeRecipe}
          className="adventurer-puppet-avatar"
          label=""
          showBackground={false}
        />
      </div>
    </div>
  );
}
