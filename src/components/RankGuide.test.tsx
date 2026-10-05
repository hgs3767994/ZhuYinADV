import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RankGuide } from './RankGuide';

describe('RankGuide', () => {
  it('renders the explanation and all ten animal ranks', () => {
    const html = renderToStaticMarkup(<RankGuide onBack={() => undefined} />);

    expect(html).toContain('當冒險者透過一般模式、無限模式完成練習時，會獲得經驗值，隨著經驗值累積可以提升冒險者等級');
    expect(html).toContain('第1級');
    expect(html).toContain('小雞');
    expect(html).toContain('assets/images/ranks/chicken.png');
    expect(html).toContain('第10級');
    expect(html).not.toMatch(/第\s+\d+級/);
    expect(html).toContain('大象');
    expect(html).toContain('assets/images/ranks/elephant.png');
    expect((html.match(/data-rank-id=/g) ?? []).length).toBe(10);
    expect(html).toContain('返回上一頁');
  });
});
