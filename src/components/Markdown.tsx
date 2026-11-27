import { Fragment, type ReactNode } from 'react';
import { mathNodes } from './MathText';

/**
 * Лёгкий и безопасный рендер Markdown для ответов Lexi.
 * Поддержка: заголовки, списки (маркированные и нумерованные), жирный/курсив/код, абзацы.
 * Без HTML и ссылок-скриптов — текст выводится как React-узлы, поэтому XSS невозможен.
 */

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // **жирный**, __жирный__, *курсив*, _курсив_, `код`.
  // Подчёркивания внутри слова не выделяют текст (как в CommonMark): x_1, y_max — это индексы, а не курсив.
  const re = /\*\*(.+?)\*\*|(?<![\p{L}\p{N}])__(.+?)__(?![\p{L}\p{N}])|\*(?!\s)(.+?)(?<!\s)\*|(?<![\p{L}\p{N}])_(?!\s)(.+?)(?<!\s)_(?![\p{L}\p{N}])|`([^`]+?)`/gu;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(...mathNodes(text.slice(last, m.index), { keyPrefix: `${keyPrefix}-t${i}-` }));
    const key = `${keyPrefix}-${i++}`;
    const bold = m[1] ?? m[2];
    const em = m[3] ?? m[4];
    if (bold !== undefined) nodes.push(<strong key={key}>{mathNodes(bold, { keyPrefix: `${key}-b` })}</strong>);
    else if (em !== undefined) nodes.push(<em key={key}>{mathNodes(em, { keyPrefix: `${key}-i` })}</em>);
    else if (m[5] !== undefined) nodes.push(<code key={key} className="rounded bg-secondary px-1 py-0.5 text-[0.85em]">{m[5]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(...mathNodes(text.slice(last), { keyPrefix: `${keyPrefix}-e-` }));
  return nodes;
}

type Block =
  | { type: 'h'; level: number; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'p'; text: string };

function parse(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      blocks.push({ type: 'p', text: para.join(' ') });
      para = [];
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t) {
      flush();
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(t);
    if (h) {
      flush();
      blocks.push({ type: 'h', level: h[1].length, text: h[2] });
      continue;
    }
    if (/^([-*•])\s+/.test(t)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*•])\s+/, ''));
        i++;
      }
      i--;
      blocks.push({ type: 'ul', items });
      continue;
    }
    if (/^\d+[.)]\s+/.test(t)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
        i++;
      }
      i--;
      blocks.push({ type: 'ol', items });
      continue;
    }
    para.push(t);
  }
  flush();
  return blocks;
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = parse(text);
  const Hx = ['h3', 'h4', 'h5', 'h6'] as const;
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        if (b.type === 'h') {
          const Tag = Hx[Math.min(b.level, 4) - 1];
          return (
            <Tag key={i} className="mb-1 mt-3 font-semibold first:mt-0">
              {inline(b.text, `h${i}`)}
            </Tag>
          );
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="my-1.5 list-disc space-y-1 pl-5">
              {b.items.map((it, j) => (
                <li key={j}>{inline(it, `u${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (b.type === 'ol') {
          return (
            <ol key={i} className="my-1.5 list-decimal space-y-1 pl-5">
              {b.items.map((it, j) => (
                <li key={j}>{inline(it, `o${i}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i} className="my-1.5 whitespace-pre-wrap leading-relaxed first:mt-0 last:mb-0">
            {b.text.split('\n').map((ln, j, arr) => (
              <Fragment key={j}>
                {inline(ln, `p${i}-${j}`)}
                {j < arr.length - 1 && <br />}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
