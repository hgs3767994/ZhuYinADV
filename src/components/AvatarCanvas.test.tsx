import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR_RECIPE } from '../avatar/model';
import { AvatarCanvas, HAIR_COLORS } from './AvatarCanvas';

describe('AvatarCanvas hairstyles', () => {
  it('provides the requested hair colors', () => {
    expect(HAIR_COLORS.black).toBe('#28323b');
    expect(HAIR_COLORS.green).toBe('#6B8E23');
    expect(HAIR_COLORS.wine).toBe('#82074e');
    expect(HAIR_COLORS.gray).toBe('#8E8E8E');
    expect(HAIR_COLORS.mauve).toBe('#B7ACB6');
    expect(HAIR_COLORS.mustard).toBe('#DACC4A');
  });

  it('renders the selected vector eyebrow asset', () => {
    const markup = renderToStaticMarkup(
      <AvatarCanvas recipe={{ ...DEFAULT_AVATAR_RECIPE, brows: '06' }} />
    );

    expect(markup).toContain('assets/avatar-parts/brows/brow-06.svg');
  });

  it('renders a calibrated vector eye at the fixed feature position', () => {
    const markup = renderToStaticMarkup(
      <AvatarCanvas recipe={{ ...DEFAULT_AVATAR_RECIPE, eyes: '03' }} />
    );

    expect(markup).toContain('assets/avatar-parts/eyes/eye-03-left.svg');
    expect(markup).toContain('assets/avatar-parts/eyes/eye-03-right.svg');
    expect(markup).toContain(
      'translate(-7.5 0) translate(256 263) scale(0.406 0.368) translate(-256 -263)'
    );
    expect(markup).toContain(
      'translate(7.5 0) translate(256 263) scale(0.406 0.368) translate(-256 -263)'
    );
    expect(markup).toContain('data-avatar-layer="eyes"');
    expect(markup).toContain('data-avatar-layer="features" transform="translate(0 18)"');
  });

  it('renders the calibrated nose mask and details with the selected skin tone', () => {
    const markup = renderToStaticMarkup(
      <AvatarCanvas
        recipe={{ ...DEFAULT_AVATAR_RECIPE, nose: '06', skinTone: 'tan' }}
      />
    );

    expect(markup).toContain('assets/avatar-parts/noses/nose-06-mask.svg');
    expect(markup).toContain('assets/avatar-parts/noses/nose-06-details.svg');
    expect(markup).toContain(
      'translate(0 -21) translate(256 315) scale(0.391 0.521) translate(-256 -315)'
    );
    expect(markup).toContain('data-avatar-layer="nose"');
    expect(markup).toMatch(/fill="#b97a56" mask="url\(#nose-mask-/);
  });

  it('renders the calibrated vector mouth at its shared face-relative position', () => {
    const markup = renderToStaticMarkup(
      <AvatarCanvas recipe={{ ...DEFAULT_AVATAR_RECIPE, mouth: '08' }} />
    );

    expect(markup).toContain('assets/avatar-parts/mouths/mouth-08.svg');
    expect(markup).toContain(
      'translate(0 0) translate(256 356) scale(0.619 0.432) translate(-256 -356)'
    );
    expect(markup).toContain('data-avatar-layer="mouth"');
    expect(markup).not.toContain('d="M218 337q38 38 76 0');
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

  it('renders the newest calibrated vector hairstyle', () => {
    const markup = renderToStaticMarkup(
      <AvatarCanvas recipe={{ ...DEFAULT_AVATAR_RECIPE, hair: 'c08' }} />
    );

    expect(markup).toContain('assets/avatar-parts/hair/approved/hair-c08.svg');
    expect(markup).not.toContain('/hair/candidates/');
  });

  it('can render a complete frameless avatar without deferred decorations', () => {
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

  it('does not render the deferred cheek decoration layer', () => {
    const retired = {
      ...DEFAULT_AVATAR_RECIPE,
      cheeks: 'stars'
    } as unknown as typeof DEFAULT_AVATAR_RECIPE;
    const markup = renderToStaticMarkup(<AvatarCanvas recipe={retired} />);

    expect(markup).not.toContain('data-avatar-layer="cheeks"');
    expect(markup).not.toContain('fill="#f59e0b"');
  });

});
