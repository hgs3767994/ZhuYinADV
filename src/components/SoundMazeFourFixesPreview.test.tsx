import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SoundMazeFourFixesPreview } from './SoundMazeFourFixesPreview';

describe('sound maze four-fixes preview', () => {
  it('stays isolated behind its own preview shell and exposes deterministic test controls', () => {
    const html = renderToStaticMarkup(<SoundMazeFourFixesPreview />);

    expect(html).toContain('四項修正測試版');
    expect(html).toContain('data-scenario="idle"');
    expect(html).toContain('測試錯誤路線');
    expect(html).toContain('測試正確路線');
    expect(html).toContain('重置岔路');
    expect(html).not.toContain('sound-maze-branch-eraser');
  });
});
