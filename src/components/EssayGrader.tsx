import { useEffect, useState } from 'react';
import { Info, Sparkles } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { aiGradeWriting, aiStatus, type AiStatus, type WritingGrade } from '@/lib/ai';
import { wordCount } from '@/components/QuestionView';
import { toast } from '@/store/toast';
import type { EssayQuestion } from '@/types';
import { cn } from '@/lib/utils';
import { tr } from '@/i18n';

const CRITERIA_W = [
  { key: 'task', label: 'Task Achievement / Response', get hint() {
    return tr('Полностью ли раскрыто задание, есть ли обзор (Task 1) или чёткая позиция (Task 2)');
  } },
  { key: 'coherence', label: 'Coherence & Cohesion', get hint() {
    return tr('Логика, абзацы, связки');
  } },
  { key: 'lexical', label: 'Lexical Resource', get hint() {
    return tr('Разнообразие и точность лексики');
  } },
  { key: 'grammar', label: 'Grammatical Range & Accuracy', get hint() {
    return tr('Сложные конструкции и ошибки');
  } },
] as const;
const CRITERIA_S = [
  { key: 'task', label: 'Fluency & Coherence', get hint() {
    return tr('Плавность и связность речи');
  } },
  { key: 'coherence', label: 'Pronunciation', get hint() {
    return tr('Понятность произношения');
  } },
  { key: 'lexical', label: 'Lexical Resource', get hint() {
    return tr('Словарный запас');
  } },
  { key: 'grammar', label: 'Grammatical Range & Accuracy', get hint() {
    return tr('Грамматика');
  } },
] as const;

export type GradeResult = { band: number; feedback: string; criteria: Record<string, number>; source: 'ai' | 'self' };

/** Оценка эссе/ответа Speaking: ИИ (если подключён на сервере) или самооценка по 4 критериям IELTS. */
export function EssayGrader({ q, text, onGraded, existing }: { q: EssayQuestion; text: string; onGraded: (g: GradeResult) => void; existing?: { band?: number; feedback?: string; self?: boolean } }) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<WritingGrade | null>(null);
  const [self, setSelf] = useState<Record<string, number>>({ task: 6, coherence: 6, lexical: 6, grammar: 6 });
  const crit = q.task === 'speaking' ? CRITERIA_S : CRITERIA_W;
  const words = wordCount(text);

  useEffect(() => {
    void aiStatus().then(setStatus);
  }, []);

  const runAi = async () => {
    if (!text.trim()) return toast.error(tr('Нет текста для оценки'));
    setBusy(true);
    try {
      const g = await aiGradeWriting(q.task, q.question, text);
      setAi(g);
      onGraded({ band: g.band, feedback: tr('{0}\n\nСильные стороны: {1}\nЧто улучшить: {2}', g.summary, g.strengths.join('; '), g.improvements.join('; ')), criteria: g.criteria, source: 'ai' });
      toast.success(tr('Оценка ИИ: band {0}', g.band));
    } catch (e) {
      toast.error(tr('ИИ не смог оценить'), e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const selfBand = Math.round((Object.values(self).reduce((a, b) => a + b, 0) / 4) * 2) / 2;

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{tr('Оценка ответа')}</span>
        <Badge variant="outline">{tr('{0} слов{1}', words, words < q.minWords ? tr(' · меньше минимума ({0})', q.minWords) : '')}</Badge>
        {existing?.band !== undefined && <Badge variant="violet">{tr('Сохранено: band {0} {1}', existing.band, existing.self ? tr('(самооценка)') : tr('(ИИ)'))}</Badge>}
      </div>

      {status?.enabled ? (
        <div>
          <Button onClick={runAi} loading={busy} disabled={!text.trim()}>
            <Sparkles /> {tr('Оценить с помощью ИИ')}
          </Button>
          <p className="mt-1.5 text-xs text-muted-foreground">{tr('Оценка ИИ ориентировочная и не заменяет экзаменатора.')}</p>
          {ai && (
            <div className="mt-3 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {crit.map((c) => (
                  <div key={c.key} className="rounded-lg bg-secondary/60 p-2">
                    <div className="text-[11px] text-muted-foreground">{c.label}</div>
                    <div className="font-semibold tabular">{ai.criteria[c.key]}</div>
                  </div>
                ))}
              </div>
              <p>{ai.summary}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                  <div className="mb-1 text-xs font-semibold text-success">{tr('Сильные стороны')}</div>
                  <ul className="list-disc space-y-1 pl-4">{ai.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <div className="mb-1 text-xs font-semibold text-warning">{tr('Что улучшить')}</div>
                  <ul className="list-disc space-y-1 pl-4">{ai.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" /> {tr('ИИ-проверка недоступна: {0} Оцените ответ сами по критериям IELTS ниже.', status?.reason ?? tr('проверяю…'))}
        </p>
      )}

      <details className="rounded-lg border p-3" open={!status?.enabled}>
        <summary className="cursor-pointer text-sm font-medium">{tr('Самооценка по критериям IELTS')}</summary>
        <div className="mt-3 space-y-3">
          {crit.map((c) => (
            <div key={c.key}>
              <div className="flex justify-between text-sm">
                <span>{c.label}</span>
                <span className="font-semibold tabular">{self[c.key]}</span>
              </div>
              <input type="range" min={1} max={9} step={0.5} value={self[c.key]} onChange={(e) => setSelf({ ...self, [c.key]: Number(e.target.value) })} className="w-full accent-[hsl(var(--primary))]" aria-label={c.label} />
              <div className="text-[11px] text-muted-foreground">{c.hint}</div>
            </div>
          ))}
          <div className={cn('flex items-center justify-between rounded-lg bg-secondary/60 p-3 text-sm')}>
            <span>{tr('Итог (среднее, округление до 0,5)')}</span>
            <span className="text-lg font-semibold tabular">{selfBand}</span>
          </div>
          <Button variant="secondary" onClick={() => (onGraded({ band: selfBand, feedback: tr('Самооценка по критериям IELTS'), criteria: self, source: 'self' }), toast.success(tr('Сохранено: band {0}', selfBand)))}>
            {tr('Сохранить самооценку')}
          </Button>
        </div>
      </details>
    </div>
  );
}
