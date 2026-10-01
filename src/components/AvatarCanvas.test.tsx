import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR_RECIPE } from '../avatar/model';
import { AvatarCanvas } from './AvatarCanvas';

describe('AvatarCanvas approved hairstyles', () => {
  it('uses the approved single-layer image and exact face calibration', () => {
    const markup = renderToStaticMarkup(
      <AvatarCanvas
        recipe={{ ...DEFAULT_AVATAR_RECIPE, hair: '02', face: 'round' }}
      />
    );

    expect(markup).toContain('assets/avatar-parts/hair/approved/hair-02.png');
    expect(markup).toContain(
      'translate(-7 51) translate(256 256) scale(1.322 1.121) translate(-256 -256)'
    );
    expect(markup).toContain(
      'translate(256 256) scale(0.8) translate(-256 -256)'
    );
    expect(markup).not.toContain('back-mask');
    expect(markup).not.toContain('candidates');
  });

  it('keeps the approved brown artwork unchanged and tints other hair colors', () => {
    const brownRecipe = { ...DEFAULT_AVATAR_RECIPE, hair: '01' as const };
    const brown = renderToStaticMarkup(<AvatarCanvas recipe={brownRecipe} />);
    const blue = renderToStaticMarkup(
      <AvatarCanvas recipe={{ ...brownRecipe, hairColor: 'blue' }} />
    );

    expect(brown).not.toMatch(/<image[^>]+hair-01\.png[^>]+filter=/);
    expect(blue).toMatch(/<image[^>]+hair-01\.png[^>]+filter="url\(#hair-tint-/);
  });

  it('renders an existing layered SVG hairstyle without replacing its id', () => {
    const markup = renderToStaticMarkup(
      <AvatarCanvas recipe={{ ...DEFAULT_AVATAR_RECIPE, hair: 'a05' }} />
    );

    expect(markup).toContain('hair-a05-mask.svg');
    expect(markup).toContain('hair-a05-details.svg');
    expect(markup).toContain('hair-a05-back-mask.svg');
    expect(markup).toContain('hair-a05-back-details.svg');
    expect(markup).not.toContain('approved/hair-a05.png');
  });
});
