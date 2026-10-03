import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR_RECIPE } from '../avatar/model';
import {
  AVATAR_EDITOR_EYE_OPTIONS,
  AVATAR_EDITOR_HAIR_OPTIONS,
  AVATAR_EDITOR_MOUTH_OPTIONS,
  AvatarEditor
} from './AvatarEditor';

describe('AvatarEditor', () => {
  it('promotes the former second hair, eye and mouth choices to the first position', () => {
    expect(AVATAR_EDITOR_HAIR_OPTIONS.slice(0, 2)).toEqual(['a02', 'a01']);
    expect(AVATAR_EDITOR_EYE_OPTIONS.slice(0, 2)).toEqual(['02', '01']);
    expect(AVATAR_EDITOR_MOUTH_OPTIONS.slice(0, 2)).toEqual(['02', '01']);
  });

  it('hides option captions and removes glasses and accessory categories', () => {
    const markup = renderToStaticMarkup(
      <AvatarEditor
        initialRecipe={DEFAULT_AVATAR_RECIPE}
        title="建立冒險家頭像"
        saveLabel="完成"
        onSave={async () => undefined}
        onBack={() => undefined}
      />
    );

    expect(markup).toContain('aria-label="圓臉"');
    expect(markup).not.toContain('<span>圓臉</span>');
    expect(markup).not.toContain('>眼鏡</button>');
    expect(markup).not.toContain('>髮飾</button>');
    expect(markup).not.toContain('>臉頰</button>');
    expect(markup).not.toContain('aria-label="蓬鬆後梳"');
    expect(markup).not.toContain('aria-label="中長捲髮"');
    expect(markup).not.toContain('aria-label="復古側分"');
    expect(markup).not.toContain('aria-label="方型臉 3"');
    expect(markup).toContain('class="avatar-option-grid"');
    expect(markup).toContain('tabindex="0"');

    const livePreview = markup.match(
      /<svg[^>]+aria-label="目前的冒險家頭像預覽"[\s\S]*?<\/svg>/
    )?.[0];
    expect(livePreview).toBeDefined();
    expect(livePreview).not.toContain('<circle cx="256" cy="256" r="244"');
  });
});
