import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown } from '@/components/Markdown';

const html = (t: string) => renderToStaticMarkup(<Markdown text={t} />);

describe('Markdown для ответов Lexi', () => {
  it('жирный, курсив и код вместо звёздочек', () => {
    const h = html('**Жирный** и *курсив* и `x²`');
    expect(h).toContain('<strong>Жирный</strong>');
    expect(h).toContain('<em>курсив</em>');
    expect(h).toContain('x²</code>');
    expect(h).not.toContain('**');
  });
  it('списки не зависают и рендерятся', () => {
    const h = html('Шаги:\n1. раз\n2. два\n3. три\n\n- а\n- б\n* в');
    expect((h.match(/<li>/g) ?? []).length).toBe(6);
    expect(h).toContain('<ol');
    expect(h).toContain('<ul');
  });
  it('заголовки и экранирование HTML', () => {
    const h = html('## План\n<script>alert(1)</script>');
    expect(h).toContain('План</h4>');
    expect(h).not.toContain('<script>');
  });
});
