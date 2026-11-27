import { useState } from 'react';
import { Check, Flag } from 'lucide-react';
import { Button, Dialog, Label } from '@/components/ui';
import { REASON_LABEL, submitReport, type ReportReason } from '@/lib/moderation';
import { toast } from '@/store/toast';
import { cn } from '@/lib/utils';
import type { Question } from '@/types';

/** «Сообщить об ошибке» в задании: причина + комментарий → очередь проверки в админ-панели. */
export function ReportButton({ q, className }: { q: Question; className?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('wrong_answer');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    setBusy(true);
    const r = await submitReport(q.id, reason, comment);
    setBusy(false);
    if (r.ok) {
      setSent(true);
      setOpen(false);
      setComment('');
      toast.success('Спасибо! Задание отправлено на проверку', 'Мы исправим его или уберём из банка');
    } else toast.error(r.message);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => !sent && setOpen(true)}
        disabled={sent}
        className={cn('inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-danger disabled:hover:text-muted-foreground', className)}
      >
        {sent ? <Check className="size-3" /> : <Flag className="size-3" />}
        {sent ? 'Отправлено на проверку' : 'Сообщить об ошибке'}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Ошибка в задании"
        description="Опишите, что не так. Задание проверит администратор: исправит его или уберёт из банка."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void send()} loading={busy}>
              <Flag /> Отправить
            </Button>
          </>
        }
      >
        <div className="space-y-3 pb-2">
          <div role="radiogroup" aria-label="Что не так" className="space-y-1.5">
            {(Object.keys(REASON_LABEL) as ReportReason[]).map((r) => (
              <label key={r} className={cn('flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors', reason === r ? 'border-primary bg-primary/10' : 'hover:border-primary/40')}>
                <input type="radio" name={`report-${q.id}`} checked={reason === r} onChange={() => setReason(r)} className="accent-[hsl(var(--primary))]" />
                {REASON_LABEL[r]}
              </label>
            ))}
          </div>
          <div>
            <Label htmlFor={`report-comment-${q.id}`}>Комментарий (необязательно)</Label>
            <textarea
              id={`report-comment-${q.id}`}
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 1000))}
              rows={3}
              placeholder="Например: верный ответ — B, потому что…"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-0.5 text-right text-[11px] text-muted-foreground">{comment.length}/1000</div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
