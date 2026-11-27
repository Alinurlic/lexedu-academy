import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathText } from '@/components/MathText';
import { Markdown } from '@/components/Markdown';

const html = (t: string, noSub = false) => renderToStaticMarkup(<MathText text={t} noSub={noSub} />);
const sups = (h: string) => [...h.matchAll(/<sup[^>]*>([^<]*)<\/sup>/g)].map((m) => m[1]);
const subs = (h: string) => [...h.matchAll(/<sub[^>]*>([^<]*)<\/sub>/g)].map((m) => m[1]);

describe('MathText: степени и индексы вместо ^ и _', () => {
  it('степени', () => {
    expect(sups(html('Вычислите 2^5 · 2^2 : 2^3.'))).toEqual(['5', '2', '3']);
    expect(sups(html('Решите уравнение 2^(x+1) = 32.'))).toEqual(['x+1']);
    expect(sups(html('x^{2n} + e^x + 10^-3'))).toEqual(['2n', 'x', '-3']);
    expect(html('2^5')).not.toContain('^');
  });
  it('нижние индексы', () => {
    expect(subs(html('y_max=21'))).toEqual(['max']);
    expect(subs(html('x_1 + x_2 = 5, a_{n+1}, log_2 8'))).toEqual(['1', '2', 'n+1', '2']);
  });
  it('не трогает пропуски, одиночные символы и код', () => {
    expect(html('Surname: _____ (one word)')).toBe('Surname: _____ (one word)');
    expect(html('Ответ: ^ и _ отдельно')).toBe('Ответ: ^ и _ отдельно');
    expect(subs(html('my_list = [1, 2]', true))).toEqual([]);
    expect(html('my_list = [1, 2]', true)).toContain('my_list');
  });
  it('работает в ответах Lexi (Markdown), но не внутри кода', () => {
    const h = renderToStaticMarkup(<Markdown text={'**Корни:** x_1 = 2, x^2 и `a_b^2`'} />);
    expect(subs(h)).toEqual(['1']);
    expect(sups(h)).toEqual(['2']);
    expect(h).toContain('a_b^2</code>');
  });
});
