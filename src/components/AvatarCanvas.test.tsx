import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR_RECIPE } from '../avatar/model';
import { AvatarCanvas } from './AvatarCanvas';

describe('AvatarCanvas hairstyles', () => {
  it('renders the selected vector eyebrow asset', () => {
    const markup = renderToStaticMarkup(
      <AvatarCanvas recipe={{ ...DEFAULT_AVATAR_RECIPE, brows: '06' }} />
    );

    expect(markup).toContain('assets/avatar-parts/brows/brow-06.svg');
  });

  it('uses the approved single-layer image and canonical face layout', () => {
    const markup = renderToStaticMarkup(
      <AvatarCanvas
        recipe={{ ...DEFAULT_AVATAR_RECIPE, hair: '02', face: 'round' }}
      />
    );

    expect(markup).toContain('assets/avatar-parts/hair/approved/hair-02.png');
    expect(markup).toContain(
      'translate(-5.6875 73.405) translate(256 256) scale(1.0741 1.093) translate(-256 -256)'
    );
    expect(markup).toContain('matrix(.65 0 0 .78 89.6 80)');
    expect(markup).not.toContain('back-mask');
    expect(markup).not.toContain('candidates');
  });

  it('keeps the approved brown artwork unchanged and tints other hair colors', () => {
    const brownRecipe = {
      ...DEFAULT_AVATAR_RECIPE,
      hair: '01' as const,
      hairColor: 'brown' as const
    };
    const brown = renderToStaticMarkup(<AvatarCanvas recipe={brownRecipe} />);
    const blue = renderToStaticMarkup(
      <AvatarCanvas recipe={{ ...brownRecipe, hairColor: 'blue' }} />
    );

    expect(brown).not.toMatch(/<image[^>]+hair-01\.png[^>]+filter=/);
    expect(blue).toMatch(/<image[^>]+hair-01\.png[^>]+filter="url\(#hair-tint-/);
  });

  it('renders the hairstyle above the eyebrows and facial features', () => {
    const markup = renderToStaticMarkup(
      <AvatarCanvas recipe={{ ...DEFAULT_AVATAR_RECIPE, hair: '05' }} />
    );

    expect(markup.indexOf('brow-01.svg')).toBeLessThan(
      markup.indexOf('data-avatar-layer="features"')
    );
    expect(markup.indexOf('data-avatar-layer="features"')).toBeLessThan(
      markup.indexOf('data-avatar-layer="hair"')
    );
    expect(markup.indexOf('data-avatar-layer="hair"')).toBeLessThan(
      markup.indexOf('hair-05.png')
    );
  });

  it('renders a remaining layered SVG hairstyle without replacing its id', () => {
    const markup = renderToStaticMarkup(
      <AvatarCanvas recipe={{ ...DEFAULT_AVATAR_RECIPE, hair: 'a06' }} />
    );

    expect(markup).toContain('hair-a06-mask.svg');
    expect(markup).toContain('hair-a06-details.svg');
    expect(markup).not.toContain('back-mask');
    expect(markup).not.toContain('approved/hair-a06.png');
  });

  it('can render a complete frameless avatar without retired decorations', () => {
    const markup = renderToStaticMarkup(
      <AvatarCanvas
        recipe={{
          ...DEFAULT_AVATAR_RECIPE,
          glasses: 'star',
          hairAccessory: 'explorer-hat'
        }}
        showBackground={false}
      />
    );

    expect(markup).not.toContain('fill="#dff4f0"');
    expect(markup).not.toContain('stroke="#7c3aed"');
    expect(markup).not.toContain('fill="#d4a95f"');
  });
});
