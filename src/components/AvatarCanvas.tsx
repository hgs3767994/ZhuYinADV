import { useId } from 'react';
import { faceAssetUrl, hairAssetUrl, hairHasBackLayer } from '../avatar/assets';
import type {
  AvatarRecipeV2,
  FaceOption,
  HairColorOption,
  SkinToneOption
} from '../avatar/model';

interface AvatarCanvasProps {
  recipe: AvatarRecipeV2;
  className?: string;
  label?: string;
}

export const SKIN_COLORS: Record<SkinToneOption, string> = {
  peach: '#ffd7bd',
  warm: '#f7c59f',
  golden: '#dda879',
  tan: '#b97a56',
  deep: '#754b38'
};

export const HAIR_COLORS: Record<HairColorOption, string> = {
  black: '#263238',
  brown: '#5d4037',
  chestnut: '#8d4b32',
  golden: '#d9a62e',
  blue: '#315f8c',
  pink: '#b84f78'
};

const HEAD_TRANSFORM = 'matrix(.65 0 0 .78 89.6 80)';

const HAIR_FACE_SCALE_X: Record<FaceOption, number> = {
  round: 1,
  oval: 0.94,
  diamond: 0.94,
  square01: 1,
  square02: 1,
  square03: 1,
  long01: 0.92,
  long02: 0.88
};

function centeredScaleX(scaleX: number): string {
  return `matrix(${scaleX} 0 0 1 ${256 * (1 - scaleX)} 0)`;
}

interface HairLayerProps {
  recipe: AvatarRecipeV2;
  maskId: string;
  back?: boolean;
}

function HairLayer({ recipe, maskId, back = false }: HairLayerProps) {
  if (back && !hairHasBackLayer(recipe.hair)) return null;

  const prefix = back ? 'back-' : '';
  const detailsSource = hairAssetUrl(recipe.hair, `${prefix}details`);
  const hairTransform = centeredScaleX(HAIR_FACE_SCALE_X[recipe.face]);

  return (
    <g transform={HEAD_TRANSFORM}>
      <rect
        x="0"
        y="0"
        width="512"
        height="512"
        fill={HAIR_COLORS[recipe.hairColor]}
        mask={`url(#${maskId})`}
      />
      <image
        href={detailsSource}
        x="0"
        y="0"
        width="512"
        height="512"
        transform={hairTransform}
      />
    </g>
  );
}

function Brows({ recipe }: { recipe: AvatarRecipeV2 }) {
  const common = { fill: 'none', stroke: '#5b382d', strokeWidth: 9, strokeLinecap: 'round' as const };
  if (recipe.brows === 'straight') {
    return <g {...common}><path d="M178 228h48" /><path d="M286 228h48" /></g>;
  }
  if (recipe.brows === 'arched') {
    return <g {...common}><path d="M177 231q24-25 50 0" /><path d="M285 231q24-25 50 0" /></g>;
  }
  if (recipe.brows === 'cheerful') {
    return <g {...common}><path d="M179 222q24 18 47 0" /><path d="M286 222q24 18 47 0" /></g>;
  }
  return <g {...common}><path d="M180 228q23-13 46 0" /><path d="M286 228q23-13 46 0" /></g>;
}

function Eyes({ recipe }: { recipe: AvatarRecipeV2 }) {
  const iris = recipe.hairColor === 'blue' ? '#224b70' : '#382822';
  if (recipe.eyes === 'smile') {
    return <g fill="none" stroke={iris} strokeWidth="10" strokeLinecap="round"><path d="M179 267q23-24 46 0" /><path d="M287 267q23-24 46 0" /></g>;
  }
  if (recipe.eyes === 'gentle') {
    return <g fill="none" stroke={iris} strokeWidth="9" strokeLinecap="round"><path d="M179 261q23 15 46 0" /><path d="M287 261q23 15 46 0" /></g>;
  }
  if (recipe.eyes === 'wink') {
    return <g><ellipse cx="204" cy="263" rx="13" ry="20" fill={iris} /><path d="M287 264q23-22 46 0" fill="none" stroke={iris} strokeWidth="10" strokeLinecap="round" /></g>;
  }
  if (recipe.eyes === 'sparkle') {
    return (
      <g fill={iris}>
        <path d="m204 239 7 16 17 7-17 7-7 17-7-17-17-7 17-7Z" />
        <path d="m308 239 7 16 17 7-17 7-7 17-7-17-17-7 17-7Z" />
      </g>
    );
  }
  if (recipe.eyes === 'bright') {
    return <g fill={iris}><circle cx="204" cy="263" r="20" /><circle cx="308" cy="263" r="20" /><circle cx="198" cy="256" r="7" fill="#fff" /><circle cx="302" cy="256" r="7" fill="#fff" /></g>;
  }
  return <g fill={iris}><ellipse cx="204" cy="263" rx="13" ry="20" /><ellipse cx="308" cy="263" rx="13" ry="20" /><circle cx="200" cy="257" r="4" fill="#fff" /><circle cx="304" cy="257" r="4" fill="#fff" /></g>;
}

function Nose({ recipe }: { recipe: AvatarRecipeV2 }) {
  if (recipe.nose === 'dot') return <circle cx="256" cy="301" r="5" fill="#9b604b" />;
  if (recipe.nose === 'button') return <path d="M246 300q10 12 20 0q-1 18-10 18t-10-18Z" fill="#d58f70" stroke="#9b604b" strokeWidth="4" />;
  return <path d="M256 287q-11 22 2 27" fill="none" stroke="#9b604b" strokeWidth="6" strokeLinecap="round" />;
}

function Mouth({ recipe }: { recipe: AvatarRecipeV2 }) {
  if (recipe.mouth === 'open-smile') return <path d="M218 334q38 48 76 0Z" fill="#7f2639" stroke="#71303a" strokeWidth="6" />;
  if (recipe.mouth === 'tiny') return <path d="M246 346q10 8 20 0" fill="none" stroke="#8b3546" strokeWidth="7" strokeLinecap="round" />;
  if (recipe.mouth === 'cat') return <path d="M256 342q-18-15-31 2m31-2q18-15 31 2" fill="none" stroke="#8b3546" strokeWidth="7" strokeLinecap="round" />;
  if (recipe.mouth === 'grin') return <path d="M218 337q38 38 76 0-9 44-38 44t-38-44Z" fill="#fff" stroke="#8b3546" strokeWidth="6" />;
  return <path d="M222 339q34 31 68 0" fill="none" stroke="#8b3546" strokeWidth="8" strokeLinecap="round" />;
}

function Cheeks({ recipe }: { recipe: AvatarRecipeV2 }) {
  if (recipe.cheeks === 'none') return null;
  if (recipe.cheeks === 'blush') return <g fill="#ee8190" opacity=".65"><ellipse cx="170" cy="319" rx="28" ry="15" /><ellipse cx="342" cy="319" rx="28" ry="15" /></g>;
  if (recipe.cheeks === 'freckles') return <g fill="#a76045"><circle cx="163" cy="314" r="4" /><circle cx="177" cy="321" r="4" /><circle cx="188" cy="312" r="4" /><circle cx="324" cy="312" r="4" /><circle cx="335" cy="321" r="4" /><circle cx="349" cy="314" r="4" /></g>;
  if (recipe.cheeks === 'swirl') return <g fill="none" stroke="#e87887" strokeWidth="6" strokeLinecap="round"><path d="M148 319q18-25 39-5t-15 28" /><path d="M364 319q-18-25-39-5t15 28" /></g>;
  if (recipe.cheeks === 'shy-lines') return <g stroke="#df6d7c" strokeWidth="6" strokeLinecap="round"><path d="m148 312-9 18m25-18-9 18m209-18 9 18m-25-18 9 18" /></g>;
  return <g fill="#f59e0b"><path d="m166 303 6 12 14 2-10 10 3 14-13-7-13 7 3-14-10-10 14-2Z" /><path d="m346 303 6 12 14 2-10 10 3 14-13-7-13 7 3-14-10-10 14-2Z" /></g>;
}

function Glasses({ recipe }: { recipe: AvatarRecipeV2 }) {
  if (recipe.glasses === 'none') return null;
  const common = { fill: 'none', stroke: '#334155', strokeWidth: 9 };
  if (recipe.glasses === 'square') return <g {...common}><rect x="164" y="239" width="76" height="58" rx="12" /><rect x="272" y="239" width="76" height="58" rx="12" /><path d="M240 261h32M164 254l-29-10m213 10 29-10" /></g>;
  if (recipe.glasses === 'star') return <g fill="none" stroke="#7c3aed" strokeWidth="8"><path d="m204 230 12 23 26 4-19 18 5 26-24-12-24 12 5-26-19-18 26-4Z" /><path d="m308 230 12 23 26 4-19 18 5 26-24-12-24 12 5-26-19-18 26-4Z" /><path d="M242 261h28" /></g>;
  return <g {...common}><circle cx="204" cy="265" r="39" /><circle cx="308" cy="265" r="39" /><path d="M243 258q13-11 26 0M165 251l-27-10m209 10 27-10" /></g>;
}

function HairAccessory({ recipe }: { recipe: AvatarRecipeV2 }) {
  if (recipe.hairAccessory === 'none') return null;
  if (recipe.hairAccessory === 'star-clip') return <path d="m344 122 10 21 23 3-17 16 4 23-20-11-21 11 4-23-17-16 24-3Z" fill="#facc15" stroke="#a16207" strokeWidth="6" />;
  if (recipe.hairAccessory === 'bow') return <g fill="#f06292" stroke="#9d174d" strokeWidth="6"><path d="M310 130q-43-44-54 9 20 30 54 14Z" /><path d="M326 130q43-44 54 9-20 30-54 14Z" /><circle cx="318" cy="143" r="18" /></g>;
  if (recipe.hairAccessory === 'leaf') return <g fill="#65a30d" stroke="#3f6212" strokeWidth="6"><path d="M326 132q22-54 67-47-1 47-57 61Z" /><path d="M340 134q26-22 48-42" fill="none" /></g>;
  return <g stroke="#6b4f2f" strokeWidth="7"><path d="M143 131q113-97 226 0l-19 42H162Z" fill="#d4a95f" /><path d="M119 165q137-31 274 0-16 29-137 29t-137-29Z" fill="#b9843d" /><path d="M188 134h136" stroke="#4f8aa8" strokeWidth="15" /></g>;
}

export function AvatarCanvas({ recipe, className = '', label = '冒險家頭像' }: AvatarCanvasProps) {
  const skin = SKIN_COLORS[recipe.skinTone];
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const faceMaskId = `face-mask-${instanceId}`;
  const hairMaskId = `hair-mask-${instanceId}`;
  const hairBackMaskId = `hair-back-mask-${instanceId}`;
  const maskSource = faceAssetUrl(recipe.face, 'mask');
  const detailsSource = faceAssetUrl(recipe.face, 'details');
  const hairTransform = centeredScaleX(HAIR_FACE_SCALE_X[recipe.face]);
  const hasHairBack = hairHasBackLayer(recipe.hair);
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
        <mask id={hairMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
          <image
            href={hairAssetUrl(recipe.hair, 'mask')}
            x="0"
            y="0"
            width="512"
            height="512"
            transform={hairTransform}
          />
        </mask>
        {hasHairBack && (
          <mask id={hairBackMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
            <image
              href={hairAssetUrl(recipe.hair, 'back-mask')}
              x="0"
              y="0"
              width="512"
              height="512"
              transform={hairTransform}
            />
          </mask>
        )}
      </defs>
      <circle cx="256" cy="256" r="244" fill="#dff4f0" />
      <HairLayer recipe={recipe} maskId={hairBackMaskId} back />
      <g transform={HEAD_TRANSFORM}>
        <rect x="0" y="0" width="512" height="512" fill={skin} mask={`url(#${faceMaskId})`} />
        <image href={detailsSource} x="0" y="0" width="512" height="512" />
      </g>
      <HairLayer recipe={recipe} maskId={hairMaskId} />
      <Brows recipe={recipe} />
      <Eyes recipe={recipe} />
      <Nose recipe={recipe} />
      <Cheeks recipe={recipe} />
      <Mouth recipe={recipe} />
      <Glasses recipe={recipe} />
      <HairAccessory recipe={recipe} />
    </svg>
  );
}
