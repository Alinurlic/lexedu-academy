import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, EyeOff, Pencil, RefreshCw, XCircle } from 'lucide-react';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { QuestionMeta, QuestionView } from '@/components/QuestionView';
import { QuestionEditor } from './QuestionEditor';
import { REASON_LABEL, loadOpenReports, moderate, resolveReports, type QuestionReport, type ReportReason } from '@/lib/moderation';
import { useAppStore, useQuestionMap } from '@/store/useAppStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fmtDateTime } from '@/lib/date';
import { plural } from '@/lib/utils';
import { toast } from '@/store/toast';
import type { Question } from '@/types';

/** Очередь жалоб учеников на задания: исправить (для всех), скрыть для всех или отклонить. */
export function ReportsQueue({ onCount }: { onCount?: (n: number) => void }) {
  const qmap = useQuestionMap();
  const localReports = useAppStore((s) => s.localReports);
  const [reports, setReports] = useState<QuestionReport[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Question | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError('');
    try {
      setReports(await loadOpenReports());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить жалобы');
      setReports([]);
    }
  }, []);

  // в локальном режиме жалобы лежат в браузере — обновляем список при их изменении
  useEffect(() => {
    void reload();
  }, [reload, isSupabaseConfigured ? 0 : localReports]);

  const groups = useMemo(() => {
    const m = new Map<string, QuestionReport[]>();
    for (const r of reports ?? []) m.set(r.questionId, [...(m.get(r.questionId) ?? []), r]);
    return [...m.entries()]
      .map(([questionId, items]) => ({ questionId, items, last: items.map((i) => i.createdAt).sort().at(-1) ?? '' }))
      .sort((a, b) => b.items.length - a.items.length || b.last.localeCompare(a.last));
  }, [reports]);

  useEffect(() => onCount?.(groups.length), [groups.length, onCount]);

  const act = async (questionId: string, kind: 'hide' | 'reject') => {
    setBusy(questionId);
    try {
      if (kind === 'hide') await moderate(questionId, { hidden: true });
      await resolveReports(questionId, kind === 'hide' ? 'hidden' : 'rejected');
      toast.success(kind === 'hide' ? (isSupabaseConfigured ? 'Задание скрыто для всех учеников' : 'Задание скрыто') : 'Жалоба отклонена');
      await reload();
    } catch (e) {
      toast.error('Не получилось', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  };

  const saveFix = async (q: Question) => {
    setBusy(q.id);
    try {
      await moderate(q.id, { override: q });
      await resolveReports(q.id, 'fixed');
      toast.success(isSupabaseConfigured ? 'Исправление сохранено для всех учеников' : 'Исправление сохранено');
      setEditing(null);
      await reload();
    } catch (e) {
      toast.error('Не удалось сохранить', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <div className="font-semibold">Жалобы учеников на задания</div>
          <div className="text-xs text-muted-foreground">
            {isSupabaseConfigured ? 'Исправление и скрытие действуют для всех учеников сразу.' : 'Локальный режим: жалобы и правки хранятся только в этом браузере.'}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void reload()}>
          <RefreshCw /> Обновить
        </Button>
      </div>

      {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}
      {reports === null && <p className="text-sm text-muted-foreground">Загружаю…</p>}
      {reports !== null && groups.length === 0 && !error && (
        <EmptyState icon={CheckCircle2} lexi="celebrating" title="Жалоб нет" description="Когда ученик нажмёт «Сообщить об ошибке» в задании, оно появится здесь." className="py-8" />
      )}

      {groups.map((g) => {
        const q = qmap.get(g.questionId);
        const reasons = new Map<ReportReason, number>();
        for (const r of g.items) reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);
        return (
          <Card key={g.questionId} className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="danger">
                {g.items.length} {plural(g.items.length, ['жалоба', 'жалобы', 'жалоб'])}
              </Badge>
              {[...reasons.entries()].map(([r, n]) => (
                <Badge key={r} variant="outline">
                  {REASON_LABEL[r] ?? r}
                  {n > 1 ? ` ×${n}` : ''}
                </Badge>
              ))}
              <span className="ml-auto text-xs text-muted-foreground">последняя: {fmtDateTime(g.last)}</span>
            </div>

            {q ? (
              <div className="rounded-xl border p-3">
                <QuestionMeta q={q} className="mb-3" />
                <QuestionView q={q} value={null} onChange={() => undefined} reveal keyboard={false} />
                <div className="mt-2 text-[11px] text-muted-foreground">ID: {q.id}</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Задание {g.questionId} не найдено в банке (возможно, ещё грузится или удалено).</p>
            )}

            {g.items.some((i) => i.comment) && (
              <div className="space-y-1.5">
                {g.items
                  .filter((i) => i.comment)
                  .slice(0, 8)
                  .map((i) => (
                    <div key={i.id} className="rounded-lg bg-secondary/60 px-3 py-2 text-sm">
                      «{i.comment}» <span className="text-xs text-muted-foreground">— {fmtDateTime(i.createdAt)}</span>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={!q || busy === g.questionId} onClick={() => q && setEditing(q)}>
                <Pencil /> Исправить
              </Button>
              <Button size="sm" variant="secondary" disabled={busy === g.questionId} onClick={() => void act(g.questionId, 'hide')}>
                <EyeOff /> Скрыть {isSupabaseConfigured ? 'для всех' : ''}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy === g.questionId} onClick={() => void act(g.questionId, 'reject')}>
                <XCircle /> Отклонить
              </Button>
            </div>
          </Card>
        );
      })}

      <QuestionEditor open={editing !== null} question={editing} onClose={() => setEditing(null)} onSave={(q) => void saveFix(q)} />
    </div>
  );
}
