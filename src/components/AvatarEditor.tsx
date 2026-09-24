import { useState } from 'react';
import {
  BROW_OPTIONS,
  CHEEK_OPTIONS,
  DEFAULT_AVATAR_RECIPE,
  EYE_OPTIONS,
  FACE_OPTIONS,
  GLASSES_OPTIONS,
  HAIR_ACCESSORY_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_OPTIONS,
  MOUTH_OPTIONS,
  NOSE_OPTIONS,
  SKIN_TONE_OPTIONS,
  randomAvatarRecipe,
  type AvatarRecipeKey,
  type AvatarRecipeV2
} from '../avatar/model';
import { AvatarCanvas, HAIR_COLORS, SKIN_COLORS } from './AvatarCanvas';

interface AvatarEditorProps {
  initialRecipe: AvatarRecipeV2;
  title: string;
  saveLabel: string;
  onSave: (recipe: AvatarRecipeV2) => Promise<void>;
  onBack: (recipe: AvatarRecipeV2) => void;
}

type Category = {
  key: AvatarRecipeKey;
  label: string;
  options: readonly string[];
  optionLabels: Record<string, string>;
};

const CATEGORIES: Category[] = [
  { key: 'face', label: '臉型', options: FACE_OPTIONS, optionLabels: { round: '圓臉', oval: '長臉', 'soft-square': '方圓臉' } },
  { key: 'skinTone', label: '膚色', options: SKIN_TONE_OPTIONS, optionLabels: { peach: '粉嫩', warm: '暖膚', golden: '蜜糖', tan: '小麥', deep: '深膚' } },
  { key: 'hair', label: '髮型', options: HAIR_OPTIONS, optionLabels: { short: '短髮', bob: '鮑伯頭', curly: '捲髮', 'twin-tails': '雙馬尾', 'side-sweep': '側分', spiky: '活力尖髮' } },
  { key: 'hairColor', label: '髮色', options: HAIR_COLOR_OPTIONS, optionLabels: { black: '墨黑', brown: '深棕', chestnut: '栗子', golden: '金黃', blue: '海洋藍', pink: '莓果粉' } },
  { key: 'brows', label: '眉毛', options: BROW_OPTIONS, optionLabels: { soft: '柔和眉', straight: '一字眉', arched: '彎彎眉', cheerful: '開心眉' } },
  { key: 'eyes', label: '眼睛', options: EYE_OPTIONS, optionLabels: { round: '圓眼', smile: '笑眼', sparkle: '星星眼', gentle: '溫柔眼', bright: '亮亮眼', wink: '眨眼' } },
  { key: 'nose', label: '鼻子', options: NOSE_OPTIONS, optionLabels: { dot: '小圓鼻', soft: '柔和鼻', button: '鈕扣鼻' } },
  { key: 'mouth', label: '嘴巴', options: MOUTH_OPTIONS, optionLabels: { smile: '微笑', 'open-smile': '開心笑', tiny: '小嘴', cat: '貓咪嘴', grin: '露齒笑' } },
  { key: 'cheeks', label: '臉頰', options: CHEEK_OPTIONS, optionLabels: { none: '無', blush: '腮紅', freckles: '雀斑', swirl: '漩渦', 'shy-lines': '害羞', stars: '星星' } },
  { key: 'glasses', label: '眼鏡', options: GLASSES_OPTIONS, optionLabels: { none: '無', round: '圓框', square: '方框', star: '星星框' } },
  { key: 'hairAccessory', label: '髮飾', options: HAIR_ACCESSORY_OPTIONS, optionLabels: { none: '無', 'star-clip': '星星髮夾', bow: '蝴蝶結', leaf: '葉子', 'explorer-hat': '探險帽' } }
];

export function AvatarEditor({
  initialRecipe,
  title,
  saveLabel,
  onSave,
  onBack
}: AvatarEditorProps) {
  const [recipe, setRecipe] = useState<AvatarRecipeV2>(() => ({ ...initialRecipe }));
  const [categoryKey, setCategoryKey] = useState<AvatarRecipeKey>('face');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const category = CATEGORIES.find((candidate) => candidate.key === categoryKey) ?? CATEGORIES[0];

  const selectOption = (key: AvatarRecipeKey, value: string) => {
    setRecipe((current) => ({ ...current, [key]: value } as AvatarRecipeV2));
  };

  const save = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSave(recipe);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '無法保存頭像');
      setSubmitting(false);
    }
  };

  return (
    <main className="screen avatar-editor-screen">
      <div className="dark-overlay" />
      <section className="avatar-editor-panel" aria-labelledby="avatar-editor-title">
        <h1 id="avatar-editor-title">{title}</h1>

        <div className="avatar-preview-wrap">
          <AvatarCanvas recipe={recipe} className="avatar-preview" label="目前的冒險家頭像預覽" />
          <div className="avatar-quick-actions">
            <button type="button" className="secondary-button compact-button"
              onClick={() => setRecipe(randomAvatarRecipe())}>🎲 隨機產生</button>
            <button type="button" className="secondary-button compact-button"
              onClick={() => setRecipe({ ...DEFAULT_AVATAR_RECIPE })}>↺ 全部重設</button>
          </div>
        </div>

        <nav className="avatar-category-tabs" aria-label="頭像造型分類">
          {CATEGORIES.map((candidate) => (
            <button
              key={candidate.key}
              type="button"
              className={candidate.key === categoryKey ? 'selected' : ''}
              aria-pressed={candidate.key === categoryKey}
              onClick={() => setCategoryKey(candidate.key)}
            >
              {candidate.label}
            </button>
          ))}
        </nav>

        <div className="avatar-option-grid" aria-label={`${category.label}選項`}>
          {category.options.map((option) => {
            const selected = recipe[category.key] === option;
            const optionRecipe = { ...recipe, [category.key]: option } as AvatarRecipeV2;
            const isColor = category.key === 'skinTone' || category.key === 'hairColor';
            const color = category.key === 'skinTone'
              ? SKIN_COLORS[option as keyof typeof SKIN_COLORS]
              : category.key === 'hairColor'
                ? HAIR_COLORS[option as keyof typeof HAIR_COLORS]
                : undefined;
            return (
              <button
                key={option}
                type="button"
                className={`avatar-option ${selected ? 'selected' : ''}`}
                aria-pressed={selected}
                onClick={() => selectOption(category.key, option)}
              >
                {isColor ? (
                  <span className="avatar-color-swatch" style={{ backgroundColor: color }} />
                ) : (
                  <AvatarCanvas recipe={optionRecipe} className="avatar-option-preview" label="" />
                )}
                <span>{category.optionLabels[option]}</span>
              </button>
            );
          })}
        </div>

        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="avatar-editor-actions">
          <button className="primary-button" type="button" disabled={submitting} onClick={() => void save()}>
            {submitting ? '保存中…' : saveLabel}
          </button>
          <button className="secondary-button" type="button" disabled={submitting}
            onClick={() => onBack(recipe)}>
            返回
          </button>
        </div>
      </section>
    </main>
  );
}
