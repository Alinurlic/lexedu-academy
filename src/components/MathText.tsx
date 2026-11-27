import type { ReactNode } from 'react';

/**
 * Показывает математическую запись из обычного текста:
 *   2^5, x^(n+1), x^{2n}, e^x  → верхний индекс
 *   x_1, a_{n+1}, y_max, log_2 → нижний индекс
 * Индекс ставится только сразу после символа (не после пробела), поэтому «____» (пропуск в тексте)
 * и одиночные «^» не меняются. Для кода (информатика) нижние индексы отключаются: `noSub`.
 */
const RE = /\^(\{[^{}]*\}|\([^()]*\)|[-−]?\d+(?:[.,]\d+)?|[A-Za-zα-ωπ])|_(\{[^{}]*\}|\([^()]*\)|\d+|[A-Za-zА-Яа-яЁё]{1,6}(?![A-Za-zА-Яа-яЁё]))/g;

export function mathNodes(text: string, opts: { noSub?: boolean; keyPrefix?: string } = {}): ReactNode[] {
  if (!text || (!text.includes('^') && !text.includes('_'))) return [text];
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  RE.lastIndex = 0;
  for (let m = RE.exec(text); m; m = RE.exec(text)) {
    const sup = m[0][0] === '^';
    if (!sup && opts.noSub) continue;
    // нужен «основание»: символ перед ^/_ не пробел и не начало строки, а для _ — не ещё одно подчёркивание
    const prev = text[m.index - 1];
    if (m.index === 0 || /\s/.test(prev) || prev === '_') continue;
    let inner = sup ? m[1] : m[2];
    if (inner.length > 1 && (inner[0] === '{' || inner[0] === '(')) inner = inner.slice(1, -1);
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${opts.keyPrefix ?? 'm'}${k++}`;
    out.push(
      sup ? (
        <sup key={key} className="text-[0.72em] leading-none">
          {inner}
        </sup>
      ) : (
        <sub key={key} className="text-[0.72em] leading-none">
          {inner}
        </sub>
      ),
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function MathText({ text, noSub }: { text: string; noSub?: boolean }) {
  return <>{mathNodes(text, { noSub })}</>;
}
