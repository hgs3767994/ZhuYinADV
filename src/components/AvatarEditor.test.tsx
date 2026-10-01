import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR_RECIPE } from '../avatar/model';
import { AvatarEditor } from './AvatarEditor';

describe('AvatarEditor', () => {
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
  });
});
