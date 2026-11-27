import { useState } from 'react';
import { AlertTriangle, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import { Markdown } from './Markdown';
import { getExplanation } from '@/lib/explanations';
import { AiError, useAiStatus, type ExplainReply } from '@/lib/ai';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Question } from '@/types';

/** Кнопка «Подробный разбор от Lexi» и сам разбор (готовый из общего кэша или новый от ИИ). */
export function LexiExplain({ q }: { q: Question }) {
  const ai = useAiStatus();
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; data?: ExplainReply; error?: string; temporary?: boolean }>({ status: 'idle' });

  if (q.type === 'essay') return null;
  // без ИИ и без общей базы разборов взять их неоткуда
  if (!isSupabaseConfigured && !ai?.enabled) return null;

  const load = async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'done', data: await getExplanation(q) });
    } catch (e) {
      const temporary = !(e instanceof AiError) || [429, 502, 503, 504].includes(e.status ?? 0);
      setState({ status: 'error', error: e instanceof Error ? e.message : 'Не удалось получить разбор', temporary });
    }
  };

  if (state.status === 'idle')
    return (
      <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
        <Sparkles className="text-violet" /> Подробный разбор от Lexi
      </Button>
    );

  if (state.status === 'loading')
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
        <Loader2 className="size-4 animate-spin" /> Lexi готовит подробный разбор…
      </div>
    );

  if (state.status === 'error')
    return (
      <div className="mt-3 rounded-xl border border-warning/40 bg-warning/5 p-3 text-sm">
        <div className="text-foreground/90">{state.error}</div>
        {state.temporary && (
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => void load()}>
            <RotateCcw /> Повторить
          </Button>
        )}
      </div>
    );

  const d = state.data!;
  return (
    <div className="mt-3 rounded-xl border bg-card/70 p-3.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-violet">
        <Sparkles className="size-3.5" /> Подробный разбор от Lexi
      </div>
      {d.keyLooksWrong && (
        <div className="mb-2 flex gap-2 rounded-lg bg-warning/10 p-2.5 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Lexi сомневается в правильном ответе этого задания{d.comment ? `: ${d.comment.replace(/[.!\s]+$/, '')}.` : '.'} Задание отправлено на проверку администратору.
          </span>
        </div>
      )}
      <Markdown text={d.explanation} className="text-sm leading-relaxed" />
      <p className="mt-2 text-[11px] text-muted-foreground">Разбор подготовлен ИИ и может содержать неточности. Если нашли ошибку — нажмите «Сообщить об ошибке».</p>
    </div>
  );
}
