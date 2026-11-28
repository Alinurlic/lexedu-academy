import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { Answer, Question } from '@/types';
import { Badge, Input } from '@/components/ui';
import { DIFFICULTY_LABEL, SOURCE_LABEL, TYPE_LABEL, formatCorrect } from '@/data/questions';
import { TOPIC_MAP } from '@/data/subjects';
import { cn } from '@/lib/utils';
import { Lexi } from '@/components/lexi/Lexi';
import { lexiSay } from '@/lib/lexi';
import { LANG_LABEL, LANG_SHORT, questionLang } from '@/data/questions/lang';
import { useAppStore } from '@/store/useAppStore';
import { MathText } from './MathText';
import { ReportButton } from './ReportButton';
import { LexiExplain } from './LexiExplain';
import { tr } from '@/i18n';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function QuestionMeta({ q, className }: { q: Question; className?: string }) {
  const entLang = useAppStore((s) => s.profile.entLang ?? 'ru');
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <Badge variant="secondary">{TOPIC_MAP[q.topic]?.name ?? q.topic}</Badge>
      <Badge variant={q.difficulty === 'hard' ? 'danger' : q.difficulty === 'medium' ? 'warning' : 'success'}>{DIFFICULTY_LABEL[q.difficulty]}</Badge>
      <Badge variant="outline">{TYPE_LABEL[q.type]}</Badge>
      <Badge variant={q.source === 'verified' ? 'success' : q.source === 'user' ? 'violet' : 'outline'} title={q.sourceRef || q.sourceNote}>
        {SOURCE_LABEL[q.source]}
      </Badge>
      {(questionLang(q) === 'kk' || (questionLang(q) === 'ru' && entLang === 'kk')) && (
        <Badge variant="outline" title={tr('Задание {0}', LANG_LABEL[questionLang(q)])}>
          {LANG_SHORT[questionLang(q)]}
        </Badge>
      )}
      {q.verification === 'reviewed' && <Badge variant="success">{tr('Проверен')}</Badge>}
      {q.verification === 'needs_review' && <Badge variant="warning">{tr('Требует проверки')}</Badge>}
    </div>
  );
}

/**
 * Универсальный вывод вопроса для практики, экзамена и повторения.
 * reveal — показать правильный ответ и подсветку.
 */
export function QuestionView({ q, value, onChange, reveal, disabled, keyboard = true }: { q: Question; value: Answer | null; onChange: (v: Answer | null) => void; reveal?: boolean; disabled?: boolean; keyboard?: boolean }) {
  const locked = disabled || reveal;

  useEffect(() => {
    if (!keyboard || locked) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = Number(e.key);
      if (q.type === 'single' && n >= 1 && n <= q.options.length) onChange(n - 1);
      if (q.type === 'multiple' && n >= 1 && n <= q.options.length) {
        const cur = Array.isArray(value) ? value : [];
        onChange(cur.includes(n - 1) ? cur.filter((x) => x !== n - 1) : [...cur, n - 1]);
      }
      if (q.type === 'boolean' && (e.key === '1' || e.key === '2')) onChange(e.key === '1');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, value, onChange, keyboard, locked]);

  // в информатике «_» — часть имён переменных в коде, нижние индексы не рисуем
  const code = q.subject === 'informatics';
  return (
    <div>
      {q.audio && <AudioPlayer script={q.audio} groupKey={q.group ?? q.id} reveal={reveal} />}
      {q.passage && (
        <div className={cn('mb-5 overflow-y-auto rounded-xl border bg-surface-2/60 p-4 text-[14px] leading-relaxed scrollbar-thin', q.passage.length > 1500 ? 'max-h-[28rem]' : 'max-h-72')}>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{tr('Текст')}</div>
          {q.passage.split('\n').map((p, i) => (
            <p key={i} className="mb-2 last:mb-0">
              <MathText text={p} noSub={code} />
            </p>
          ))}
        </div>
      )}
      <p className="whitespace-pre-line text-[17px] font-medium leading-relaxed">
        <MathText text={q.type === 'essay' ? q.question.split('\n\n|')[0] : q.question} noSub={code} />
      </p>
      {q.type === 'essay' && q.question.includes('|') && <MarkdownTable text={q.question} />}
      {q.type === 'multiple' && <p className="mt-1 text-sm text-muted-foreground">{tr('Выберите все верные варианты')}</p>}

      <div className="mt-5">
        {(q.type === 'single' || q.type === 'multiple') && (
          <div className="grid gap-2">
            {q.options.map((opt, i) => {
              const selected = q.type === 'single' ? value === i : Array.isArray(value) && value.includes(i);
              const isCorrect = q.type === 'single' ? q.correctAnswer === i : q.correctAnswer.includes(i);
              const state = reveal ? (isCorrect ? 'correct' : selected ? 'wrong' : 'idle') : selected ? 'selected' : 'idle';
              return (
                <button
                  key={i}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    if (q.type === 'single') onChange(i);
                    else {
                      const cur = Array.isArray(value) ? value : [];
                      const next = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i];
                      onChange(next.length ? next : null);
                    }
                  }}
                  aria-pressed={selected}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3.5 text-left text-[15px] transition-all',
                    !locked && 'hover:border-primary/50 hover:bg-secondary/50',
                    state === 'selected' && 'border-primary bg-primary/10 ring-1 ring-primary',
                    state === 'correct' && 'border-success bg-success/10',
                    state === 'wrong' && 'border-danger bg-danger/10',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-7 shrink-0 place-items-center text-xs font-semibold',
                      q.type === 'multiple' ? 'rounded-md' : 'rounded-full',
                      state === 'selected' ? 'bg-primary text-white' : state === 'correct' ? 'bg-success text-white' : state === 'wrong' ? 'bg-danger text-white' : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {state === 'correct' ? <Check className="size-4" /> : state === 'wrong' ? <X className="size-4" /> : LETTERS[i]}
                  </span>
                  <span className="flex-1">
                    <MathText text={opt} noSub={code} />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {q.type === 'boolean' && (
          <div className="grid grid-cols-2 gap-3">
            {[true, false].map((v) => {
              const selected = value === v;
              const state = reveal ? (q.correctAnswer === v ? 'correct' : selected ? 'wrong' : 'idle') : selected ? 'selected' : 'idle';
              return (
                <button
                  key={String(v)}
                  type="button"
                  disabled={locked}
                  onClick={() => onChange(v)}
                  aria-pressed={selected}
                  className={cn(
                    'flex h-16 items-center justify-center gap-2 rounded-xl border text-[15px] font-medium transition-all',
                    !locked && 'hover:border-primary/50 hover:bg-secondary/50',
                    state === 'selected' && 'border-primary bg-primary/10 ring-1 ring-primary',
                    state === 'correct' && 'border-success bg-success/10 text-success',
                    state === 'wrong' && 'border-danger bg-danger/10 text-danger',
                  )}
                >
                  {v ? <Check className="size-4" /> : <X className="size-4" />}
                  {v ? tr('Верно') : tr('Неверно')}
                </button>
              );
            })}
          </div>
        )}

        {q.type === 'matching' && (
          <div className="space-y-3">
            <div className="grid gap-1.5 rounded-xl border bg-surface-2/50 p-3 text-sm sm:grid-cols-2">
              {q.options.map((o, i) => (
                <div key={i}>
                  <span className="mr-1.5 font-semibold">{LETTERS[i]}.</span>
                  <MathText text={o} noSub={code} />
                </div>
              ))}
            </div>
            {q.prompts.map((p, pi) => {
              const cur = Array.isArray(value) ? (value[pi] ?? -1) : -1;
              return (
                <div key={pi} className="rounded-xl border p-3">
                  <div className="mb-2 text-sm">
                    <span className="mr-1.5 font-semibold">{pi + 1}.</span>
                    <MathText text={p} noSub={code} />
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={tr('Соответствие для пункта {0}', pi + 1)}>
                    {q.options.map((_, oi) => {
                      const selected = cur === oi;
                      const isRight = q.correctAnswer[pi] === oi;
                      const state = reveal ? (isRight ? 'correct' : selected ? 'wrong' : 'idle') : selected ? 'selected' : 'idle';
                      return (
                        <button
                          key={oi}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={locked}
                          onClick={() => {
                            const arr = Array.isArray(value) && value.length === q.prompts.length ? [...value] : q.prompts.map(() => -1);
                            arr[pi] = selected ? -1 : oi;
                            onChange(arr.some((x) => x !== -1) ? arr : null);
                          }}
                          className={cn(
                            'h-9 min-w-9 rounded-lg border px-2 text-sm font-semibold transition-colors',
                            !locked && 'hover:border-primary/50',
                            state === 'selected' && 'border-primary bg-primary text-white',
                            state === 'correct' && 'border-success bg-success text-white',
                            state === 'wrong' && 'border-danger bg-danger text-white',
                          )}
                        >
                          {LETTERS[oi]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {q.type === 'text' && (
          <div className="max-w-md">
            <Input
              autoComplete="off"
              spellCheck={false}
              placeholder="Type your answer"
              value={typeof value === 'string' ? value : ''}
              disabled={locked}
              onChange={(e) => onChange(e.target.value.slice(0, 60) || null)}
              className="h-11 text-base"
              aria-label={tr('Краткий ответ')}
            />
            {q.wordLimit && <p className="mt-1.5 text-xs text-muted-foreground">{tr('Не более {0} {1} / числа', q.wordLimit, q.wordLimit === 1 ? tr('слова') : tr('слов'))}</p>}
          </div>
        )}

        {q.type === 'essay' && <EssayInput value={typeof value === 'string' ? value : ''} onChange={(v) => onChange(v || null)} disabled={locked} minWords={q.minWords} />}

        {q.type === 'numeric' && (
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <Input
                inputMode="decimal"
                autoComplete="off"
                placeholder={tr('Введите число')}
                value={typeof value === 'string' ? value : ''}
                disabled={locked}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d.,\-−\s]/g, '').slice(0, 20);
                  onChange(v === '' ? null : v);
                }}
                className={cn('h-12 text-lg tabular', reveal && 'opacity-100')}
                aria-label={tr('Числовой ответ')}
              />
              {q.unit && <span className="whitespace-nowrap text-sm text-muted-foreground">{q.unit}</span>}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{tr('Дробную часть отделяйте запятой или точкой')}</p>
          </div>
        )}
      </div>

      {reveal && (
        <div className="mt-4 rounded-xl border bg-surface-2/60 p-3 text-sm">
          <span className="text-muted-foreground">{tr('Правильный ответ:')} </span>
          <span className="font-semibold"><MathText text={formatCorrect(q)} noSub={q.subject === 'informatics'} /></span>
        </div>
      )}
    </div>
  );
}

export function Explanation({ q, correct, lexi }: { q: Question; correct: boolean; lexi?: boolean }) {
  const line = useMemo(() => (lexi ? lexiSay(correct ? 'correct' : 'incorrect') : null), [lexi, correct, q.id]);
  return (
    <div className={cn('mt-4 flex gap-3 rounded-xl border p-4 animate-fade-up', correct ? 'border-success/40 bg-success/5' : 'border-danger/40 bg-danger/5')}>
      {line && <Lexi mood={line.mood} size="xs" className="hidden sm:block" decorative />}
      <div className="min-w-0 flex-1">
        <div className={cn('flex items-center gap-2 text-sm font-semibold', correct ? 'text-success' : 'text-danger')}>
          {correct ? <Check className="size-4" /> : <X className="size-4" />}
          {line ? line.text : correct ? tr('Верно!') : tr('Неверно')}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
          <MathText text={q.explanation} noSub={q.subject === 'informatics'} />
        </p>
        <LexiExplain q={q} />
        <div>
          <ReportButton q={q} className="mt-2" />
        </div>
        {q.sourceNote && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {q.sourceNote}
            {q.source === 'open' && q.sourceRef && /^https?:\/\//.test(q.sourceRef) && (
              <>
                {' '}
                <a href={q.sourceRef} target="_blank" rel="noopener noreferrer nofollow" className="underline hover:text-foreground">
                  {tr('Ссылка на первоисточник')}
                </a>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

export function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function EssayInput({ value, onChange, disabled, minWords }: { value: string; onChange: (v: string) => void; disabled?: boolean; minWords: number }) {
  const n = wordCount(value);
  return (
    <div>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.slice(0, 12000))}
        spellCheck={false}
        placeholder="Write your answer here…"
        className="min-h-[280px] w-full rounded-xl border border-input bg-surface p-4 text-[15px] leading-relaxed focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-label={tr('Развёрнутый ответ')}
      />
      <div className={cn('mt-1.5 text-xs tabular', n >= minWords ? 'text-success' : 'text-muted-foreground')}>
        {tr('Слов: {0} / минимум {1}', n, minWords)}
      </div>
    </div>
  );
}

/** Простая таблица из markdown-строк вида | a | b | (для IELTS Writing Task 1). */
function MarkdownTable({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim().startsWith('|') && !/^\|\s*-/.test(l.trim()));
  if (lines.length < 2) return null;
  const rows = lines.map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const after = text.split('\n').filter((l) => !l.trim().startsWith('|')).slice(1).join(' ').trim();
  return (
    <div className="mt-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-sm">
          <thead>
            <tr>{rows[0].map((c, i) => <th key={i} className="border-b px-3 py-2 text-left font-semibold">{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.slice(1).map((r, ri) => (
              <tr key={ri}>{r.map((c, i) => <td key={i} className="border-b px-3 py-2 tabular">{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {after && <p className="mt-3 text-sm text-muted-foreground">{after}</p>}
    </div>
  );
}

const played = new Set<string>();

/**
 * Озвучка IELTS Listening синтезатором речи браузера (английский голос).
 * Как на реальном экзамене, запись в режиме теста можно прослушать один раз; после проверки — сколько угодно.
 */
function AudioPlayer({ script, groupKey, reveal }: { script: string; groupKey: string; reveal?: boolean }) {
  const [state, setState] = useState<'idle' | 'playing' | 'done'>(played.has(groupKey) ? 'done' : 'idle');
  const [showText, setShowText] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const play = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
    const gb = voices.filter((v) => v.lang === 'en-GB');
    const pool = gb.length >= 2 ? gb : voices;
    const speakers = new Map<string, SpeechSynthesisVoice | undefined>();
    const lines = script.split('\n').filter(Boolean);
    setState('playing');
    played.add(groupKey);
    lines.forEach((line, i) => {
      const m = line.match(/^([A-Z][A-Za-z ]{1,20}):\s*(.*)$/);
      const speaker = m ? m[1] : 'Narrator';
      const text = m ? m[2] : line;
      if (!speakers.has(speaker)) speakers.set(speaker, pool[speakers.size % Math.max(1, pool.length)]);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-GB';
      u.rate = 0.95;
      const v = speakers.get(speaker);
      if (v) u.voice = v;
      u.pitch = [...speakers.keys()].indexOf(speaker) % 2 ? 0.85 : 1.1;
      if (i === lines.length - 1) u.onend = () => setState('done');
      window.speechSynthesis.speak(u);
    });
  };

  return (
    <div className="mb-5 rounded-xl border border-violet/30 bg-violet/5 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">{tr('Запись Listening')}</span>
        {supported ? (
          <>
            <button type="button" onClick={play} disabled={state === 'playing' || (state === 'done' && !reveal)} className="rounded-lg bg-violet px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
              {state === 'playing' ? tr('Воспроизводится…') : state === 'done' ? (reveal ? tr('Прослушать снова') : tr('Прослушано')) : tr('Прослушать (1 раз)')}
            </button>
            {state === 'playing' && (
              <button type="button" onClick={() => (window.speechSynthesis.cancel(), setState('done'))} className="text-sm text-muted-foreground underline">
                {tr('Остановить')}
              </button>
            )}
          </>
        ) : (
          <span className="text-sm text-warning">{tr('Браузер не поддерживает озвучку — используйте текст записи.')}</span>
        )}
        {(reveal || !supported) && (
          <button type="button" onClick={() => setShowText((v) => !v)} className="text-sm text-primary underline">
            {showText ? tr('Скрыть текст записи') : tr('Показать текст записи')}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{tr('Озвучивается синтезатором речи браузера (английский голос). На экзамене запись звучит один раз.')}</p>
      {showText && <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-card p-3 font-sans text-sm">{script}</pre>}
    </div>
  );
}
