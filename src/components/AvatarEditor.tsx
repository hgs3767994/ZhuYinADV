import { useEffect, useRef, useState } from 'react';
import {
  BROW_OPTIONS,
  DEFAULT_AVATAR_RECIPE,
  EYE_OPTIONS,
  FACE_OPTIONS,
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

function promoteSecondOption<T extends string>(options: readonly T[]): readonly T[] {
  if (options.length < 2) return options;
  return [options[1], options[0], ...options.slice(2)];
}

export const AVATAR_EDITOR_HAIR_OPTIONS = promoteSecondOption(HAIR_OPTIONS);
export const AVATAR_EDITOR_EYE_OPTIONS = promoteSecondOption(EYE_OPTIONS);
export const AVATAR_EDITOR_MOUTH_OPTIONS = promoteSecondOption(MOUTH_OPTIONS);

const CATEGORIES: Category[] = [
  {
    key: 'face',
    label: '臉型',
    options: FACE_OPTIONS,
    optionLabels: {
      round: '圓臉',
      oval: '鵝蛋臉',
      diamond: '菱形臉',
      square01: '方型臉 1',
      square02: '方型臉 2',
      long01: '長型臉'
    }
  },
  { key: 'skinTone', label: '膚色', options: SKIN_TONE_OPTIONS, optionLabels: { peach: '粉嫩', warm: '暖膚', golden: '蜜糖', tan: '小麥', deep: '深膚' } },
  {
    key: 'hair',
    label: '髮型',
    options: AVATAR_EDITOR_HAIR_OPTIONS,
    optionLabels: {
      '01': '髮型 1',
      '02': '髮型 2',
      '03': '髮型 3',
      '05': '髮型 5',
      '07': '髮型 7',
      '08': '髮型 8',
      '09': '髮型 9',
      '11': '髮型 11'
    }
  },
  { key: 'hairColor', label: '髮色', options: HAIR_COLOR_OPTIONS, optionLabels: { black: '墨黑', brown: '深棕', chestnut: '栗子', golden: '金黃', blue: '海洋藍', pink: '莓果粉', green: '橄欖綠', wine: '酒紅', gray: '灰色', mauve: '霧紫灰', mustard: '芥末黃' } },
  { key: 'brows', label: '眉毛', options: BROW_OPTIONS, optionLabels: { '01': '眉型 1', '02': '眉型 2', '03': '眉型 3', '04': '眉型 4', '05': '眉型 5', '06': '眉型 6', '07': '眉型 7', '08': '眉型 8', '09': '眉型 9' } },
  { key: 'eyes', label: '眼睛', options: AVATAR_EDITOR_EYE_OPTIONS, optionLabels: { '01': '眼型 1', '02': '眼型 2', '03': '眼型 3', '04': '眼型 4', '05': '眼型 5' } },
  { key: 'nose', label: '鼻子', options: NOSE_OPTIONS, optionLabels: { '01': '鼻型 1', '02': '鼻型 2', '03': '鼻型 3', '04': '鼻型 4', '05': '鼻型 5', '06': '鼻型 6', '07': '鼻型 7', '08': '鼻型 8' } },
  { key: 'mouth', label: '嘴巴', options: AVATAR_EDITOR_MOUTH_OPTIONS, optionLabels: { '01': '嘴型 1', '02': '嘴型 2', '04': '嘴型 4', '05': '嘴型 5', '06': '嘴型 6', '07': '嘴型 7', '08': '嘴型 8', '10': '嘴型 10', '14': '嘴型 14' } }
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
  const optionGridRef = useRef<HTMLDivElement>(null);
  const category = CATEGORIES.find((candidate) => candidate.key === categoryKey) ?? CATEGORIES[0];

  useEffect(() => {
    optionGridRef.current?.scrollTo({ top: 0 });
  }, [categoryKey]);

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
          <AvatarCanvas
            recipe={recipe}
            className="avatar-preview"
            label="目前的冒險家頭像預覽"
            showBackground={false}
          />
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

        <div
          ref={optionGridRef}
          className="avatar-option-grid"
          aria-label={`${category.label}選項`}
          tabIndex={0}
        >
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
                aria-label={category.optionLabels[option]}
                onClick={() => selectOption(category.key, option)}
              >
                {isColor ? (
                  <span className="avatar-color-swatch" style={{ backgroundColor: color }} />
                ) : (
                  <AvatarCanvas recipe={optionRecipe} className="avatar-option-preview" label="" />
                )}
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
